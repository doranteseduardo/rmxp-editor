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
