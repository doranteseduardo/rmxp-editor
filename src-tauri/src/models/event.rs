use crate::marshal::types::*;
use serde::{Deserialize, Serialize};

/// RPG::Event — a map event with one or more pages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpgEvent {
    pub id: i64,
    pub name: String,
    pub x: i64,
    pub y: i64,
    pub pages: Vec<EventPage>,
}

/// RPG::Event::Page — a single event page with conditions and commands.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventPage {
    pub condition: EventCondition,
    pub graphic: EventGraphic,
    pub move_type: i64,
    pub move_speed: i64,
    pub move_frequency: i64,
    pub move_route: MoveRoute,
    pub walk_anime: bool,
    pub step_anime: bool,
    pub direction_fix: bool,
    pub through: bool,
    pub always_on_top: bool,
    pub trigger: i64,
    pub list: Vec<EventCommand>,
}

/// RPG::Event::Page::Condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventCondition {
    pub switch1_valid: bool,
    pub switch2_valid: bool,
    pub variable_valid: bool,
    pub self_switch_valid: bool,
    pub switch1_id: i64,
    pub switch2_id: i64,
    pub variable_id: i64,
    pub variable_value: i64,
    pub self_switch_ch: String,
}

/// RPG::Event::Page::Graphic
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventGraphic {
    pub tile_id: i64,
    pub character_name: String,
    pub character_hue: i64,
    pub direction: i64,
    pub pattern: i64,
    pub opacity: i64,
    pub blend_type: i64,
}

/// RPG::MoveRoute
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveRoute {
    pub repeat: bool,
    pub skippable: bool,
    pub list: Vec<MoveCommand>,
}

/// RPG::MoveCommand
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveCommand {
    pub code: i64,
    pub parameters: Vec<RubyValue>,
}

/// RPG::EventCommand — a single command in an event's command list.
///
/// Commands are identified by their `code` field:
/// - 0: Empty (end of list)
/// - 101: Show Text
/// - 102: Show Choices
/// - 111: Conditional Branch
/// - 112: Loop
/// - 121: Control Switches
/// - 122: Control Variables
/// - 201: Transfer Player
/// - 209: Set Move Route
/// - 355: Script (Ruby code)
/// - 401: Show Text (continuation)
/// - 655: Script (continuation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventCommand {
    pub code: i64,
    pub indent: i64,
    pub parameters: Vec<RubyValue>,
}

impl RpgEvent {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        if obj.class_name != "RPG::Event" {
            return None;
        }

        let id = obj.get_int("id").unwrap_or(0);
        let name = obj.get_string("name").unwrap_or_default();
        let x = obj.get_int("x").unwrap_or(0);
        let y = obj.get_int("y").unwrap_or(0);

        let pages = obj
            .get("pages")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(EventPage::from_ruby_value)
                    .collect()
            })
            .unwrap_or_default();

        Some(Self {
            id,
            name,
            x,
            y,
            pages,
        })
    }
}

impl EventPage {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;

        let condition = obj
            .get("condition")
            .and_then(EventCondition::from_ruby_value)
            .unwrap_or_default();

        let graphic = obj
            .get("graphic")
            .and_then(EventGraphic::from_ruby_value)
            .unwrap_or_default();

        let move_route = obj
            .get("move_route")
            .and_then(MoveRoute::from_ruby_value)
            .unwrap_or_default();

        let list = obj
            .get("list")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(EventCommand::from_ruby_value)
                    .collect()
            })
            .unwrap_or_default();

        Some(Self {
            condition,
            graphic,
            move_type: obj.get_int("move_type").unwrap_or(0),
            move_speed: obj.get_int("move_speed").unwrap_or(3),
            move_frequency: obj.get_int("move_frequency").unwrap_or(3),
            move_route,
            walk_anime: obj.get_bool("walk_anime").unwrap_or(true),
            step_anime: obj.get_bool("step_anime").unwrap_or(false),
            direction_fix: obj.get_bool("direction_fix").unwrap_or(false),
            through: obj.get_bool("through").unwrap_or(false),
            always_on_top: obj.get_bool("always_on_top").unwrap_or(false),
            trigger: obj.get_int("trigger").unwrap_or(0),
            list,
        })
    }
}

impl EventCondition {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            switch1_valid: obj.get_bool("switch1_valid").unwrap_or(false),
            switch2_valid: obj.get_bool("switch2_valid").unwrap_or(false),
            variable_valid: obj.get_bool("variable_valid").unwrap_or(false),
            self_switch_valid: obj.get_bool("self_switch_valid").unwrap_or(false),
            switch1_id: obj.get_int("switch1_id").unwrap_or(1),
            switch2_id: obj.get_int("switch2_id").unwrap_or(1),
            variable_id: obj.get_int("variable_id").unwrap_or(1),
            variable_value: obj.get_int("variable_value").unwrap_or(0),
            self_switch_ch: obj.get_string("self_switch_ch").unwrap_or("A".to_string()),
        })
    }
}

impl Default for EventCondition {
    fn default() -> Self {
        Self {
            switch1_valid: false,
            switch2_valid: false,
            variable_valid: false,
            self_switch_valid: false,
            switch1_id: 1,
            switch2_id: 1,
            variable_id: 1,
            variable_value: 0,
            self_switch_ch: "A".to_string(),
        }
    }
}

impl EventGraphic {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            tile_id: obj.get_int("tile_id").unwrap_or(0),
            character_name: obj.get_string("character_name").unwrap_or_default(),
            character_hue: obj.get_int("character_hue").unwrap_or(0),
            direction: obj.get_int("direction").unwrap_or(2),
            pattern: obj.get_int("pattern").unwrap_or(0),
            opacity: obj.get_int("opacity").unwrap_or(255),
            blend_type: obj.get_int("blend_type").unwrap_or(0),
        })
    }
}

impl Default for EventGraphic {
    fn default() -> Self {
        Self {
            tile_id: 0,
            character_name: String::new(),
            character_hue: 0,
            direction: 2,
            pattern: 0,
            opacity: 255,
            blend_type: 0,
        }
    }
}

impl MoveRoute {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;

        let list = obj
            .get("list")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(MoveCommand::from_ruby_value)
                    .collect()
            })
            .unwrap_or_default();

        Some(Self {
            repeat: obj.get_bool("repeat").unwrap_or(true),
            skippable: obj.get_bool("skippable").unwrap_or(false),
            list,
        })
    }
}

impl Default for MoveRoute {
    fn default() -> Self {
        Self {
            repeat: true,
            skippable: false,
            list: vec![MoveCommand {
                code: 0,
                parameters: vec![],
            }],
        }
    }
}

impl MoveCommand {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            code: obj.get_int("code").unwrap_or(0),
            parameters: obj
                .get("parameters")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default(),
        })
    }
}

impl EventCommand {
    pub fn from_ruby_value(value: &RubyValue) -> Option<Self> {
        let obj = value.as_object()?;
        Some(Self {
            code: obj.get_int("code").unwrap_or(0),
            indent: obj.get_int("indent").unwrap_or(0),
            parameters: obj
                .get("parameters")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default(),
        })
    }

    /// Returns a human-readable description of the command.
    pub fn description(&self) -> &str {
        match self.code {
            0 => "(end)",
            101 => "Show Text",
            102 => "Show Choices",
            103 => "Input Number",
            104 => "Change Text Options",
            108 => "Comment",
            111 => "Conditional Branch",
            112 => "Loop",
            113 => "Break Loop",
            115 => "Exit Event Processing",
            116 => "Erase Event",
            117 => "Call Common Event",
            118 => "Label",
            119 => "Jump to Label",
            121 => "Control Switches",
            122 => "Control Variables",
            123 => "Control Self Switch",
            124 => "Control Timer",
            125 => "Change Gold",
            126 => "Change Items",
            127 => "Change Weapons",
            128 => "Change Armor",
            129 => "Change Party Member",
            131 => "Change Windowskin",
            132 => "Change Battle BGM",
            133 => "Change Battle End ME",
            134 => "Change Save Access",
            135 => "Change Menu Access",
            136 => "Change Encounter",
            201 => "Transfer Player",
            202 => "Set Event Location",
            203 => "Scroll Map",
            204 => "Change Map Settings",
            205 => "Change Fog Color Tone",
            206 => "Change Fog Opacity",
            207 => "Show Animation",
            208 => "Change Transparent Flag",
            209 => "Set Move Route",
            210 => "Wait for Move's Completion",
            221 => "Prepare for Transition",
            222 => "Execute Transition",
            223 => "Change Screen Color Tone",
            224 => "Screen Flash",
            225 => "Screen Shake",
            231 => "Show Picture",
            232 => "Move Picture",
            233 => "Rotate Picture",
            234 => "Change Picture Color Tone",
            235 => "Erase Picture",
            236 => "Set Weather Effects",
            241 => "Play BGM",
            242 => "Fade Out BGM",
            245 => "Play BGS",
            246 => "Fade Out BGS",
            247 => "Memorize BGM/BGS",
            248 => "Restore BGM/BGS",
            249 => "Play ME",
            250 => "Play SE",
            251 => "Stop SE",
            301 => "Battle Processing",
            302 => "Shop Processing",
            303 => "Name Input Processing",
            311 => "Change HP",
            312 => "Change SP",
            313 => "Change State",
            314 => "Recover All",
            315 => "Change EXP",
            316 => "Change Level",
            317 => "Change Parameters",
            318 => "Change Skills",
            319 => "Change Equipment",
            320 => "Change Actor Name",
            321 => "Change Actor Class",
            322 => "Change Actor Graphic",
            331 => "Change Enemy HP",
            332 => "Change Enemy SP",
            333 => "Change Enemy State",
            334 => "Enemy Recover All",
            335 => "Enemy Appearance",
            336 => "Enemy Transform",
            337 => "Show Battle Animation",
            338 => "Deal Damage",
            339 => "Force Action",
            340 => "Abort Battle",
            351 => "Call Menu Screen",
            352 => "Call Save Screen",
            353 => "Game Over",
            354 => "Return to Title Screen",
            355 => "Script",
            401 => "(text continuation)",
            402 => "When [Choice]",
            403 => "When Cancel",
            404 => "(choice branch end)",
            408 => "(comment continuation)",
            411 => "Else",
            412 => "(conditional branch end)",
            413 => "(loop end)",
            601 => "If Win",
            602 => "If Escape",
            603 => "If Lose",
            604 => "(battle branch end)",
            655 => "(script continuation)",
            _ => "Unknown Command",
        }
    }
}
