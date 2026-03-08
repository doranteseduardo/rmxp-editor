use serde::{Deserialize, Serialize};
use std::fmt;

/// Represents any value that can appear in a Ruby Marshal stream.
/// Ruby Marshal v4.8 supports these core types.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum RubyValue {
    Nil,
    True,
    False,
    Integer(i64),
    Float(f64),
    String(RubyString),
    Symbol(String),
    Array(Vec<RubyValue>),
    Hash(Vec<(RubyValue, RubyValue)>),
    Object(RubyObject),
    /// User-defined serialization (e.g., Table, Color, Tone)
    UserDefined {
        class_name: String,
        data: Vec<u8>,
    },
    /// User-marshaled objects (implements _dump/_load)
    UserMarshal {
        class_name: String,
        data: Box<RubyValue>,
    },
    /// Regular expression
    Regexp {
        pattern: Vec<u8>,
        flags: u8,
    },
    /// A struct type
    Struct {
        name: String,
        members: Vec<(String, RubyValue)>,
    },
    /// Extended module
    Extended {
        module_name: String,
        object: Box<RubyValue>,
    },
    /// Class reference
    Class(String),
    /// Module reference
    Module(String),
}

/// Ruby string with optional encoding info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RubyString {
    pub bytes: Vec<u8>,
    pub encoding: Option<String>,
}

impl RubyString {
    pub fn new(bytes: Vec<u8>) -> Self {
        Self {
            bytes,
            encoding: None,
        }
    }

    pub fn with_encoding(bytes: Vec<u8>, encoding: String) -> Self {
        Self {
            bytes,
            encoding: Some(encoding),
        }
    }

    /// Try to interpret as UTF-8 string
    pub fn to_string_lossy(&self) -> String {
        String::from_utf8_lossy(&self.bytes).into_owned()
    }
}

/// Represents a Ruby object instance (class + instance variables)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RubyObject {
    pub class_name: String,
    pub instance_vars: Vec<(String, RubyValue)>,
}

impl RubyObject {
    pub fn new(class_name: String) -> Self {
        Self {
            class_name,
            instance_vars: Vec::new(),
        }
    }

    /// Get an instance variable by name (without @ prefix)
    pub fn get(&self, name: &str) -> Option<&RubyValue> {
        let ivar_name = if name.starts_with('@') {
            name.to_string()
        } else {
            format!("@{}", name)
        };
        self.instance_vars
            .iter()
            .find(|(k, _)| k == &ivar_name)
            .map(|(_, v)| v)
    }

    /// Get an instance variable as i64
    pub fn get_int(&self, name: &str) -> Option<i64> {
        match self.get(name)? {
            RubyValue::Integer(v) => Some(*v),
            _ => None,
        }
    }

    /// Get an instance variable as bool
    pub fn get_bool(&self, name: &str) -> Option<bool> {
        match self.get(name)? {
            RubyValue::True => Some(true),
            RubyValue::False => Some(false),
            _ => None,
        }
    }

    /// Get an instance variable as string
    pub fn get_string(&self, name: &str) -> Option<String> {
        match self.get(name)? {
            RubyValue::String(s) => Some(s.to_string_lossy()),
            _ => None,
        }
    }
}

impl RubyValue {
    /// Convert to a plain serde_json::Value for frontend consumption.
    /// Produces simple JSON: strings → "hello", integers → 42, objects → {"name": ..., "volume": ...}
    pub fn to_json_value(&self) -> serde_json::Value {
        use serde_json::Value;
        match self {
            RubyValue::Nil => Value::Null,
            RubyValue::True => Value::Bool(true),
            RubyValue::False => Value::Bool(false),
            RubyValue::Integer(v) => Value::Number((*v).into()),
            RubyValue::Float(v) => {
                serde_json::Number::from_f64(*v)
                    .map(Value::Number)
                    .unwrap_or(Value::Null)
            }
            RubyValue::String(s) => Value::String(s.to_string_lossy()),
            RubyValue::Symbol(s) => Value::String(format!(":{}", s)),
            RubyValue::Array(arr) => {
                Value::Array(arr.iter().map(|v| v.to_json_value()).collect())
            }
            RubyValue::Hash(pairs) => {
                // Try to make a JSON object if keys are strings/symbols
                let mut map = serde_json::Map::new();
                for (k, v) in pairs {
                    let key = match k {
                        RubyValue::String(s) => s.to_string_lossy(),
                        RubyValue::Symbol(s) => s.clone(),
                        RubyValue::Integer(i) => i.to_string(),
                        other => format!("{}", other),
                    };
                    map.insert(key, v.to_json_value());
                }
                Value::Object(map)
            }
            RubyValue::Object(obj) => {
                let mut map = serde_json::Map::new();
                map.insert("__class".into(), Value::String(obj.class_name.clone()));
                for (k, v) in &obj.instance_vars {
                    // Strip @ prefix from ivar names
                    let key = k.strip_prefix('@').unwrap_or(k).to_string();
                    map.insert(key, v.to_json_value());
                }
                Value::Object(map)
            }
            RubyValue::UserDefined { class_name, data } => {
                // Color and Tone are 4 f64 values (32 bytes) — decode to JSON object
                if (class_name == "Color" || class_name == "Tone") && data.len() >= 32 {
                    let r = f64::from_le_bytes(data[0..8].try_into().unwrap_or([0; 8]));
                    let g = f64::from_le_bytes(data[8..16].try_into().unwrap_or([0; 8]));
                    let b = f64::from_le_bytes(data[16..24].try_into().unwrap_or([0; 8]));
                    let a = f64::from_le_bytes(data[24..32].try_into().unwrap_or([0; 8]));
                    let mut map = serde_json::Map::new();
                    map.insert("__class".into(), Value::String(class_name.clone()));
                    map.insert("red".into(), serde_json::Number::from_f64(r).map(Value::Number).unwrap_or(Value::Null));
                    map.insert("green".into(), serde_json::Number::from_f64(g).map(Value::Number).unwrap_or(Value::Null));
                    map.insert("blue".into(), serde_json::Number::from_f64(b).map(Value::Number).unwrap_or(Value::Null));
                    if class_name == "Color" {
                        map.insert("alpha".into(), serde_json::Number::from_f64(a).map(Value::Number).unwrap_or(Value::Null));
                    } else {
                        map.insert("gray".into(), serde_json::Number::from_f64(a).map(Value::Number).unwrap_or(Value::Null));
                    }
                    return Value::Object(map);
                }
                // Table — decode full binary data to JSON with i16 data array
                if class_name == "Table" {
                    let mut map = serde_json::Map::new();
                    map.insert("__class".into(), Value::String("Table".into()));
                    if data.len() >= 20 {
                        let dims = i32::from_le_bytes(data[0..4].try_into().unwrap_or([0; 4]));
                        let x = i32::from_le_bytes(data[4..8].try_into().unwrap_or([0; 4]));
                        let y = i32::from_le_bytes(data[8..12].try_into().unwrap_or([0; 4]));
                        let z = i32::from_le_bytes(data[12..16].try_into().unwrap_or([0; 4]));
                        let total = i32::from_le_bytes(data[16..20].try_into().unwrap_or([0; 4]));
                        map.insert("dims".into(), Value::Number(serde_json::Number::from(dims)));
                        map.insert("x_size".into(), Value::Number(serde_json::Number::from(x)));
                        map.insert("y_size".into(), Value::Number(serde_json::Number::from(y)));
                        map.insert("z_size".into(), Value::Number(serde_json::Number::from(z)));
                        // Decode i16 data array
                        let mut values = Vec::with_capacity(total as usize);
                        for i in 0..(total as usize) {
                            let offset = 20 + i * 2;
                            if offset + 1 < data.len() {
                                let val = i16::from_le_bytes([data[offset], data[offset + 1]]);
                                values.push(Value::Number(serde_json::Number::from(val)));
                            } else {
                                values.push(Value::Number(serde_json::Number::from(0)));
                            }
                        }
                        map.insert("data".into(), Value::Array(values));
                    }
                    return Value::Object(map);
                }
                Value::String(format!("#<{}>", class_name))
            }
            RubyValue::UserMarshal { class_name, data } => {
                let mut map = serde_json::Map::new();
                map.insert("__class".into(), Value::String(class_name.clone()));
                map.insert("data".into(), data.to_json_value());
                Value::Object(map)
            }
            RubyValue::Struct { name, members } => {
                let mut map = serde_json::Map::new();
                map.insert("__struct".into(), Value::String(name.clone()));
                for (k, v) in members {
                    map.insert(k.clone(), v.to_json_value());
                }
                Value::Object(map)
            }
            _ => Value::String(format!("{}", self)),
        }
    }

    /// Convert a serde_json::Value back to a RubyValue.
    /// This is the inverse of `to_json_value()`, used when saving edits back to .rxdata.
    /// Objects with `__class` are rebuilt as RubyObject, others become hashes.
    pub fn from_json_value(val: &serde_json::Value) -> RubyValue {
        use serde_json::Value;
        match val {
            Value::Null => RubyValue::Nil,
            Value::Bool(b) => if *b { RubyValue::True } else { RubyValue::False },
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    RubyValue::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    RubyValue::Float(f)
                } else {
                    RubyValue::Integer(0)
                }
            }
            Value::String(s) => {
                // Symbols were encoded as ":name"
                if s.starts_with(':') && s.len() > 1 {
                    RubyValue::Symbol(s[1..].to_string())
                } else {
                    RubyValue::String(RubyString::with_encoding(
                        s.as_bytes().to_vec(),
                        "UTF-8".to_string(),
                    ))
                }
            }
            Value::Array(arr) => {
                RubyValue::Array(arr.iter().map(RubyValue::from_json_value).collect())
            }
            Value::Object(map) => {
                // If it has __class, reconstruct appropriately
                if let Some(Value::String(class_name)) = map.get("__class") {
                    // Color/Tone → UserDefined binary (4 f64 = 32 bytes)
                    if class_name == "Color" || class_name == "Tone" {
                        let r = map.get("red").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let g = map.get("green").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let b = map.get("blue").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let a = if class_name == "Color" {
                            map.get("alpha").and_then(|v| v.as_f64()).unwrap_or(255.0)
                        } else {
                            map.get("gray").and_then(|v| v.as_f64()).unwrap_or(0.0)
                        };
                        let mut data = Vec::with_capacity(32);
                        data.extend_from_slice(&r.to_le_bytes());
                        data.extend_from_slice(&g.to_le_bytes());
                        data.extend_from_slice(&b.to_le_bytes());
                        data.extend_from_slice(&a.to_le_bytes());
                        return RubyValue::UserDefined {
                            class_name: class_name.clone(),
                            data,
                        };
                    }
                    // Table → reconstruct UserDefined binary from JSON data
                    if class_name == "Table" {
                        let dims = map.get("dims").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
                        let x_size = map.get("x_size").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                        let y_size = map.get("y_size").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
                        let z_size = map.get("z_size").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
                        let total = (x_size * y_size * z_size) as usize;
                        let mut binary = Vec::with_capacity(20 + total * 2);
                        binary.extend_from_slice(&dims.to_le_bytes());
                        binary.extend_from_slice(&x_size.to_le_bytes());
                        binary.extend_from_slice(&y_size.to_le_bytes());
                        binary.extend_from_slice(&z_size.to_le_bytes());
                        binary.extend_from_slice(&(total as i32).to_le_bytes());
                        if let Some(Value::Array(data_arr)) = map.get("data") {
                            for (i, v) in data_arr.iter().enumerate() {
                                if i >= total { break; }
                                let val = v.as_i64().unwrap_or(0) as i16;
                                binary.extend_from_slice(&val.to_le_bytes());
                            }
                            // Pad with zeros if data_arr is shorter than total
                            for _ in data_arr.len()..total {
                                binary.extend_from_slice(&0i16.to_le_bytes());
                            }
                        } else {
                            // No data array — fill with zeros
                            for _ in 0..total {
                                binary.extend_from_slice(&0i16.to_le_bytes());
                            }
                        }
                        return RubyValue::UserDefined {
                            class_name: "Table".to_string(),
                            data: binary,
                        };
                    }
                    // Other __class → reconstruct as RubyObject
                    let mut obj = RubyObject::new(class_name.clone());
                    for (k, v) in map {
                        if k == "__class" { continue; }
                        obj.instance_vars.push((
                            format!("@{}", k),
                            RubyValue::from_json_value(v),
                        ));
                    }
                    RubyValue::Object(obj)
                } else {
                    // Generic hash
                    let pairs: Vec<(RubyValue, RubyValue)> = map.iter().map(|(k, v)| {
                        (
                            RubyValue::String(RubyString::with_encoding(
                                k.as_bytes().to_vec(),
                                "UTF-8".to_string(),
                            )),
                            RubyValue::from_json_value(v),
                        )
                    }).collect();
                    RubyValue::Hash(pairs)
                }
            }
        }
    }

    pub fn as_int(&self) -> Option<i64> {
        match self {
            RubyValue::Integer(v) => Some(*v),
            _ => None,
        }
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            RubyValue::True => Some(true),
            RubyValue::False => Some(false),
            _ => None,
        }
    }

    pub fn as_string(&self) -> Option<String> {
        match self {
            RubyValue::String(s) => Some(s.to_string_lossy()),
            _ => None,
        }
    }

    pub fn as_object(&self) -> Option<&RubyObject> {
        match self {
            RubyValue::Object(o) => Some(o),
            _ => None,
        }
    }

    pub fn as_array(&self) -> Option<&Vec<RubyValue>> {
        match self {
            RubyValue::Array(a) => Some(a),
            _ => None,
        }
    }

    pub fn as_hash(&self) -> Option<&Vec<(RubyValue, RubyValue)>> {
        match self {
            RubyValue::Hash(h) => Some(h),
            _ => None,
        }
    }

    pub fn as_user_defined(&self) -> Option<(&str, &[u8])> {
        match self {
            RubyValue::UserDefined { class_name, data } => Some((class_name, data)),
            _ => None,
        }
    }
}

impl fmt::Display for RubyValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RubyValue::Nil => write!(f, "nil"),
            RubyValue::True => write!(f, "true"),
            RubyValue::False => write!(f, "false"),
            RubyValue::Integer(v) => write!(f, "{}", v),
            RubyValue::Float(v) => write!(f, "{}", v),
            RubyValue::String(s) => write!(f, "\"{}\"", s.to_string_lossy()),
            RubyValue::Symbol(s) => write!(f, ":{}", s),
            RubyValue::Array(a) => write!(f, "[Array; {} elements]", a.len()),
            RubyValue::Hash(h) => write!(f, "{{Hash; {} pairs}}", h.len()),
            RubyValue::Object(o) => write!(f, "#<{}>", o.class_name),
            RubyValue::UserDefined { class_name, data } => {
                write!(f, "#<{} ({} bytes)>", class_name, data.len())
            }
            RubyValue::UserMarshal { class_name, .. } => {
                write!(f, "#<{} (marshal)>", class_name)
            }
            RubyValue::Regexp { .. } => write!(f, "/regexp/"),
            RubyValue::Struct { name, .. } => write!(f, "Struct:{}", name),
            RubyValue::Extended { module_name, .. } => write!(f, "Extended:{}", module_name),
            RubyValue::Class(name) => write!(f, "Class:{}", name),
            RubyValue::Module(name) => write!(f, "Module:{}", name),
        }
    }
}
