use super::map::AudioFile;
use crate::marshal::types::*;
use serde::{Deserialize, Serialize};

/// RPG::System::Words — vocabulary used in menus and battle.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemWords {
    pub gold: String,
    pub hp: String,
    pub sp: String,
    pub str: String,
    pub dex: String,
    pub agi: String,
    pub int: String,
    pub atk: String,
    pub pdef: String,
    pub mdef: String,
    pub weapon: String,
    pub armor1: String,
    pub armor2: String,
    pub armor3: String,
    pub armor4: String,
    pub attack: String,
    pub skill: String,
    pub guard: String,
    pub item: String,
    pub equip: String,
}

impl Default for SystemWords {
    fn default() -> Self {
        Self {
            gold: String::new(), hp: String::new(), sp: String::new(),
            str: String::new(), dex: String::new(), agi: String::new(), int: String::new(),
            atk: String::new(), pdef: String::new(), mdef: String::new(),
            weapon: String::new(), armor1: String::new(), armor2: String::new(),
            armor3: String::new(), armor4: String::new(),
            attack: String::new(), skill: String::new(), guard: String::new(),
            item: String::new(), equip: String::new(),
        }
    }
}

impl SystemWords {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            gold: obj.get_string("gold").unwrap_or_default(),
            hp: obj.get_string("hp").unwrap_or_default(),
            sp: obj.get_string("sp").unwrap_or_default(),
            str: obj.get_string("str").unwrap_or_default(),
            dex: obj.get_string("dex").unwrap_or_default(),
            agi: obj.get_string("agi").unwrap_or_default(),
            int: obj.get_string("int").unwrap_or_default(),
            atk: obj.get_string("atk").unwrap_or_default(),
            pdef: obj.get_string("pdef").unwrap_or_default(),
            mdef: obj.get_string("mdef").unwrap_or_default(),
            weapon: obj.get_string("weapon").unwrap_or_default(),
            armor1: obj.get_string("armor1").unwrap_or_default(),
            armor2: obj.get_string("armor2").unwrap_or_default(),
            armor3: obj.get_string("armor3").unwrap_or_default(),
            armor4: obj.get_string("armor4").unwrap_or_default(),
            attack: obj.get_string("attack").unwrap_or_default(),
            skill: obj.get_string("skill").unwrap_or_default(),
            guard: obj.get_string("guard").unwrap_or_default(),
            item: obj.get_string("item").unwrap_or_default(),
            equip: obj.get_string("equip").unwrap_or_default(),
        })
    }

    pub fn to_ruby_value(&self) -> RubyValue {
        let mut obj = RubyObject::new("RPG::System::Words".to_string());
        let fields = [
            ("gold", &self.gold), ("hp", &self.hp), ("sp", &self.sp),
            ("str", &self.str), ("dex", &self.dex), ("agi", &self.agi), ("int", &self.int),
            ("atk", &self.atk), ("pdef", &self.pdef), ("mdef", &self.mdef),
            ("weapon", &self.weapon), ("armor1", &self.armor1), ("armor2", &self.armor2),
            ("armor3", &self.armor3), ("armor4", &self.armor4),
            ("attack", &self.attack), ("skill", &self.skill), ("guard", &self.guard),
            ("item", &self.item), ("equip", &self.equip),
        ];
        for (name, val) in &fields {
            obj.instance_vars.push((
                format!("@{}", name),
                RubyValue::String(RubyString::with_encoding(val.as_bytes().to_vec(), "UTF-8".to_string())),
            ));
        }
        RubyValue::Object(obj)
    }
}

/// RPG::System::TestBattler — test battle party member configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestBattler {
    pub actor_id: i64,
    pub level: i64,
    pub weapon_id: i64,
    pub armor1_id: i64,
    pub armor2_id: i64,
    pub armor3_id: i64,
    pub armor4_id: i64,
}

impl Default for TestBattler {
    fn default() -> Self {
        Self { actor_id: 1, level: 1, weapon_id: 0, armor1_id: 0, armor2_id: 0, armor3_id: 0, armor4_id: 0 }
    }
}

impl TestBattler {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            actor_id: obj.get_int("actor_id").unwrap_or(1),
            level: obj.get_int("level").unwrap_or(1),
            weapon_id: obj.get_int("weapon_id").unwrap_or(0),
            armor1_id: obj.get_int("armor1_id").unwrap_or(0),
            armor2_id: obj.get_int("armor2_id").unwrap_or(0),
            armor3_id: obj.get_int("armor3_id").unwrap_or(0),
            armor4_id: obj.get_int("armor4_id").unwrap_or(0),
        })
    }

    pub fn to_ruby_value(&self) -> RubyValue {
        let mut obj = RubyObject::new("RPG::System::TestBattler".to_string());
        obj.instance_vars.push(("@actor_id".to_string(), RubyValue::Integer(self.actor_id)));
        obj.instance_vars.push(("@level".to_string(), RubyValue::Integer(self.level)));
        obj.instance_vars.push(("@weapon_id".to_string(), RubyValue::Integer(self.weapon_id)));
        obj.instance_vars.push(("@armor1_id".to_string(), RubyValue::Integer(self.armor1_id)));
        obj.instance_vars.push(("@armor2_id".to_string(), RubyValue::Integer(self.armor2_id)));
        obj.instance_vars.push(("@armor3_id".to_string(), RubyValue::Integer(self.armor3_id)));
        obj.instance_vars.push(("@armor4_id".to_string(), RubyValue::Integer(self.armor4_id)));
        RubyValue::Object(obj)
    }
}

/// RPG::System — global game system data.
/// Stored in System.rxdata. Contains all system-wide settings per the official RMXP docs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpgSystem {
    pub magic_number: i64,
    pub party_members: Vec<i64>,
    pub elements: Vec<String>,
    pub switches: Vec<String>,
    pub variables: Vec<String>,
    pub windowskin_name: String,
    pub title_name: String,
    pub gameover_name: String,
    pub battle_transition: String,
    pub title_bgm: AudioFile,
    pub battle_bgm: AudioFile,
    pub battle_end_me: AudioFile,
    pub gameover_me: AudioFile,
    pub cursor_se: AudioFile,
    pub decision_se: AudioFile,
    pub cancel_se: AudioFile,
    pub buzzer_se: AudioFile,
    pub equip_se: AudioFile,
    pub shop_se: AudioFile,
    pub save_se: AudioFile,
    pub load_se: AudioFile,
    pub battle_start_se: AudioFile,
    pub escape_se: AudioFile,
    pub actor_collapse_se: AudioFile,
    pub enemy_collapse_se: AudioFile,
    pub words: SystemWords,
    pub start_map_id: i64,
    pub start_x: i64,
    pub start_y: i64,
    pub test_battlers: Vec<TestBattler>,
    pub test_troop_id: i64,
    pub battleback_name: String,
    pub battler_name: String,
    pub battler_hue: i64,
    pub edit_map_id: i64,
}

fn ruby_str(s: &str) -> RubyValue {
    RubyValue::String(RubyString::with_encoding(s.as_bytes().to_vec(), "UTF-8".to_string()))
}

fn ruby_int(v: i64) -> RubyValue {
    RubyValue::Integer(v)
}

fn parse_string_array(value: Option<&RubyValue>) -> Vec<String> {
    value
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().map(|v| v.as_string().unwrap_or_default()).collect())
        .unwrap_or_default()
}

fn parse_int_array(value: Option<&RubyValue>) -> Vec<i64> {
    value
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_int()).collect())
        .unwrap_or_default()
}

fn se_default() -> AudioFile {
    AudioFile { name: String::new(), volume: 80, pitch: 100 }
}

impl RpgSystem {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        if obj.class_name != "RPG::System" {
            return None;
        }

        let parse_audio = |name: &str| -> AudioFile {
            obj.get(name).and_then(AudioFile::from_ruby_value).unwrap_or_default()
        };

        let parse_se = |name: &str| -> AudioFile {
            obj.get(name).and_then(AudioFile::from_ruby_value).unwrap_or_else(se_default)
        };

        let words = obj.get("words")
            .and_then(SystemWords::from_ruby_value)
            .unwrap_or_default();

        let test_battlers = obj.get("test_battlers")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(TestBattler::from_ruby_value).collect())
            .unwrap_or_default();

        Some(Self {
            magic_number: obj.get_int("magic_number").unwrap_or(0),
            party_members: parse_int_array(obj.get("party_members")),
            elements: parse_string_array(obj.get("elements")),
            switches: parse_string_array(obj.get("switches")),
            variables: parse_string_array(obj.get("variables")),
            windowskin_name: obj.get_string("windowskin_name").unwrap_or_default(),
            title_name: obj.get_string("title_name").unwrap_or_default(),
            gameover_name: obj.get_string("gameover_name").unwrap_or_default(),
            battle_transition: obj.get_string("battle_transition").unwrap_or_default(),
            title_bgm: parse_audio("title_bgm"),
            battle_bgm: parse_audio("battle_bgm"),
            battle_end_me: parse_audio("battle_end_me"),
            gameover_me: parse_audio("gameover_me"),
            cursor_se: parse_se("cursor_se"),
            decision_se: parse_se("decision_se"),
            cancel_se: parse_se("cancel_se"),
            buzzer_se: parse_se("buzzer_se"),
            equip_se: parse_se("equip_se"),
            shop_se: parse_se("shop_se"),
            save_se: parse_se("save_se"),
            load_se: parse_se("load_se"),
            battle_start_se: parse_se("battle_start_se"),
            escape_se: parse_se("escape_se"),
            actor_collapse_se: parse_se("actor_collapse_se"),
            enemy_collapse_se: parse_se("enemy_collapse_se"),
            words,
            start_map_id: obj.get_int("start_map_id").unwrap_or(1),
            start_x: obj.get_int("start_x").unwrap_or(0),
            start_y: obj.get_int("start_y").unwrap_or(0),
            test_battlers,
            test_troop_id: obj.get_int("test_troop_id").unwrap_or(1),
            battleback_name: obj.get_string("battleback_name").unwrap_or_default(),
            battler_name: obj.get_string("battler_name").unwrap_or_default(),
            battler_hue: obj.get_int("battler_hue").unwrap_or(0),
            edit_map_id: obj.get_int("edit_map_id").unwrap_or(1),
        })
    }

    pub fn to_ruby_value(&self) -> RubyValue {
        let mut obj = RubyObject::new("RPG::System".to_string());

        obj.instance_vars.push(("@magic_number".to_string(), ruby_int(self.magic_number)));

        let pm: Vec<RubyValue> = self.party_members.iter().map(|&v| ruby_int(v)).collect();
        obj.instance_vars.push(("@party_members".to_string(), RubyValue::Array(pm)));

        let elems: Vec<RubyValue> = self.elements.iter().map(|s| {
            if s.is_empty() { RubyValue::Nil } else { ruby_str(s) }
        }).collect();
        obj.instance_vars.push(("@elements".to_string(), RubyValue::Array(elems)));

        let switches: Vec<RubyValue> = self.switches.iter().map(|s| {
            if s.is_empty() { RubyValue::Nil } else { ruby_str(s) }
        }).collect();
        obj.instance_vars.push(("@switches".to_string(), RubyValue::Array(switches)));

        let variables: Vec<RubyValue> = self.variables.iter().map(|s| {
            if s.is_empty() { RubyValue::Nil } else { ruby_str(s) }
        }).collect();
        obj.instance_vars.push(("@variables".to_string(), RubyValue::Array(variables)));

        obj.instance_vars.push(("@windowskin_name".to_string(), ruby_str(&self.windowskin_name)));
        obj.instance_vars.push(("@title_name".to_string(), ruby_str(&self.title_name)));
        obj.instance_vars.push(("@gameover_name".to_string(), ruby_str(&self.gameover_name)));
        obj.instance_vars.push(("@battle_transition".to_string(), ruby_str(&self.battle_transition)));

        obj.instance_vars.push(("@title_bgm".to_string(), self.title_bgm.to_ruby_value()));
        obj.instance_vars.push(("@battle_bgm".to_string(), self.battle_bgm.to_ruby_value()));
        obj.instance_vars.push(("@battle_end_me".to_string(), self.battle_end_me.to_ruby_value()));
        obj.instance_vars.push(("@gameover_me".to_string(), self.gameover_me.to_ruby_value()));
        obj.instance_vars.push(("@cursor_se".to_string(), self.cursor_se.to_ruby_value()));
        obj.instance_vars.push(("@decision_se".to_string(), self.decision_se.to_ruby_value()));
        obj.instance_vars.push(("@cancel_se".to_string(), self.cancel_se.to_ruby_value()));
        obj.instance_vars.push(("@buzzer_se".to_string(), self.buzzer_se.to_ruby_value()));
        obj.instance_vars.push(("@equip_se".to_string(), self.equip_se.to_ruby_value()));
        obj.instance_vars.push(("@shop_se".to_string(), self.shop_se.to_ruby_value()));
        obj.instance_vars.push(("@save_se".to_string(), self.save_se.to_ruby_value()));
        obj.instance_vars.push(("@load_se".to_string(), self.load_se.to_ruby_value()));
        obj.instance_vars.push(("@battle_start_se".to_string(), self.battle_start_se.to_ruby_value()));
        obj.instance_vars.push(("@escape_se".to_string(), self.escape_se.to_ruby_value()));
        obj.instance_vars.push(("@actor_collapse_se".to_string(), self.actor_collapse_se.to_ruby_value()));
        obj.instance_vars.push(("@enemy_collapse_se".to_string(), self.enemy_collapse_se.to_ruby_value()));

        obj.instance_vars.push(("@words".to_string(), self.words.to_ruby_value()));
        obj.instance_vars.push(("@start_map_id".to_string(), ruby_int(self.start_map_id)));
        obj.instance_vars.push(("@start_x".to_string(), ruby_int(self.start_x)));
        obj.instance_vars.push(("@start_y".to_string(), ruby_int(self.start_y)));

        let tb: Vec<RubyValue> = self.test_battlers.iter().map(|b| b.to_ruby_value()).collect();
        obj.instance_vars.push(("@test_battlers".to_string(), RubyValue::Array(tb)));
        obj.instance_vars.push(("@test_troop_id".to_string(), ruby_int(self.test_troop_id)));
        obj.instance_vars.push(("@battleback_name".to_string(), ruby_str(&self.battleback_name)));
        obj.instance_vars.push(("@battler_name".to_string(), ruby_str(&self.battler_name)));
        obj.instance_vars.push(("@battler_hue".to_string(), ruby_int(self.battler_hue)));
        obj.instance_vars.push(("@edit_map_id".to_string(), ruby_int(self.edit_map_id)));

        RubyValue::Object(obj)
    }
}
