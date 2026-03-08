use super::types::*;
use std::io::{self, Read};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MarshalError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("Invalid marshal magic: expected 4.8, got {0}.{1}")]
    InvalidMagic(u8, u8),
    #[error("Unknown type indicator: 0x{0:02x} at position {1}")]
    UnknownType(u8, usize),
    #[error("Invalid symlink index: {0}")]
    InvalidSymlink(usize),
    #[error("Invalid object link index: {0}")]
    InvalidObjectLink(usize),
    #[error("Unexpected end of data")]
    UnexpectedEof,
    #[error("Invalid UTF-8 in symbol: {0}")]
    InvalidSymbol(String),
}

/// Deserializes Ruby Marshal v4.8 binary data into RubyValue.
///
/// The Marshal format uses a symbol/object cache for deduplication:
/// - Symbols encountered are cached and can be back-referenced via `;` + index
/// - Objects encountered are cached and can be back-referenced via `@` + index
pub struct MarshalReader<R: Read> {
    reader: R,
    symbols: Vec<String>,
    objects: Vec<RubyValue>,
    position: usize,
}

impl<R: Read> MarshalReader<R> {
    pub fn new(reader: R) -> Self {
        Self {
            reader,
            symbols: Vec::new(),
            objects: Vec::new(),
            position: 0,
        }
    }

    /// Read and deserialize a complete Marshal stream.
    pub fn read(&mut self) -> Result<RubyValue, MarshalError> {
        // Read 2-byte magic header: \x04\x08 (version 4.8)
        let major = self.read_byte()?;
        let minor = self.read_byte()?;
        if major != 4 || minor != 8 {
            return Err(MarshalError::InvalidMagic(major, minor));
        }
        self.read_value()
    }

    fn read_byte(&mut self) -> Result<u8, MarshalError> {
        let mut buf = [0u8; 1];
        self.reader.read_exact(&mut buf)?;
        self.position += 1;
        Ok(buf[0])
    }

    fn read_bytes(&mut self, n: usize) -> Result<Vec<u8>, MarshalError> {
        let mut buf = vec![0u8; n];
        self.reader.read_exact(&mut buf)?;
        self.position += n;
        Ok(buf)
    }

    /// Read a Ruby Marshal "long" (variable-length integer encoding).
    ///
    /// Encoding rules:
    /// - 0 → 0
    /// - 1..4 → next N bytes as little-endian positive integer
    /// - -4..-1 → next |N| bytes as little-endian negative integer
    /// - 5..127 → value - 5 (positive shortcut: stores 0..122)
    /// - -128..-5 → value + 5 (negative shortcut: stores -123..0)
    fn read_long(&mut self) -> Result<i64, MarshalError> {
        let c = self.read_byte()? as i8;

        if c == 0 {
            return Ok(0);
        }

        if c > 0 && c <= 4 {
            // c bytes follow, little-endian positive integer
            let n = c as usize;
            let mut result: i64 = 0;
            for i in 0..n {
                let byte = self.read_byte()? as i64;
                result |= byte << (i * 8);
            }
            return Ok(result);
        }

        if c >= -4 && c < 0 {
            // |c| bytes follow, little-endian negative integer
            let n = (-c) as usize;
            let mut result: i64 = -1; // Start with all 1s for sign extension
            for i in 0..n {
                let byte = self.read_byte()? as i64;
                // Clear the byte position first, then set it
                result &= !(0xFF << (i * 8));
                result |= byte << (i * 8);
            }
            return Ok(result);
        }

        // Shortcut encoding for small integers
        if c > 4 {
            Ok((c as i64) - 5)
        } else {
            // c < -4
            Ok((c as i64) + 5)
        }
    }

    /// Read a value based on its type indicator byte.
    fn read_value(&mut self) -> Result<RubyValue, MarshalError> {
        let type_byte = self.read_byte()?;

        match type_byte {
            b'0' => Ok(RubyValue::Nil),          // nil
            b'T' => Ok(RubyValue::True),          // true
            b'F' => Ok(RubyValue::False),         // false

            b'i' => {
                // Integer
                let val = self.read_long()?;
                Ok(RubyValue::Integer(val))
            }

            b'f' => {
                // Float (stored as string representation)
                let val = self.read_float()?;
                Ok(RubyValue::Float(val))
            }

            b'"' => {
                // Raw string (byte sequence)
                let val = self.read_raw_string()?;
                let ruby_string = RubyString::new(val);
                let idx = self.objects.len();
                self.objects.push(RubyValue::Nil); // placeholder
                let result = RubyValue::String(ruby_string);
                self.objects[idx] = result.clone();
                Ok(result)
            }

            b':' => {
                // Symbol (interned string)
                let sym = self.read_symbol_value()?;
                Ok(RubyValue::Symbol(sym))
            }

            b';' => {
                // Symbol reference (back-reference to previously seen symbol)
                let idx = self.read_long()? as usize;
                if idx >= self.symbols.len() {
                    return Err(MarshalError::InvalidSymlink(idx));
                }
                Ok(RubyValue::Symbol(self.symbols[idx].clone()))
            }

            b'@' => {
                // Object reference (back-reference to previously seen object)
                let idx = self.read_long()? as usize;
                if idx >= self.objects.len() {
                    return Err(MarshalError::InvalidObjectLink(idx));
                }
                Ok(self.objects[idx].clone())
            }

            b'[' => {
                // Array
                let idx = self.objects.len();
                self.objects.push(RubyValue::Nil); // placeholder
                let len = self.read_long()? as usize;
                let mut arr = Vec::with_capacity(len);
                for _ in 0..len {
                    arr.push(self.read_value()?);
                }
                let result = RubyValue::Array(arr);
                self.objects[idx] = result.clone();
                Ok(result)
            }

            b'{' => {
                // Hash
                let idx = self.objects.len();
                self.objects.push(RubyValue::Nil); // placeholder
                let len = self.read_long()? as usize;
                let mut pairs = Vec::with_capacity(len);
                for _ in 0..len {
                    let key = self.read_value()?;
                    let val = self.read_value()?;
                    pairs.push((key, val));
                }
                let result = RubyValue::Hash(pairs);
                self.objects[idx] = result.clone();
                Ok(result)
            }

            b'o' => {
                // Object (class instance with instance variables)
                let idx = self.objects.len();
                self.objects.push(RubyValue::Nil); // placeholder
                let class_name = self.read_symbol_or_link()?;
                let ivar_count = self.read_long()? as usize;
                let mut ivars = Vec::with_capacity(ivar_count);
                for _ in 0..ivar_count {
                    let name = self.read_symbol_or_link()?;
                    let val = self.read_value()?;
                    ivars.push((name, val));
                }
                let obj = RubyObject {
                    class_name,
                    instance_vars: ivars,
                };
                let result = RubyValue::Object(obj);
                self.objects[idx] = result.clone();
                Ok(result)
            }

            b'u' => {
                // UserDefined (_dump/_load serialization)
                // Used by Table, Color, Tone, Rect
                let class_name = self.read_symbol_or_link()?;
                let data = self.read_raw_string()?;
                let _idx = self.objects.len();
                let result = RubyValue::UserDefined { class_name, data };
                self.objects.push(result.clone());
                Ok(result)
            }

            b'U' => {
                // UserMarshal (marshal_dump/marshal_load)
                let class_name = self.read_symbol_or_link()?;
                let idx = self.objects.len();
                self.objects.push(RubyValue::Nil); // placeholder
                let data = self.read_value()?;
                let result = RubyValue::UserMarshal {
                    class_name,
                    data: Box::new(data),
                };
                self.objects[idx] = result.clone();
                Ok(result)
            }

            b'I' => {
                // Instance variables wrapper (wraps another value + adds ivars)
                // Common pattern: String with encoding info
                let inner = self.read_value()?;
                let ivar_count = self.read_long()? as usize;

                // Read instance variables (typically encoding info for strings)
                let mut encoding = None;
                for _ in 0..ivar_count {
                    let name = self.read_symbol_or_link()?;
                    let val = self.read_value()?;
                    // Check for encoding marker
                    if name == "E" {
                        // E=true means UTF-8, E=false means ASCII-8BIT
                        if let RubyValue::True = val {
                            encoding = Some("UTF-8".to_string());
                        }
                    } else if name == "encoding" {
                        if let RubyValue::String(ref s) = val {
                            encoding = Some(s.to_string_lossy());
                        }
                    }
                }

                // If inner is a string, attach encoding
                match inner {
                    RubyValue::String(mut s) => {
                        s.encoding = encoding;
                        // Update in object cache
                        let result = RubyValue::String(s);
                        // The inner string already registered in objects,
                        // update the last string entry
                        if let Some(last) = self.objects.iter_mut().rev().find(|v| {
                            matches!(v, RubyValue::String(_))
                        }) {
                            *last = result.clone();
                        }
                        Ok(result)
                    }
                    other => Ok(other),
                }
            }

            b'e' => {
                // Extended (module extension)
                let module_name = self.read_symbol_or_link()?;
                let object = self.read_value()?;
                Ok(RubyValue::Extended {
                    module_name,
                    object: Box::new(object),
                })
            }

            b'/' => {
                // Regexp
                let pattern = self.read_raw_string()?;
                let flags = self.read_byte()?;
                let _idx = self.objects.len();
                let result = RubyValue::Regexp { pattern, flags };
                self.objects.push(result.clone());
                Ok(result)
            }

            b'S' => {
                // Struct
                let name = self.read_symbol_or_link()?;
                let member_count = self.read_long()? as usize;
                let idx = self.objects.len();
                self.objects.push(RubyValue::Nil); // placeholder
                let mut members = Vec::with_capacity(member_count);
                for _ in 0..member_count {
                    let mem_name = self.read_symbol_or_link()?;
                    let mem_val = self.read_value()?;
                    members.push((mem_name, mem_val));
                }
                let result = RubyValue::Struct { name, members };
                self.objects[idx] = result.clone();
                Ok(result)
            }

            b'c' => {
                // Class
                let name_bytes = self.read_raw_string()?;
                let name = String::from_utf8_lossy(&name_bytes).into_owned();
                Ok(RubyValue::Class(name))
            }

            b'm' => {
                // Module
                let name_bytes = self.read_raw_string()?;
                let name = String::from_utf8_lossy(&name_bytes).into_owned();
                Ok(RubyValue::Module(name))
            }

            b'C' => {
                // Subclass wrapper: a built-in type (Array/Hash/String)
                // subclassed by a user class. Read class name then inner value.
                // We treat it as the inner value (discarding the subclass name).
                let _class_name = self.read_symbol_or_link()?;
                let inner = self.read_value()?;
                Ok(inner)
            }

            b'M' => {
                // Old-style module/class (Ruby < 1.8 compat)
                // Same format as 'm': length-prefixed name
                let name_bytes = self.read_raw_string()?;
                let name = String::from_utf8_lossy(&name_bytes).into_owned();
                Ok(RubyValue::Module(name))
            }

            b'l' => {
                // Bignum
                let sign = self.read_byte()?;
                let len = self.read_long()? as usize;
                let bytes = self.read_bytes(len * 2)?;
                // Convert to i64 (may lose precision for very large numbers)
                let mut val: i64 = 0;
                for (i, &byte) in bytes.iter().enumerate() {
                    if i < 8 {
                        val |= (byte as i64) << (i * 8);
                    }
                }
                if sign == b'-' {
                    val = -val;
                }
                Ok(RubyValue::Integer(val))
            }

            _ => Err(MarshalError::UnknownType(type_byte, self.position - 1)),
        }
    }

    /// Read a symbol value and cache it.
    fn read_symbol_value(&mut self) -> Result<String, MarshalError> {
        let bytes = self.read_raw_string()?;
        let sym = String::from_utf8(bytes)
            .map_err(|e| MarshalError::InvalidSymbol(e.to_string()))?;
        self.symbols.push(sym.clone());
        Ok(sym)
    }

    /// Read a symbol or a symbol back-reference.
    fn read_symbol_or_link(&mut self) -> Result<String, MarshalError> {
        let type_byte = self.read_byte()?;
        match type_byte {
            b':' => self.read_symbol_value(),
            b';' => {
                let idx = self.read_long()? as usize;
                if idx >= self.symbols.len() {
                    return Err(MarshalError::InvalidSymlink(idx));
                }
                Ok(self.symbols[idx].clone())
            }
            _ => Err(MarshalError::UnknownType(type_byte, self.position - 1)),
        }
    }

    /// Read a length-prefixed byte sequence.
    fn read_raw_string(&mut self) -> Result<Vec<u8>, MarshalError> {
        let len = self.read_long()? as usize;
        self.read_bytes(len)
    }

    /// Read a float stored as its string representation.
    fn read_float(&mut self) -> Result<f64, MarshalError> {
        let bytes = self.read_raw_string()?;
        let s = String::from_utf8_lossy(&bytes);
        match s.as_ref() {
            "inf" => Ok(f64::INFINITY),
            "-inf" => Ok(f64::NEG_INFINITY),
            "nan" => Ok(f64::NAN),
            _ => s.parse::<f64>().map_err(|_| {
                MarshalError::InvalidSymbol(format!("Invalid float: {}", s))
            }),
        }
    }
}

/// Convenience function to deserialize from a byte slice.
pub fn load(data: &[u8]) -> Result<RubyValue, MarshalError> {
    let mut reader = MarshalReader::new(std::io::Cursor::new(data));
    reader.read()
}

/// Convenience function to deserialize from a file path.
pub fn load_file(path: &std::path::Path) -> Result<RubyValue, MarshalError> {
    let data = std::fs::read(path)?;
    load(&data)
}
