pub mod reader;
pub mod types;
pub mod writer;

pub use reader::{load, load_file, MarshalError, MarshalReader};
pub use types::*;
pub use writer::{dump, dump_file, MarshalWriteError, MarshalWriter};

#[cfg(test)]
mod roundtrip_tests {
    use super::*;

    /// Assert that decoding then re-encoding a value reproduces it exactly,
    /// and that re-encoding is byte-stable.
    fn assert_roundtrip(value: RubyValue) {
        let bytes = dump(&value).expect("dump");
        let decoded = load(&bytes).expect("load");
        assert_eq!(decoded, value, "value differs after dump→load");
        let bytes2 = dump(&decoded).expect("re-dump");
        assert_eq!(bytes, bytes2, "re-dump not byte-stable");
    }

    fn utf8(s: &str) -> RubyValue {
        RubyValue::String(RubyString::with_encoding(s.as_bytes().to_vec(), "UTF-8".to_string()))
    }

    #[test]
    fn primitives() {
        assert_roundtrip(RubyValue::Nil);
        assert_roundtrip(RubyValue::True);
        assert_roundtrip(RubyValue::False);
        for n in [0i64, 1, -1, 122, 123, -123, -124, 255, 256, 65535, 65536, 16_777_215, 16_777_216, -1_000_000, 1_000_000_000] {
            assert_roundtrip(RubyValue::Integer(n));
        }
        assert_roundtrip(RubyValue::Float(3.5));
        assert_roundtrip(RubyValue::Float(-0.25));
    }

    #[test]
    fn strings_and_symbols() {
        assert_roundtrip(utf8("hello"));
        assert_roundtrip(utf8(""));
        assert_roundtrip(utf8("üñîçødé"));
        assert_roundtrip(RubyValue::Symbol("foo".to_string()));
        // Symbol dedup: same symbol twice inside an array.
        assert_roundtrip(RubyValue::Array(vec![
            RubyValue::Symbol("dup".to_string()),
            RubyValue::Symbol("dup".to_string()),
        ]));
    }

    #[test]
    fn containers_and_objects() {
        assert_roundtrip(RubyValue::Array(vec![
            RubyValue::Integer(1),
            utf8("two"),
            RubyValue::True,
        ]));
        assert_roundtrip(RubyValue::Hash(vec![
            (RubyValue::Integer(1), utf8("one")),
            (RubyValue::Symbol("k".to_string()), RubyValue::Nil),
        ]));
        let obj = RubyObject {
            class_name: "RPG::Event".to_string(),
            instance_vars: vec![
                ("@id".to_string(), RubyValue::Integer(7)),
                ("@name".to_string(), utf8("EV007")),
            ],
        };
        assert_roundtrip(RubyValue::Object(obj));
    }

    #[test]
    fn user_defined_table_bytes() {
        // A 2x2x1 Table's raw bytes survive as opaque UserDefined data.
        let data: Vec<u8> = {
            let mut b = Vec::new();
            b.extend_from_slice(&2i32.to_le_bytes()); // dims
            b.extend_from_slice(&2i32.to_le_bytes()); // x
            b.extend_from_slice(&2i32.to_le_bytes()); // y
            b.extend_from_slice(&1i32.to_le_bytes()); // z
            b.extend_from_slice(&4i32.to_le_bytes()); // total
            for v in [10i16, 20, 30, 40] { b.extend_from_slice(&v.to_le_bytes()); }
            b
        };
        assert_roundtrip(RubyValue::UserDefined { class_name: "Table".to_string(), data });
    }

    #[test]
    fn nested_map_like_structure() {
        let event = RubyValue::Object(RubyObject {
            class_name: "RPG::Event".to_string(),
            instance_vars: vec![("@name".to_string(), utf8("Hero"))],
        });
        let map = RubyValue::Object(RubyObject {
            class_name: "RPG::Map".to_string(),
            instance_vars: vec![
                ("@width".to_string(), RubyValue::Integer(20)),
                ("@height".to_string(), RubyValue::Integer(15)),
                ("@events".to_string(), RubyValue::Hash(vec![(RubyValue::Integer(1), event)])),
            ],
        });
        assert_roundtrip(map);
    }
}
