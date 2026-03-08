/**
 * Complete RPG:: data type definitions matching the official RMXP documentation.
 *
 * These interfaces represent the structure of data stored in .rxdata files.
 * They are used by the generic database loader which converts Ruby Marshal
 * objects to JSON via { __class: "RPG::ClassName", field1: ..., field2: ... }.
 *
 * All fields, types, and defaults match the RPGXP.chm documentation exactly.
 */

// ── Primitives ──────────────────────────────────────────────────

/** Color (UserDefined binary: 4 f64s → r,g,b,a) */
export interface RpgColor {
  __class: "Color";
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

/** Tone (UserDefined binary: 4 f64s → r,g,b,gray) */
export interface RpgTone {
  __class: "Tone";
  red: number;
  green: number;
  blue: number;
  gray: number;
}

/** Table — multidimensional i16 array with header metadata + data payload */
export interface RpgTable {
  __class: "Table";
  dims?: number;
  x_size?: number;
  y_size?: number;
  z_size?: number;
  /** Flat array of i16 values. Access: data[z * (x_size * y_size) + y * x_size + x] */
  data?: number[];
}

/** RPG::AudioFile */
export interface RpgAudioFile {
  __class?: "RPG::AudioFile";
  name: string;
  volume: number;   // 0..100
  pitch: number;    // 50..150
}

// ── Actors ──────────────────────────────────────────────────────

/** RPG::Actor — stored in Actors.rxdata[1..n] */
export interface RpgActor {
  __class: "RPG::Actor";
  id: number;
  name: string;
  class_id: number;          // default: 1
  initial_level: number;     // default: 1
  final_level: number;       // default: 99
  exp_basis: number;         // default: 30 (10..50)
  exp_inflation: number;     // default: 30 (10..50)
  character_name: string;
  character_hue: number;     // 0..360
  battler_name: string;
  battler_hue: number;       // 0..360
  parameters: RpgTable;      // Table(6, 100) — 6 stats × 100 levels
  weapon_id: number;
  armor1_id: number;
  armor2_id: number;
  armor3_id: number;
  armor4_id: number;
  weapon_fix: boolean;
  armor1_fix: boolean;
  armor2_fix: boolean;
  armor3_fix: boolean;
  armor4_fix: boolean;
}

// ── Classes ─────────────────────────────────────────────────────

/** RPG::Class::Learning */
export interface RpgClassLearning {
  __class: "RPG::Class::Learning";
  level: number;     // default: 1
  skill_id: number;  // default: 1
}

/** RPG::Class — stored in Classes.rxdata[1..n] */
export interface RpgClass {
  __class: "RPG::Class";
  id: number;
  name: string;
  position: number;              // 0: front, 1: middle, 2: rear
  weapon_set: number[];          // allowed weapon IDs
  armor_set: number[];           // allowed armor IDs
  element_ranks: RpgTable;       // Table(num_elements)
  state_ranks: RpgTable;         // Table(num_states)
  learnings: RpgClassLearning[];
}

// ── Skills ──────────────────────────────────────────────────────

/** RPG::Skill — stored in Skills.rxdata[1..n] */
export interface RpgSkill {
  __class: "RPG::Skill";
  id: number;
  name: string;
  icon_name: string;
  description: string;
  scope: number;           // 0: none, 1: one enemy, 2: all enemies, 3: one ally, 4: all allies, 5: 1 ally HP0, 6: all allies HP0, 7: user
  occasion: number;        // 0: always, 1: battle only, 2: menu only, 3: never
  animation1_id: number;
  animation2_id: number;
  menu_se: RpgAudioFile;
  common_event_id: number;
  sp_cost: number;
  power: number;
  atk_f: number;
  eva_f: number;
  str_f: number;
  dex_f: number;
  agi_f: number;
  int_f: number;           // default: 100
  hit: number;             // default: 100
  pdef_f: number;
  mdef_f: number;          // default: 100
  variance: number;        // default: 15
  element_set: number[];
  plus_state_set: number[];
  minus_state_set: number[];
}

// ── Items ───────────────────────────────────────────────────────

/** RPG::Item — stored in Items.rxdata[1..n] */
export interface RpgItem {
  __class: "RPG::Item";
  id: number;
  name: string;
  icon_name: string;
  description: string;
  scope: number;
  occasion: number;
  animation1_id: number;
  animation2_id: number;
  menu_se: RpgAudioFile;
  common_event_id: number;
  price: number;
  consumable: boolean;      // default: true
  parameter_type: number;   // 0: none, 1: max HP, 2: max SP, 3: str, 4: dex, 5: agi, 6: int
  parameter_points: number;
  recover_hp_rate: number;
  recover_hp: number;
  recover_sp_rate: number;
  recover_sp: number;
  hit: number;              // default: 100
  pdef_f: number;
  mdef_f: number;
  variance: number;
  element_set: number[];
  plus_state_set: number[];
  minus_state_set: number[];
}

// ── Weapons ─────────────────────────────────────────────────────

/** RPG::Weapon — stored in Weapons.rxdata[1..n] */
export interface RpgWeapon {
  __class: "RPG::Weapon";
  id: number;
  name: string;
  icon_name: string;
  description: string;
  animation1_id: number;
  animation2_id: number;
  price: number;
  atk: number;
  pdef: number;
  mdef: number;
  str_plus: number;
  dex_plus: number;
  agi_plus: number;
  int_plus: number;
  element_set: number[];
  plus_state_set: number[];
  minus_state_set: number[];
}

// ── Armor ───────────────────────────────────────────────────────

/** RPG::Armor — stored in Armors.rxdata[1..n] */
export interface RpgArmor {
  __class: "RPG::Armor";
  id: number;
  name: string;
  icon_name: string;
  description: string;
  kind: number;              // 0: shield, 1: helmet, 2: body armor, 3: accessory
  auto_state_id: number;
  price: number;
  pdef: number;
  mdef: number;
  eva: number;
  str_plus: number;
  dex_plus: number;
  agi_plus: number;
  int_plus: number;
  guard_element_set: number[];
  guard_state_set: number[];
}

// ── Enemies ─────────────────────────────────────────────────────

/** RPG::Enemy::Action */
export interface RpgEnemyAction {
  __class: "RPG::Enemy::Action";
  kind: number;              // 0: basic, 1: skill
  basic: number;             // 0: attack, 1: defend, 2: escape, 3: do nothing
  skill_id: number;
  condition_turn_a: number;
  condition_turn_b: number;  // default: 1
  condition_hp: number;      // default: 100 (percentage)
  condition_level: number;   // default: 1
  condition_switch_id: number;
  rating: number;            // 1..10, default: 5
}

/** RPG::Enemy — stored in Enemies.rxdata[1..n] */
export interface RpgEnemy {
  __class: "RPG::Enemy";
  id: number;
  name: string;
  battler_name: string;
  battler_hue: number;
  maxhp: number;             // default: 500
  maxsp: number;             // default: 500
  str: number;               // default: 50
  dex: number;               // default: 50
  agi: number;               // default: 50
  int: number;               // default: 50
  atk: number;               // default: 100
  pdef: number;              // default: 100
  mdef: number;              // default: 100
  eva: number;
  animation1_id: number;
  animation2_id: number;
  element_ranks: RpgTable;
  state_ranks: RpgTable;
  actions: RpgEnemyAction[];
  exp: number;
  gold: number;
  item_id: number;
  weapon_id: number;
  armor_id: number;
  treasure_prob: number;     // default: 100
}

// ── States ──────────────────────────────────────────────────────

/** RPG::State — stored in States.rxdata[1..n] */
export interface RpgState {
  __class: "RPG::State";
  id: number;
  name: string;
  animation_id: number;
  restriction: number;       // 0: none, 1: can't use magic, 2: always attack enemies, 3: always attack allies, 4: can't move
  nonresistance: boolean;
  zero_hp: boolean;
  cant_get_exp: boolean;
  cant_evade: boolean;
  slip_damage: boolean;
  rating: number;            // 0..10, default: 5
  hit_rate: number;          // default: 100
  maxhp_rate: number;        // default: 100
  maxsp_rate: number;        // default: 100
  str_rate: number;          // default: 100
  dex_rate: number;          // default: 100
  agi_rate: number;          // default: 100
  int_rate: number;          // default: 100
  atk_rate: number;          // default: 100
  pdef_rate: number;         // default: 100
  mdef_rate: number;         // default: 100
  eva: number;
  battle_only: boolean;      // default: true
  hold_turn: number;
  auto_release_prob: number;
  shock_release_prob: number;
  guard_element_set: number[];
  plus_state_set: number[];
  minus_state_set: number[];
}

// ── Animations ──────────────────────────────────────────────────

/** RPG::Animation::Frame */
export interface RpgAnimationFrame {
  __class: "RPG::Animation::Frame";
  cell_max: number;
  cell_data: RpgTable;      // Table(cell_max, 8) — 8 properties per cell
}

/** RPG::Animation::Timing */
export interface RpgAnimationTiming {
  __class: "RPG::Animation::Timing";
  frame: number;
  se: RpgAudioFile;
  flash_scope: number;      // 0: none, 1: target, 2: screen, 3: delete target
  flash_color: RpgColor;
  flash_duration: number;   // default: 5
  condition: number;        // 0: none, 1: hit, 2: miss
}

/** RPG::Animation — stored in Animations.rxdata[1..n] */
export interface RpgAnimation {
  __class: "RPG::Animation";
  id: number;
  name: string;
  animation_name: string;
  animation_hue: number;
  position: number;          // 0: top, 1: middle, 2: bottom, 3: screen
  frame_max: number;         // default: 1
  frames: RpgAnimationFrame[];
  timings: RpgAnimationTiming[];
}

// ── Common Events ───────────────────────────────────────────────

/** RPG::CommonEvent — stored in CommonEvents.rxdata[1..n] */
export interface RpgCommonEvent {
  __class: "RPG::CommonEvent";
  id: number;
  name: string;
  trigger: number;           // 0: none, 1: autorun, 2: parallel
  switch_id: number;         // default: 1
  list: { code: number; indent: number; parameters: unknown[] }[];
}

// ── Troops ──────────────────────────────────────────────────────

/** RPG::Troop::Member */
export interface RpgTroopMember {
  __class: "RPG::Troop::Member";
  enemy_id: number;          // default: 1
  x: number;
  y: number;
  hidden: boolean;
  immortal: boolean;
}

/** RPG::Troop::Page::Condition */
export interface RpgTroopPageCondition {
  __class: "RPG::Troop::Page::Condition";
  turn_valid: boolean;
  enemy_valid: boolean;
  actor_valid: boolean;
  switch_valid: boolean;
  turn_a: number;
  turn_b: number;
  enemy_index: number;       // 0..7
  enemy_hp: number;          // default: 50
  actor_id: number;          // default: 1
  actor_hp: number;          // default: 50
  switch_id: number;         // default: 1
}

/** RPG::Troop::Page */
export interface RpgTroopPage {
  __class: "RPG::Troop::Page";
  condition: RpgTroopPageCondition;
  span: number;              // 0: battle, 1: turn, 2: moment
  list: { code: number; indent: number; parameters: unknown[] }[];
}

/** RPG::Troop — stored in Troops.rxdata[1..n] */
export interface RpgTroop {
  __class: "RPG::Troop";
  id: number;
  name: string;
  members: RpgTroopMember[];
  pages: RpgTroopPage[];
}

// ── Tilesets ────────────────────────────────────────────────────

/** RPG::Tileset — stored in Tilesets.rxdata[1..n] */
export interface RpgTileset {
  __class: "RPG::Tileset";
  id: number;
  name: string;
  tileset_name: string;
  autotile_names: string[];   // 7 entries
  panorama_name: string;
  panorama_hue: number;
  fog_name: string;
  fog_hue: number;
  fog_opacity: number;        // default: 64
  fog_blend_type: number;
  fog_zoom: number;           // default: 200
  fog_sx: number;
  fog_sy: number;
  battleback_name: string;
  passages: RpgTable;         // Table — bits 0-3: direction flags, bit 6 (0x40): bush, bit 7 (0x80): counter
  priorities: RpgTable;       // Table — priority values 0-5
  terrain_tags: RpgTable;     // Table — terrain tag values 0-17 (PE v21.1)
}

// ── System ──────────────────────────────────────────────────────

/** RPG::System::Words */
export interface RpgSystemWords {
  gold: string;
  hp: string;
  sp: string;
  str: string;
  dex: string;
  agi: string;
  int: string;
  atk: string;
  pdef: string;
  mdef: string;
  weapon: string;
  armor1: string;
  armor2: string;
  armor3: string;
  armor4: string;
  attack: string;
  skill: string;
  guard: string;
  item: string;
  equip: string;
}

/** RPG::System::TestBattler */
export interface RpgTestBattler {
  actor_id: number;
  level: number;
  weapon_id: number;
  armor1_id: number;
  armor2_id: number;
  armor3_id: number;
  armor4_id: number;
}

/** RPG::System — stored in System.rxdata */
export interface RpgSystemData {
  magic_number: number;
  party_members: number[];
  elements: string[];
  switches: string[];
  variables: string[];
  windowskin_name: string;
  title_name: string;
  gameover_name: string;
  battle_transition: string;
  title_bgm: RpgAudioFile;
  battle_bgm: RpgAudioFile;
  battle_end_me: RpgAudioFile;
  gameover_me: RpgAudioFile;
  cursor_se: RpgAudioFile;
  decision_se: RpgAudioFile;
  cancel_se: RpgAudioFile;
  buzzer_se: RpgAudioFile;
  equip_se: RpgAudioFile;
  shop_se: RpgAudioFile;
  save_se: RpgAudioFile;
  load_se: RpgAudioFile;
  battle_start_se: RpgAudioFile;
  escape_se: RpgAudioFile;
  actor_collapse_se: RpgAudioFile;
  enemy_collapse_se: RpgAudioFile;
  words: RpgSystemWords;
  start_map_id: number;
  start_x: number;
  start_y: number;
  test_battlers: RpgTestBattler[];
  test_troop_id: number;
  battleback_name: string;
  battler_name: string;
  battler_hue: number;
  edit_map_id: number;
}

// ── Map (matches backend RpgMap) ────────────────────────────────

/** RPG::Map — stored in MapXXX.rxdata */
export interface RpgMapData {
  __class: "RPG::Map";
  tileset_id: number;
  width: number;
  height: number;
  autoplay_bgm: boolean;
  bgm: RpgAudioFile;
  autoplay_bgs: boolean;
  bgs: RpgAudioFile;
  encounter_list: number[];
  encounter_step: number;
  data: RpgTable;
  events: Record<string, unknown>; // event_id → RPG::Event object
}

/** RPG::MapInfo — stored in MapInfos.rxdata hash */
export interface RpgMapInfo {
  __class: "RPG::MapInfo";
  name: string;
  parent_id: number;
  order: number;
  expanded: boolean;
  scroll_x: number;
  scroll_y: number;
}

// ── Database file mapping ───────────────────────────────────────

/** Maps .rxdata filenames to their contained types */
export type DatabaseFiles = {
  "Actors.rxdata": RpgActor;
  "Animations.rxdata": RpgAnimation;
  "Armors.rxdata": RpgArmor;
  "Classes.rxdata": RpgClass;
  "CommonEvents.rxdata": RpgCommonEvent;
  "Enemies.rxdata": RpgEnemy;
  "Items.rxdata": RpgItem;
  "Skills.rxdata": RpgSkill;
  "States.rxdata": RpgState;
  "Tilesets.rxdata": RpgTileset;
  "Troops.rxdata": RpgTroop;
  "Weapons.rxdata": RpgWeapon;
};

/** All valid database filenames */
export type DatabaseFilename = keyof DatabaseFiles;
