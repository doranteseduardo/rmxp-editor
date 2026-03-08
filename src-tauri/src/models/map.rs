use super::event::RpgEvent;
use super::table::Table;
use crate::marshal::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// RPG::Map — represents a single map in the game.
///
/// Corresponds to MapXXX.rxdata files. Each map contains:
/// - Tile data: 3D Table (width × height × 3 layers)
/// - Events: HashMap of event_id → RpgEvent
/// - Properties: BGM, BGS, parallax, encounters, etc.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpgMap {
    pub tileset_id: i64,
    pub width: i64,
    pub height: i64,
    pub autoplay_bgm: bool,
    pub bgm: AudioFile,
    pub autoplay_bgs: bool,
    pub bgs: AudioFile,
    pub encounter_list: Vec<i64>,
    pub encounter_step: i64,
    pub data: Table,
    pub events: HashMap<i64, RpgEvent>,
    // Parallax
    pub parallax_name: String,
    pub parallax_loop_x: bool,
    pub parallax_loop_y: bool,
    pub parallax_sx: i64,
    pub parallax_sy: i64,
    pub parallax_show: bool,
    // Scroll
    pub scroll_type: i64,
    pub disable_dashing: bool,
}

/// Audio file reference used for BGM/BGS/SE/ME.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioFile {
    pub name: String,
    pub volume: i64,
    pub pitch: i64,
}

impl Default for AudioFile {
    fn default() -> Self {
        Self {
            name: String::new(),
            volume: 100,
            pitch: 100,
        }
    }
}

impl RpgMap {
    /// Extract an RpgMap from a deserialized RubyValue.
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        if obj.class_name != "RPG::Map" {
            return None;
        }

        let tileset_id = obj.get_int("tileset_id").unwrap_or(1);
        let width = obj.get_int("width").unwrap_or(20);
        let height = obj.get_int("height").unwrap_or(15);
        let autoplay_bgm = obj.get_bool("autoplay_bgm").unwrap_or(false);
        let autoplay_bgs = obj.get_bool("autoplay_bgs").unwrap_or(false);
        let encounter_step = obj.get_int("encounter_step").unwrap_or(30);
        let scroll_type = obj.get_int("scroll_type").unwrap_or(0);
        let disable_dashing = obj.get_bool("disable_dashing").unwrap_or(false);

        let parallax_name = obj.get_string("parallax_name").unwrap_or_default();
        let parallax_loop_x = obj.get_bool("parallax_loop_x").unwrap_or(false);
        let parallax_loop_y = obj.get_bool("parallax_loop_y").unwrap_or(false);
        let parallax_sx = obj.get_int("parallax_sx").unwrap_or(0);
        let parallax_sy = obj.get_int("parallax_sy").unwrap_or(0);
        let parallax_show = obj.get_bool("parallax_show").unwrap_or(false);

        // Parse BGM
        let bgm = obj
            .get("bgm")
            .and_then(AudioFile::from_ruby_value)
            .unwrap_or_default();

        // Parse BGS
        let bgs = obj
            .get("bgs")
            .and_then(AudioFile::from_ruby_value)
            .unwrap_or_default();

        // Parse tile data (Table)
        let data = obj
            .get("data")
            .and_then(|v| {
                if let RubyValue::UserDefined { class_name, data } = v {
                    if class_name == "Table" {
                        return Table::from_bytes(data);
                    }
                }
                None
            })
            .unwrap_or_else(|| Table::new_3d(width as u32, height as u32, 3));

        // Parse encounter list
        let encounter_list = obj
            .get("encounter_list")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_int())
                    .collect()
            })
            .unwrap_or_default();

        // Parse events hash
        let events = obj
            .get("events")
            .and_then(|v| v.as_hash())
            .map(|pairs| {
                pairs
                    .iter()
                    .filter_map(|(k, v)| {
                        let id = k.as_int()?;
                        let event = RpgEvent::from_ruby_value(v)?;
                        Some((id, event))
                    })
                    .collect()
            })
            .unwrap_or_default();

        Some(Self {
            tileset_id,
            width,
            height,
            autoplay_bgm,
            bgm,
            autoplay_bgs,
            bgs,
            encounter_list,
            encounter_step,
            data,
            events,
            parallax_name,
            parallax_loop_x,
            parallax_loop_y,
            parallax_sx,
            parallax_sy,
            parallax_show,
            scroll_type,
            disable_dashing,
        })
    }

    /// Get the tile ID at position (x, y, layer).
    pub fn get_tile(&self, x: u32, y: u32, layer: u32) -> i16 {
        self.data.get(x, y, layer)
    }

    /// Set the tile ID at position (x, y, layer).
    pub fn set_tile(&mut self, x: u32, y: u32, layer: u32, tile_id: i16) {
        self.data.set(x, y, layer, tile_id);
    }
}

impl AudioFile {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            name: obj.get_string("name").unwrap_or_default(),
            volume: obj.get_int("volume").unwrap_or(100),
            pitch: obj.get_int("pitch").unwrap_or(100),
        })
    }
}

/// RPG::MapInfo — metadata about a map (name, tree position).
/// Stored in MapInfos.rxdata as Hash<Integer, MapInfo>.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapInfo {
    pub name: String,
    pub parent_id: i64,
    pub order: i64,
    pub expanded: bool,
    pub scroll_x: i64,
    pub scroll_y: i64,
}

impl MapInfo {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            name: obj.get_string("name").unwrap_or_default(),
            parent_id: obj.get_int("parent_id").unwrap_or(0),
            order: obj.get_int("order").unwrap_or(0),
            expanded: obj.get_bool("expanded").unwrap_or(false),
            scroll_x: obj.get_int("scroll_x").unwrap_or(0),
            scroll_y: obj.get_int("scroll_y").unwrap_or(0),
        })
    }
}
