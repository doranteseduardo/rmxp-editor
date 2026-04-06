/**
 * Unified entity types for the PBS entity-based editor.
 * Each type merges data from one or more raw PBS files.
 * The raw PbsSection/PbsField wire format is defined in pbsTypes.ts.
 */

// ── Shared ────────────────────────────────────────────────────────────────────

/** PE v21.1 stat order in CSV: HP, Atk, Def, Spe, SpAtk, SpDef */
export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spe: number;  // Speed — 4th in PE CSV order
  spa: number;  // Sp. Atk — 5th
  spd: number;  // Sp. Def — 6th
}

// ── Pokémon ───────────────────────────────────────────────────────────────────

export interface LearnMove {
  level: number;
  move: string;
}

export interface Evolution {
  species: string;
  method: string;
  parameter: string;
}

export interface PokemonMetrics {
  frontSpriteOffset: [number, number]; // x, y
  backSpriteOffset: [number, number];
  shadowX: number;
  shadowSize: number; // 0=XS 1=S 2=M 3=L 4=XL
}

export interface PokemonForm {
  formName: string;
  type1: string;
  type2?: string;
  baseStats?: BaseStats;
  abilities?: string[];
  hiddenAbility?: string;
  height?: number;
  weight?: number;
  moves?: LearnMove[];
  evolutions?: Evolution[];
  megaStone?: string;   // item ID for Mega Stone
  pokedex?: string;     // form-specific Pokédex entry
  color?: string;
  generation?: number;
}

export interface PokemonEntry {
  id: string;           // internal name e.g. BULBASAUR
  name: string;
  type1: string;
  type2?: string;
  baseStats: BaseStats;
  evYield: string;      // raw PBS "STAT_NAME,n[,STAT_NAME,n]" e.g. "SPECIAL_ATTACK,1"
  abilities: string[];
  hiddenAbility?: string;
  genderRatio: string;  // AlwaysMale | AlwaysFemale | FemaleOneEighth | etc.
  catchRate: number;
  happiness: number;
  expYield: number;
  growthRate: string;   // Medium | Slow | Fast | MediumSlow | Parabolic | Fluctuating | Erratic
  eggGroups: string[];
  hatchSteps: number;
  height: number;       // in meters as float (e.g. 0.7)
  weight: number;       // in kg as float (e.g. 6.9)
  moves: LearnMove[];
  tutorMoves: string[];
  eggMoves: string[];
  evolutions: Evolution[];
  color: string;
  shape: string;        // e.g. "Quadruped", "BipedalTail", etc.
  habitat?: string;
  category?: string;    // Pokédex category e.g. "Seed", "Lizard"
  pokedex?: string;     // Pokédex entry text
  generation?: number;
  flags?: string[];
  wildItems?: { common?: string; uncommon?: string; rare?: string };
  incense?: string;     // item ID required for this species to appear as an egg
  offspring?: string[]; // forced egg species IDs
  forms: PokemonForm[];
  metrics?: PokemonMetrics;
}

// ── Moves ─────────────────────────────────────────────────────────────────────

export interface MoveEntry {
  id: string;
  name: string;
  type: string;
  category: string;     // Physical | Special | Status
  power: number;
  accuracy: number;
  pp: number;
  target: string;
  priority: number;
  functionCode: string;
  effectChance: number; // secondary effect probability 0–100 (0 = none)
  flags: string[];
  description: string;
}

// ── Abilities ─────────────────────────────────────────────────────────────────

export interface AbilityEntry {
  id: string;
  name: string;
  description: string;
  flags: string[];
}

// ── Items ─────────────────────────────────────────────────────────────────────

export interface ItemEntry {
  id: string;
  name: string;
  namePlural: string;
  pocket: number;        // 1=Items 2=Medicine 3=PokéBalls 4=TMs 5=Berries 6=Mail 7=BattleItems 8=KeyItems
  price: number;
  sellPrice?: number;    // defaults to half of price
  bpPrice?: number;      // Battle Points cost
  fieldUse?: string;     // OnPokemon | Direct | TwoHandler | None
  battleUse?: string;    // OnPokemon | OnMove | OnBattler | None
  consumable?: boolean;  // false for infinite-use items (Flutes etc.)
  move?: string;         // move ID for TMs/HMs/TRs
  description: string;
  flags: string[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TypeEntry {
  id: string;
  name: string;
  iconPosition: number;   // row index in type icon sprite sheet
  isSpecial: boolean;     // Gen3 only (MOVE_CATEGORY_PER_MOVE=false)
  isPseudoType?: boolean; // e.g. "???" type
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
  flags?: string[];
  color: string;          // display hex color, derived from a fixed palette
}

// ── Trainers ──────────────────────────────────────────────────────────────────

export interface TrainerPokemon {
  species: string;
  level: number;
  moves: string[];        // up to 4
  heldItem?: string;
  ability?: string;       // ability ID (takes priority over abilityIndex)
  abilityIndex?: number;  // 0=first natural, 1=second natural, 2+=hidden
  gender?: string;        // male | female
  ivs?: BaseStats;
  evs?: BaseStats;
  nature?: string;
  form?: number;
  happiness?: number;
  shiny?: boolean;
  superShiny?: boolean;
  nickname?: string;      // custom nickname, up to 10 chars
  ball?: string;          // Poké Ball item ID
  shadow?: boolean;       // Shadow Pokémon
}

export interface TrainerEntry {
  id: string;             // composite: "TYPE,Name,version" — unique key
  trainerType: string;
  name: string;
  version: number;
  loseText: string;
  items: string[];
  team: TrainerPokemon[];
}

export interface TrainerTypeEntry {
  id: string;
  name: string;
  gender: string;         // Male | Female | Unknown
  baseMoney: number;
  skillLevel: number;
  battleBGM?: string;
  victoryBGM?: string;    // was victorySE — wiki says VictoryBGM
  introBGM?: string;      // was introSE — wiki says IntroBGM
  maxSize?: number;
  flags?: string[];       // AI flags
}

// ── Encounters ────────────────────────────────────────────────────────────────

export interface EncounterSlot {
  probability: number;
  species: string;
  minLevel: number;
  maxLevel: number;
}

export interface EncounterTable {
  type: string;   // Land|LandMorning|LandDay|LandNight|LandDusk|Water|Cave|CaveNight|OldRod|GoodRod|SuperRod|PokeRadar|BugContest|HeadbuttLow|HeadbuttHigh|RockSmash
  density?: number; // some tables (OldRod etc.) have no density
  slots: EncounterSlot[];
}

export interface EncounterEntry {
  mapId: number;
  mapVersion?: number;    // [mapId,version] sub-areas
  mapName: string;        // resolved from map list, or "Map {id}" if unknown
  tables: EncounterTable[];
}

// ── World (Map Metadata) ───────────────────────────────────────────────────────

export interface BattleBack {
  ground?: string;
  sky?: string;
}

export interface MapMetaEntry {
  mapId: number;
  mapName: string;          // from map list
  outdoor: boolean;
  showArea: boolean;
  canBicycle: boolean;
  bicycleAlways?: boolean;  // cycling always allowed (overrides outdoor restriction)
  bicycleBridge?: boolean;  // cycling only on bridge tiles
  canFly: boolean;
  canDigEscape: boolean;
  healingSpot?: [number, number, number]; // [mapId, x, y] — Poké Center teleport destination
  weather?: string;
  weatherChance?: number;
  environment?: string;     // None|Grass|TallGrass|Rock|Cave|Sand|Underwater|Snow|Ice|Volcano|Sky
  mapPosition?: [number, number]; // region map pin (x, y)
  mapSize?: [number, number];     // width, height for connection display
  battleBacks?: BattleBack;
  defaultFlyTo?: number;
  parent?: number;
  safariBattle?: boolean;
  darkMap?: boolean;
  mapFlags?: string[];      // DisableBoxLink | HideEncountersInPokedex | MossRock | etc.
}

// ── Global Metadata ───────────────────────────────────────────────────────────

export interface PlayerChar {
  trainerType: string;
  walkCharset: string;
  runCharset?: string;
  cycleCharset?: string;
  surfCharset?: string;
  diveCharset?: string;
  fishCharset?: string;
  surfFishCharset?: string;
  home?: [number, number, number, string]; // [mapId, x, y, direction] override
}

export interface MetadataEntry {
  startingMap: number;
  startingX: number;
  startingY: number;
  startingDirection: string;  // Up | Down | Left | Right (or numeric)
  startMoney?: number;
  startItemStorage?: string[];
  storageCreator?: string;
  regionMaps: string[];
  townMapBitmap?: string;
  wildBattleBGM?: string;
  trainerBattleBGM?: string;
  wildVictoryBGM?: string;
  trainerVictoryBGM?: string;
  wildCaptureME?: string;
  surfBGM?: string;
  bicycleBGM?: string;
  playerChars: PlayerChar[];
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

export interface AllEntities {
  pokemon: PokemonEntry[];
  moves: MoveEntry[];
  abilities: AbilityEntry[];
  items: ItemEntry[];
  types: TypeEntry[];
  trainers: TrainerEntry[];
  trainerTypes: TrainerTypeEntry[];
  encounters: EncounterEntry[];
  mapMeta: MapMetaEntry[];
  metadata: MetadataEntry;
}
