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

    /// Convert to a full RubyValue for serialization to .rxdata.
    pub fn to_ruby_value(&self) -> RubyValue {
        let mut obj = RubyObject::new("RPG::Map".to_string());

        obj.instance_vars.push(("@tileset_id".to_string(), RubyValue::Integer(self.tileset_id)));
        obj.instance_vars.push(("@width".to_string(), RubyValue::Integer(self.width)));
        obj.instance_vars.push(("@height".to_string(), RubyValue::Integer(self.height)));
        obj.instance_vars.push(("@autoplay_bgm".to_string(), if self.autoplay_bgm { RubyValue::True } else { RubyValue::False }));
        obj.instance_vars.push(("@bgm".to_string(), self.bgm.to_ruby_value()));
        obj.instance_vars.push(("@autoplay_bgs".to_string(), if self.autoplay_bgs { RubyValue::True } else { RubyValue::False }));
        obj.instance_vars.push(("@bgs".to_string(), self.bgs.to_ruby_value()));

        let enc_arr: Vec<RubyValue> = self.encounter_list.iter().map(|&v| RubyValue::Integer(v)).collect();
        obj.instance_vars.push(("@encounter_list".to_string(), RubyValue::Array(enc_arr)));
        obj.instance_vars.push(("@encounter_step".to_string(), RubyValue::Integer(self.encounter_step)));

        obj.instance_vars.push(("@data".to_string(), RubyValue::UserDefined {
            class_name: "Table".to_string(),
            data: self.data.to_bytes(),
        }));

        let event_pairs: Vec<(RubyValue, RubyValue)> = self.events.iter()
            .map(|(&id, ev)| (RubyValue::Integer(id), ev.to_ruby_value()))
            .collect();
        obj.instance_vars.push(("@events".to_string(), RubyValue::Hash(event_pairs)));

        obj.instance_vars.push(("@parallax_name".to_string(), RubyValue::String(RubyString::with_encoding(self.parallax_name.as_bytes().to_vec(), "UTF-8".to_string()))));
        obj.instance_vars.push(("@parallax_loop_x".to_string(), if self.parallax_loop_x { RubyValue::True } else { RubyValue::False }));
        obj.instance_vars.push(("@parallax_loop_y".to_string(), if self.parallax_loop_y { RubyValue::True } else { RubyValue::False }));
        obj.instance_vars.push(("@parallax_sx".to_string(), RubyValue::Integer(self.parallax_sx)));
        obj.instance_vars.push(("@parallax_sy".to_string(), RubyValue::Integer(self.parallax_sy)));
        obj.instance_vars.push(("@parallax_show".to_string(), if self.parallax_show { RubyValue::True } else { RubyValue::False }));

        obj.instance_vars.push(("@scroll_type".to_string(), RubyValue::Integer(self.scroll_type)));
        obj.instance_vars.push(("@disable_dashing".to_string(), if self.disable_dashing { RubyValue::True } else { RubyValue::False }));

        RubyValue::Object(obj)
    }

    /// Create a default blank map with given dimensions.
    pub fn new_blank(width: i64, height: i64, tileset_id: i64) -> Self {
        let mut data = Table::new_3d(width as u32, height as u32, 3);
        for y in 0..height as u32 {
            for x in 0..width as u32 {
                data.set(x, y, 0, 384);
            }
        }

        Self {
            tileset_id,
            width,
            height,
            autoplay_bgm: false,
            bgm: AudioFile::default(),
            autoplay_bgs: false,
            bgs: AudioFile::default(),
            encounter_list: Vec::new(),
            encounter_step: 30,
            data,
            events: HashMap::new(),
            parallax_name: String::new(),
            parallax_loop_x: false,
            parallax_loop_y: false,
            parallax_sx: 0,
            parallax_sy: 0,
            parallax_show: false,
            scroll_type: 0,
            disable_dashing: false,
        }
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

    pub fn to_ruby_value(&self) -> RubyValue {
        let mut obj = RubyObject::new("RPG::AudioFile".to_string());
        obj.instance_vars.push(("@name".to_string(), RubyValue::String(RubyString::with_encoding(self.name.as_bytes().to_vec(), "UTF-8".to_string()))));
        obj.instance_vars.push(("@volume".to_string(), RubyValue::Integer(self.volume)));
        obj.instance_vars.push(("@pitch".to_string(), RubyValue::Integer(self.pitch)));
        RubyValue::Object(obj)
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

    pub fn to_ruby_value(&self) -> RubyValue {
        let mut obj = RubyObject::new("RPG::MapInfo".to_string());
        obj.instance_vars.push(("@name".to_string(), RubyValue::String(RubyString::with_encoding(self.name.as_bytes().to_vec(), "UTF-8".to_string()))));
        obj.instance_vars.push(("@parent_id".to_string(), RubyValue::Integer(self.parent_id)));
        obj.instance_vars.push(("@order".to_string(), RubyValue::Integer(self.order)));
        obj.instance_vars.push(("@expanded".to_string(), if self.expanded { RubyValue::True } else { RubyValue::False }));
        obj.instance_vars.push(("@scroll_x".to_string(), RubyValue::Integer(self.scroll_x)));
        obj.instance_vars.push(("@scroll_y".to_string(), RubyValue::Integer(self.scroll_y)));
        RubyValue::Object(obj)
    }
}
