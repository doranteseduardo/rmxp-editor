use super::table::Table;
use crate::marshal::types::*;
use serde::{Deserialize, Serialize};

/// RPG::Tileset — defines a tileset with autotiles, passages, and priorities.
///
/// The tileset image is 256px wide (8 tiles × 32px) and variable height.
/// Each tileset has 7 autotile slots and property tables for passage,
/// priority, terrain tags, etc.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpgTileset {
    pub id: i64,
    pub name: String,
    pub tileset_name: String,
    pub autotile_names: Vec<String>,
    pub panorama_name: String,
    pub panorama_hue: i64,
    pub fog_name: String,
    pub fog_hue: i64,
    pub fog_opacity: i64,
    pub fog_blend_type: i64,
    pub fog_zoom: i64,
    pub fog_sx: i64,
    pub fog_sy: i64,
    pub battleback_name: String,
    pub passages: Table,
    pub priorities: Table,
    pub terrain_tags: Table,
}

impl RpgTileset {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        if obj.class_name != "RPG::Tileset" {
            return None;
        }

        let autotile_names = obj
            .get("autotile_names")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .map(|v| {
                        v.as_string().unwrap_or_default()
                    })
                    .collect()
            })
            .unwrap_or_else(|| vec![String::new(); 7]);

        let passages = extract_table(obj.get("passages"))
            .unwrap_or_else(|| Table::new_1d(384));
        let priorities = extract_table(obj.get("priorities"))
            .unwrap_or_else(|| Table::new_1d(384));
        let terrain_tags = extract_table(obj.get("terrain_tags"))
            .unwrap_or_else(|| Table::new_1d(384));

        Some(Self {
            id: obj.get_int("id").unwrap_or(0),
            name: obj.get_string("name").unwrap_or_default(),
            tileset_name: obj.get_string("tileset_name").unwrap_or_default(),
            autotile_names,
            panorama_name: obj.get_string("panorama_name").unwrap_or_default(),
            panorama_hue: obj.get_int("panorama_hue").unwrap_or(0),
            fog_name: obj.get_string("fog_name").unwrap_or_default(),
            fog_hue: obj.get_int("fog_hue").unwrap_or(0),
            fog_opacity: obj.get_int("fog_opacity").unwrap_or(64),
            fog_blend_type: obj.get_int("fog_blend_type").unwrap_or(0),
            fog_zoom: obj.get_int("fog_zoom").unwrap_or(200),
            fog_sx: obj.get_int("fog_sx").unwrap_or(0),
            fog_sy: obj.get_int("fog_sy").unwrap_or(0),
            battleback_name: obj.get_string("battleback_name").unwrap_or_default(),
            passages,
            priorities,
            terrain_tags,
        })
    }

    /// Get the priority value for a tile ID.
    pub fn get_priority(&self, tile_id: i16) -> i16 {
        if tile_id < 0 {
            return 0;
        }
        self.priorities.get(tile_id as u32, 0, 0)
    }

    /// Get the passage flags for a tile ID.
    /// Bit flags: 0x01=down, 0x02=left, 0x04=right, 0x08=up
    pub fn get_passage(&self, tile_id: i16) -> i16 {
        if tile_id < 0 {
            return 0;
        }
        self.passages.get(tile_id as u32, 0, 0)
    }

    /// Get the terrain tag for a tile ID.
    pub fn get_terrain_tag(&self, tile_id: i16) -> i16 {
        if tile_id < 0 {
            return 0;
        }
        self.terrain_tags.get(tile_id as u32, 0, 0)
    }
}

/// Helper to extract a Table from a UserDefined RubyValue.
fn extract_table(value: Option<&RubyValue>) -> Option<Table> {
    match value? {
        RubyValue::UserDefined { class_name, data } if class_name == "Table" => {
            Table::from_bytes(data)
        }
        _ => None,
    }
}
