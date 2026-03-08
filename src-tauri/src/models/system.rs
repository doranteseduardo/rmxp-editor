use crate::marshal::types::*;
use serde::{Deserialize, Serialize};

/// RPG::System — global game system data.
/// Stored in System.rxdata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpgSystem {
    pub magic_number: i64,
    pub party_members: Vec<i64>,
    pub switches: Vec<String>,
    pub variables: Vec<String>,
    pub windowskin_name: String,
    pub title_name: String,
    pub gameover_name: String,
    pub battle_transition: String,
    pub title_bgm: Option<String>,
    pub edit_map_id: i64,
}

impl RpgSystem {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        if obj.class_name != "RPG::System" {
            return None;
        }

        let party_members = obj
            .get("party_members")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_int()).collect())
            .unwrap_or_default();

        let switches = obj
            .get("switches")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .map(|v| v.as_string().unwrap_or_default())
                    .collect()
            })
            .unwrap_or_default();

        let variables = obj
            .get("variables")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .map(|v| v.as_string().unwrap_or_default())
                    .collect()
            })
            .unwrap_or_default();

        Some(Self {
            magic_number: obj.get_int("magic_number").unwrap_or(0),
            party_members,
            switches,
            variables,
            windowskin_name: obj.get_string("windowskin_name").unwrap_or_default(),
            title_name: obj.get_string("title_name").unwrap_or_default(),
            gameover_name: obj.get_string("gameover_name").unwrap_or_default(),
            battle_transition: obj.get_string("battle_transition").unwrap_or_default(),
            title_bgm: obj.get_string("title_bgm"),
            edit_map_id: obj.get_int("edit_map_id").unwrap_or(1),
        })
    }
}
