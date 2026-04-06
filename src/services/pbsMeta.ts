/**
 * PBS field metadata table.
 *
 * Maps (pbsFilename, fieldKey) → FieldMeta describing what kind of
 * widget to render and how to resolve cross-references and asset paths.
 *
 * Based on Pokémon Essentials v21.1 PBS file format.
 */
import type { FieldMeta } from "../types/pbsTypes";

type FileMeta = Record<string, FieldMeta>;

export const PBS_FIELD_META: Record<string, FileMeta> = {
  "pokemon.txt": {
    // Cross-refs to other PBS files
    "Types":           { type: "refList", refFile: "types.txt" },
    "Abilities":       { type: "refList", refFile: "abilities.txt" },
    "HiddenAbilities": { type: "refList", refFile: "abilities.txt" },
    "TutorMoves":      { type: "refList", refFile: "moves.txt" },
    "EggMoves":        { type: "refList", refFile: "moves.txt" },
    "Moves":           { type: "moveList", refFile: "moves.txt" },
    "Evolutions":      { type: "text" }, // complex format: SPECIES,Method,Param
    "WildItemCommon":  { type: "ref",  refFile: "items.txt" },
    "WildItemUncommon":{ type: "ref",  refFile: "items.txt" },
    "WildItemRare":    { type: "ref",  refFile: "items.txt" },
    // Stats
    "BaseStats":       { type: "statList" },
    "EVs":             { type: "statList" },
    // Numbers
    "GenderRate":      { type: "number" },
    "GrowthRate":      { type: "text" },
    "BaseEXP":         { type: "number" },
    "CatchRate":       { type: "number" },
    "Happiness":       { type: "number" },
    "StepsToHatch":    { type: "number" },
    "Height":          { type: "number" },
    "Weight":          { type: "number" },
    "Color":           { type: "text" },
    "Shape":           { type: "number" },
    "Habitat":         { type: "text" },
    "Generation":      { type: "number" },
    // Assets derived from section header
    "BattlerPlayerX":  { type: "number" },
    "BattlerPlayerY":  { type: "number" },
    "BattlerEnemyX":   { type: "number" },
    "BattlerEnemyY":   { type: "number" },
    "BattlerAltitude": { type: "number" },
    "BattlerShadowX":  { type: "number" },
    "BattlerShadowSize":{ type: "number" },
  },

  "pokemon_forms.txt": {
    "Types":           { type: "refList", refFile: "types.txt" },
    "Abilities":       { type: "refList", refFile: "abilities.txt" },
    "HiddenAbilities": { type: "refList", refFile: "abilities.txt" },
    "TutorMoves":      { type: "refList", refFile: "moves.txt" },
    "EggMoves":        { type: "refList", refFile: "moves.txt" },
    "Moves":           { type: "moveList", refFile: "moves.txt" },
    "BaseStats":       { type: "statList" },
    "EVs":             { type: "statList" },
    "MegaStone":       { type: "ref", refFile: "items.txt" },
    "UnmegaForm":      { type: "number" },
    "MegaMessage":     { type: "number" },
  },

  "moves.txt": {
    "Type":         { type: "ref", refFile: "types.txt" },
    "Category":     { type: "text" },
    "Power":        { type: "number" },
    "Accuracy":     { type: "number" },
    "TotalPP":      { type: "number" },
    "Target":       { type: "text" },
    "Priority":     { type: "number" },
    "FunctionCode": { type: "text" },
    "Flags":        { type: "csv" },
    "EffectChance": { type: "number" },
  },

  "abilities.txt": {
    "Name":         { type: "text" },
    "Description":  { type: "text" },
    "Flags":        { type: "csv" },
  },

  "types.txt": {
    "Name":         { type: "text" },
    "IsSpecialType":{ type: "text" },
    "IsPseudoType": { type: "text" },
    "Weaknesses":   { type: "refList", refFile: "types.txt" },
    "Resistances":  { type: "refList", refFile: "types.txt" },
    "Immunities":   { type: "refList", refFile: "types.txt" },
  },

  "items.txt": {
    "Name":         { type: "text" },
    "NamePlural":   { type: "text" },
    "Pocket":       { type: "number" },
    "Price":        { type: "number" },
    "SellPrice":    { type: "number" },
    "FieldUse":     { type: "text" },
    "BattleUse":    { type: "text" },
    "Flags":        { type: "csv" },
    "Description":  { type: "text" },
  },

  "trainers.txt": {
    "Items":        { type: "refList", refFile: "items.txt" },
    "Pokemon":      { type: "text" },  // SPECIES,level — complex
    "Moves":        { type: "refList", refFile: "moves.txt" },
    "Item":         { type: "ref",    refFile: "items.txt" },
    "Ball":         { type: "ref",    refFile: "items.txt" },
  },

  "trainer_types.txt": {
    "Name":         { type: "text" },
    "Gender":       { type: "text" },
    "BaseMoney":    { type: "number" },
    "BGM":          { type: "text" },
    "VictoryBGM":   { type: "text" },
    "IntroME":      { type: "text" },
    "Flags":        { type: "csv" },
  },

  "encounters.txt": {
    "Altitude":     { type: "number" },
    "Land":         { type: "text" },
    "LandMorning":  { type: "text" },
    "LandDay":      { type: "text" },
    "LandNight":    { type: "text" },
    "LandCave":     { type: "text" },
    "Water":        { type: "text" },
    "WaterNight":   { type: "text" },
    "OldRod":       { type: "text" },
    "GoodRod":      { type: "text" },
    "SuperRod":     { type: "text" },
    "RockSmash":    { type: "text" },
    "Cave":         { type: "text" },
    "HeadbuttLow":  { type: "text" },
    "HeadbuttHigh": { type: "text" },
  },

  "metadata.txt": {
    "Home":              { type: "text" },
    "WildBattleBGM":     { type: "assetAudio", assetDir: "Audio/BGM", assetSuffix: ".ogg" },
    "TrainerBattleBGM":  { type: "assetAudio", assetDir: "Audio/BGM", assetSuffix: ".ogg" },
    "WildVictoryME":     { type: "assetAudio", assetDir: "Audio/ME",  assetSuffix: ".ogg" },
    "TrainerVictoryME":  { type: "assetAudio", assetDir: "Audio/ME",  assetSuffix: ".ogg" },
    "SurfBGM":           { type: "assetAudio", assetDir: "Audio/BGM", assetSuffix: ".ogg" },
    "BicycleBGM":        { type: "assetAudio", assetDir: "Audio/BGM", assetSuffix: ".ogg" },
    "StorageCreator":    { type: "text" },
    "PlayerA":           { type: "text" },
    "PlayerB":           { type: "text" },
  },

  "map_metadata.txt": {
    "Outdoor":           { type: "text" },
    "ShowArea":          { type: "text" },
    "Bicycle":           { type: "text" },
    "BicycleAlways":     { type: "text" },
    "HealingSpot":       { type: "text" },
    "Weather":           { type: "text" },
    "MapPosition":       { type: "text" },
    "DiveMap":           { type: "number" },
    "DarkMap":           { type: "text" },
    "SafariMap":         { type: "text" },
    "SnapEdges":         { type: "text" },
    "Dungeon":           { type: "text" },
    "BattleBack":        { type: "asset", assetDir: "Graphics/Battlebacks", assetSuffix: ".png" },
    "WildBattleBGM":     { type: "assetAudio", assetDir: "Audio/BGM", assetSuffix: ".ogg" },
    "TrainerBattleBGM":  { type: "assetAudio", assetDir: "Audio/BGM", assetSuffix: ".ogg" },
  },
};

/** Get field metadata for a given file and key. Falls back to "text" if unknown. */
export function getFieldMeta(filename: string, key: string): FieldMeta {
  return PBS_FIELD_META[filename]?.[key] ?? { type: "text" };
}

/** Files where the section header is the Pokémon internal name — show sprite + cry */
export const POKEMON_SPRITE_FILES = new Set(["pokemon.txt", "pokemon_forms.txt"]);

/** Files where the section header maps to a trainer sprite */
export const TRAINER_SPRITE_FILES = new Set(["trainer_types.txt"]);

/** Files where the section header maps to an item icon */
export const ITEM_ICON_FILES = new Set(["items.txt"]);
