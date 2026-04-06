/**
 * PBS Unified Loader — merges raw PbsSection[] from PBS files into typed entities.
 * Handles PE v21.1 actual field names and formats.
 */
import { loadPbsFile, readRawPbsFile } from "./tauriApi";
import type { PbsSection, PbsField } from "../types/pbsTypes";
import type {
  PokemonEntry, MoveEntry, AbilityEntry, ItemEntry, TypeEntry,
  TrainerEntry, TrainerTypeEntry, EncounterEntry,
  MapMetaEntry, MetadataEntry, PlayerChar,
  BaseStats, LearnMove, Evolution, PokemonForm, TrainerPokemon, EncounterTable,
} from "../types/pbsEntityTypes";

// ── Field helpers ─────────────────────────────────────────────────────────────

function field(fields: PbsField[], key: string): string {
  return fields.find((f) => f.key === key)?.value ?? "";
}

function fieldOr(fields: PbsField[], key: string, fallback: string): string {
  return fields.find((f) => f.key === key)?.value ?? fallback;
}

function fieldNum(fields: PbsField[], key: string, fallback = 0): number {
  const v = fields.find((f) => f.key === key)?.value;
  if (!v) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function fieldBool(fields: PbsField[], key: string): boolean {
  const v = (fields.find((f) => f.key === key)?.value ?? "").toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

function fieldList(fields: PbsField[], key: string): string[] {
  const v = field(fields, key);
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

// ── Parse helpers (exported for use in distributor) ───────────────────────────

/**
 * PE v21.1 BaseStats order: HP, Atk, Def, Speed, SpAtk, SpDef
 */
export function parseBaseStats(csv: string): BaseStats {
  const p = csv.split(",").map((s) => parseInt(s.trim(), 10));
  return {
    hp:  p[0] ?? 0,
    atk: p[1] ?? 0,
    def: p[2] ?? 0,
    spe: p[3] ?? 0,  // Speed is 4th in PE
    spa: p[4] ?? 0,  // SpAtk is 5th
    spd: p[5] ?? 0,  // SpDef is 6th
  };
}

export function serializeBaseStats(s: BaseStats): string {
  // Write in PE order: HP, Atk, Def, Spe, SpAtk, SpDef
  return `${s.hp},${s.atk},${s.def},${s.spe},${s.spa},${s.spd}`;
}

/** Parse "level,MOVE,level,MOVE,..." learnset */
export function parseMoves(raw: string): LearnMove[] {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const moves: LearnMove[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const level = parseInt(parts[i], 10);
    if (!isNaN(level)) moves.push({ level, move: parts[i + 1] });
  }
  return moves;
}

export function serializeMoves(moves: LearnMove[]): string {
  return moves.map((m) => `${m.level},${m.move}`).join(",");
}

/** Parse "SPECIES,Method,Param,..." evolution string */
export function parseEvolutions(raw: string): Evolution[] {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const evolutions: Evolution[] = [];
  for (let i = 0; i + 2 < parts.length; i += 3) {
    evolutions.push({ species: parts[i], method: parts[i + 1], parameter: parts[i + 2] });
  }
  return evolutions;
}

export function serializeEvolutions(evolutions: Evolution[]): string {
  return evolutions.map((e) => `${e.species},${e.method},${e.parameter}`).join(",");
}

/** Parse trainer header "TYPE,Name[,Version]" */
export function parseTrainerHeader(header: string): { type: string; name: string; version: number } {
  const parts = header.split(",").map((p) => p.trim());
  return {
    type: parts[0] ?? "",
    name: parts[1] ?? "",
    version: parts[2] ? parseInt(parts[2], 10) : 0,
  };
}

export function serializeTrainerHeader(type: string, name: string, version: number): string {
  return version > 0 ? `${type},${name},${version}` : `${type},${name}`;
}

/**
 * Parse trainer team from section fields.
 * PE v21.1 uses multiple `Pokemon = SPECIES,LEVEL` fields with following property fields.
 * The Rust parser stores all `key=value` lines including duplicates in order.
 */
export function parseTrainerTeam(fields: PbsField[]): TrainerPokemon[] {
  const team: TrainerPokemon[] = [];
  let current: TrainerPokemon | null = null;

  // Trainer-level field keys to skip when grouping pokemon properties
  const TRAINER_KEYS = new Set(["LoseText", "Items", "DoubleBattle", "AILevel", "BattlerAlly"]);

  for (const f of fields) {
    if (f.key === "Pokemon") {
      if (current) team.push(current);
      const [species, levelStr] = f.value.split(",").map((s) => s.trim());
      current = { species: species ?? "", level: parseInt(levelStr ?? "1", 10), moves: [] };
    } else if (current && !TRAINER_KEYS.has(f.key)) {
      switch (f.key) {
        case "Moves":
          current.moves = f.value.split(",").map((s) => s.trim()).filter(Boolean);
          break;
        case "Item":
          current.heldItem = f.value;
          break;
        case "AbilityIndex":
          current.abilityIndex = parseInt(f.value, 10);
          break;
        case "Ability":
          current.ability = f.value;
          break;
        case "Gender":
          current.gender = f.value;
          break;
        case "Nature":
          current.nature = f.value;
          break;
        case "Form":
          current.form = parseInt(f.value, 10);
          break;
        case "Happiness":
          current.happiness = parseInt(f.value, 10);
          break;
        case "Shiny":
          current.shiny = f.value.toLowerCase() === "yes" || f.value.toLowerCase() === "true";
          break;
        case "SuperShiny":
          current.superShiny = f.value.toLowerCase() === "yes" || f.value.toLowerCase() === "true";
          break;
        case "Name":
          current.nickname = f.value;
          break;
        case "Ball":
          current.ball = f.value;
          break;
        case "Shadow":
          current.shadow = f.value.toLowerCase() === "yes" || f.value.toLowerCase() === "true";
          break;
        case "IV":
          current.ivs = parseBaseStats(f.value);
          break;
        case "EV":
          current.evs = parseBaseStats(f.value);
          break;
      }
    }
  }
  if (current) team.push(current);
  return team;
}

// ── Encounters raw parser ─────────────────────────────────────────────────────

/**
 * Parse PE v21.1 encounters.txt raw format.
 * Format:
 *   [MapID] # optional comment          — or [MapID,Version]
 *   EncounterType[,density]             — density is optional
 *       probability,SPECIES,minLevel[,maxLevel]
 */
export function parseEncountersRaw(text: string): EncounterEntry[] {
  const entries: EncounterEntry[] = [];
  let current: EncounterEntry | null = null;
  let currentTable: EncounterTable | null = null;

  const ENCOUNTER_TYPES = new Set([
    "Land", "LandMorning", "LandDay", "LandAfternoon", "LandEvening", "LandNight", "LandDusk",
    "Water", "Cave", "CaveNight",
    "OldRod", "GoodRod", "SuperRod",
    "BugContest", "RockSmash",
    "Headbutt", "HeadbuttLow", "HeadbuttHigh",
    "PokeRadar",
    "Swarm", "SwarmMorning", "SwarmDay", "SwarmNight",
  ]);

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    // Section header: [MapID] or [MapID,Version]
    const headerMatch = trimmed.match(/^\[(\d+)(?:,(\d+))?\]/);
    if (headerMatch) {
      if (currentTable && current) current.tables.push(currentTable);
      if (current) entries.push(current);
      currentTable = null;
      const mapId = parseInt(headerMatch[1], 10);
      const mapVersion = headerMatch[2] ? parseInt(headerMatch[2], 10) : undefined;
      current = { mapId, mapVersion, mapName: `Map ${mapId}`, tables: [] };
      continue;
    }

    if (!current) continue;

    const isIndented = rawLine.startsWith(" ") || rawLine.startsWith("\t");
    if (!isIndented) {
      if (currentTable) current.tables.push(currentTable);
      currentTable = null;

      // Type line — "TypeName" or "TypeName,density"
      const parts = trimmed.split(",");
      const typeName = parts[0].trim();
      const density = parts[1] ? parseInt(parts[1].trim(), 10) : undefined;
      if (ENCOUNTER_TYPES.has(typeName)) {
        currentTable = { type: typeName, density, slots: [] };
      }
      continue;
    }

    // Indented slot line
    if (currentTable) {
      const parts = trimmed.split(",").map((p) => p.trim());
      const prob = parseInt(parts[0] ?? "0", 10);
      const species = parts[1] ?? "";
      const minLevel = parseInt(parts[2] ?? "1", 10);
      const maxLevel = parseInt(parts[3] ?? parts[2] ?? "1", 10);
      if (species && !isNaN(prob)) {
        currentTable.slots.push({ probability: prob, species, minLevel, maxLevel });
      }
    }
  }

  if (currentTable && current) current.tables.push(currentTable);
  if (current) entries.push(current);

  return entries;
}

// ── Loaders ───────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  NORMAL:   "#A8A878", FIRE:     "#F08030", WATER:    "#6890F0",
  ELECTRIC: "#F8D030", GRASS:    "#78C850", ICE:      "#98D8D8",
  FIGHTING: "#C03028", POISON:   "#A040A0", GROUND:   "#E0C068",
  FLYING:   "#A890F0", PSYCHIC:  "#F85888", BUG:      "#A8B820",
  ROCK:     "#B8A038", GHOST:    "#705898", DRAGON:   "#7038F8",
  DARK:     "#705848", STEEL:    "#B8B8D0", FAIRY:    "#EE99AC",
};

/** Load pokemon.txt + pokemon_forms.txt + pokemon_metrics.txt → PokemonEntry[] */
export async function loadPokemon(projectPath: string): Promise<PokemonEntry[]> {
  const [baseSections, formSections, metricSections] = await Promise.all([
    loadPbsFile(projectPath, "pokemon.txt").catch(() => [] as PbsSection[]),
    loadPbsFile(projectPath, "pokemon_forms.txt").catch(() => [] as PbsSection[]),
    loadPbsFile(projectPath, "pokemon_metrics.txt").catch(() => [] as PbsSection[]),
  ]);

  // Build form map: SPECIES -> form list
  const formMap = new Map<string, PokemonForm[]>();
  for (const sec of formSections) {
    const [speciesId] = sec.header.split(",").map((s) => s.trim());
    if (!speciesId) continue;
    const typesRaw = field(sec.fields, "Types");
    const types = typesRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const form: PokemonForm = {
      formName: fieldOr(sec.fields, "FormName", `Form ${sec.header.split(",")[1] ?? "0"}`),
      type1: types[0] ?? "NORMAL",
      type2: types[1] || undefined,
      megaStone: field(sec.fields, "MegaStone") || undefined,
      pokedex: field(sec.fields, "Pokedex") || undefined,
      color: field(sec.fields, "Color") || undefined,
      generation: field(sec.fields, "Generation") ? parseInt(field(sec.fields, "Generation"), 10) : undefined,
    };
    const statsRaw = field(sec.fields, "BaseStats");
    if (statsRaw) form.baseStats = parseBaseStats(statsRaw);
    const abilitiesRaw = field(sec.fields, "Abilities");
    if (abilitiesRaw) form.abilities = abilitiesRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const hiddenRaw = field(sec.fields, "HiddenAbilities");
    if (hiddenRaw) form.hiddenAbility = hiddenRaw;
    const heightRaw = field(sec.fields, "Height");
    if (heightRaw) form.height = parseFloat(heightRaw);
    const weightRaw = field(sec.fields, "Weight");
    if (weightRaw) form.weight = parseFloat(weightRaw);
    const movesRaw = field(sec.fields, "Moves");
    if (movesRaw) form.moves = parseMoves(movesRaw);
    const evoRaw = field(sec.fields, "Evolutions");
    if (evoRaw) form.evolutions = parseEvolutions(evoRaw);
    if (!formMap.has(speciesId)) formMap.set(speciesId, []);
    formMap.get(speciesId)!.push(form);
  }

  // Build metrics map
  const metricsMap = new Map<string, PokemonEntry["metrics"]>();
  for (const sec of metricSections) {
    const [speciesId] = sec.header.split(",").map((s) => s.trim());
    if (!speciesId) continue;
    const foParts = fieldOr(sec.fields, "FrontSprite", "0,0").split(",").map((s) => parseInt(s.trim(), 10));
    const boParts = fieldOr(sec.fields, "BackSprite", "0,0").split(",").map((s) => parseInt(s.trim(), 10));
    metricsMap.set(speciesId, {
      frontSpriteOffset: [foParts[0] ?? 0, foParts[1] ?? 0],
      backSpriteOffset:  [boParts[0] ?? 0, boParts[1] ?? 0],
      shadowX:    parseInt(fieldOr(sec.fields, "ShadowX", "0"), 10),
      shadowSize: parseInt(fieldOr(sec.fields, "ShadowSize", "2"), 10),
    });
  }

  const entries: PokemonEntry[] = [];
  for (const sec of baseSections) {
    const id = sec.header;
    const typesRaw = field(sec.fields, "Types");
    const types = typesRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const statsRaw = field(sec.fields, "BaseStats");

    // Wild items
    const wildCommon = field(sec.fields, "WildItemCommon");
    const wildUncommon = field(sec.fields, "WildItemUncommon");
    const wildRare = field(sec.fields, "WildItemRare");
    const wildItems = (wildCommon || wildUncommon || wildRare)
      ? { common: wildCommon || undefined, uncommon: wildUncommon || undefined, rare: wildRare || undefined }
      : undefined;

    entries.push({
      id,
      name: fieldOr(sec.fields, "Name", id),
      type1: types[0] ?? "NORMAL",
      type2: types[1] || undefined,
      baseStats: statsRaw ? parseBaseStats(statsRaw) : { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 },
      evYield: field(sec.fields, "EVs"),
      abilities: fieldList(sec.fields, "Abilities"),
      hiddenAbility: field(sec.fields, "HiddenAbilities") || undefined,
      genderRatio: fieldOr(sec.fields, "GenderRatio", "FemaleOneEighth"),
      catchRate: parseInt(fieldOr(sec.fields, "CatchRate", "45"), 10),
      happiness: parseInt(fieldOr(sec.fields, "Happiness", "70"), 10),
      expYield: parseInt(fieldOr(sec.fields, "BaseExp", "64"), 10),
      growthRate: fieldOr(sec.fields, "GrowthRate", "Medium"),
      eggGroups: fieldList(sec.fields, "EggGroups"),
      hatchSteps: parseInt(fieldOr(sec.fields, "HatchSteps", "1"), 10),
      height: parseFloat(fieldOr(sec.fields, "Height", "0.1")),
      weight: parseFloat(fieldOr(sec.fields, "Weight", "0.1")),
      moves: parseMoves(field(sec.fields, "Moves")),
      tutorMoves: fieldList(sec.fields, "TutorMoves"),
      eggMoves: fieldList(sec.fields, "EggMoves"),
      evolutions: parseEvolutions(field(sec.fields, "Evolutions")),
      color: fieldOr(sec.fields, "Color", "Red"),
      shape: fieldOr(sec.fields, "Shape", "Quadruped"),
      habitat: field(sec.fields, "Habitat") || undefined,
      category: field(sec.fields, "Category") || undefined,
      pokedex: field(sec.fields, "Pokedex") || undefined,
      generation: field(sec.fields, "Generation") ? parseInt(field(sec.fields, "Generation"), 10) : undefined,
      flags: fieldList(sec.fields, "Flags"),
      wildItems,
      incense: field(sec.fields, "Incense") || undefined,
      offspring: fieldList(sec.fields, "Offspring").length ? fieldList(sec.fields, "Offspring") : undefined,
      forms: formMap.get(id) ?? [],
      metrics: metricsMap.get(id),
    });
  }
  return entries;
}

/** Load moves.txt → MoveEntry[] */
export async function loadMoves(projectPath: string): Promise<MoveEntry[]> {
  const sections = await loadPbsFile(projectPath, "moves.txt").catch(() => [] as PbsSection[]);
  return sections.map((sec) => ({
    id: sec.header,
    name: fieldOr(sec.fields, "Name", sec.header),
    type: fieldOr(sec.fields, "Type", "NORMAL"),
    category: fieldOr(sec.fields, "Category", "Physical"),
    power: parseInt(fieldOr(sec.fields, "Power", "0"), 10),
    accuracy: parseInt(fieldOr(sec.fields, "Accuracy", "100"), 10),
    pp: parseInt(fieldOr(sec.fields, "TotalPP", "5"), 10),
    target: fieldOr(sec.fields, "Target", "NearOther"),
    priority: parseInt(fieldOr(sec.fields, "Priority", "0"), 10),
    functionCode: fieldOr(sec.fields, "FunctionCode", "None"),
    effectChance: parseInt(fieldOr(sec.fields, "EffectChance", "0"), 10),
    flags: fieldList(sec.fields, "Flags"),
    description: fieldOr(sec.fields, "Description", ""),
  }));
}

/** Load abilities.txt → AbilityEntry[] */
export async function loadAbilities(projectPath: string): Promise<AbilityEntry[]> {
  const sections = await loadPbsFile(projectPath, "abilities.txt").catch(() => [] as PbsSection[]);
  return sections.map((sec) => ({
    id: sec.header,
    name: fieldOr(sec.fields, "Name", sec.header),
    description: fieldOr(sec.fields, "Description", ""),
    flags: fieldList(sec.fields, "Flags"),
  }));
}

/** Load items.txt → ItemEntry[] */
export async function loadItems(projectPath: string): Promise<ItemEntry[]> {
  const sections = await loadPbsFile(projectPath, "items.txt").catch(() => [] as PbsSection[]);
  return sections.map((sec) => {
    const price = parseInt(fieldOr(sec.fields, "Price", "0"), 10);
    const sellRaw = field(sec.fields, "SellPrice");
    const bpRaw = field(sec.fields, "BPPrice");
    const consumableRaw = field(sec.fields, "Consumable");
    return {
      id: sec.header,
      name: fieldOr(sec.fields, "Name", sec.header),
      namePlural: fieldOr(sec.fields, "NamePlural", fieldOr(sec.fields, "Name", sec.header)),
      pocket: parseInt(fieldOr(sec.fields, "Pocket", "1"), 10),
      price,
      sellPrice: sellRaw ? parseInt(sellRaw, 10) : undefined,
      bpPrice: bpRaw ? parseInt(bpRaw, 10) : undefined,
      fieldUse: field(sec.fields, "FieldUse") || undefined,
      battleUse: field(sec.fields, "BattleUse") || undefined,
      consumable: consumableRaw ? consumableRaw.toLowerCase() !== "false" : undefined,
      move: field(sec.fields, "Move") || undefined,
      description: fieldOr(sec.fields, "Description", ""),
      flags: fieldList(sec.fields, "Flags"),
    };
  });
}

/** Load types.txt → TypeEntry[] */
export async function loadTypes(projectPath: string): Promise<TypeEntry[]> {
  const sections = await loadPbsFile(projectPath, "types.txt").catch(() => [] as PbsSection[]);
  return sections.map((sec) => ({
    id: sec.header,
    name: fieldOr(sec.fields, "Name", sec.header),
    iconPosition: parseInt(fieldOr(sec.fields, "IconPosition", "0"), 10),
    isSpecial: fieldBool(sec.fields, "IsSpecialType"),
    isPseudoType: fieldBool(sec.fields, "IsPseudoType") || undefined,
    weaknesses: fieldList(sec.fields, "Weaknesses"),
    resistances: fieldList(sec.fields, "Resistances"),
    immunities: fieldList(sec.fields, "Immunities"),
    flags: fieldList(sec.fields, "Flags").length ? fieldList(sec.fields, "Flags") : undefined,
    color: TYPE_COLORS[sec.header] ?? "#888888",
  }));
}

/** Load trainers.txt + trainer_types.txt → { trainers, trainerTypes } */
export async function loadTrainers(projectPath: string): Promise<{
  trainers: TrainerEntry[];
  trainerTypes: TrainerTypeEntry[];
}> {
  const [trainerSections, typeSections] = await Promise.all([
    loadPbsFile(projectPath, "trainers.txt").catch(() => [] as PbsSection[]),
    loadPbsFile(projectPath, "trainer_types.txt").catch(() => [] as PbsSection[]),
  ]);

  const trainerTypes: TrainerTypeEntry[] = typeSections.map((sec) => ({
    id: sec.header,
    name: fieldOr(sec.fields, "Name", sec.header),
    gender: fieldOr(sec.fields, "Gender", "Unknown"),
    baseMoney: fieldNum(sec.fields, "BaseMoney", 30),
    skillLevel: fieldNum(sec.fields, "SkillLevel", 2),
    battleBGM: field(sec.fields, "BattleBGM") || undefined,
    victoryBGM: field(sec.fields, "VictoryBGM") || field(sec.fields, "VictorySE") || undefined,
    introBGM: field(sec.fields, "IntroBGM") || field(sec.fields, "IntroSE") || undefined,
    maxSize: field(sec.fields, "MaxSize") ? parseInt(field(sec.fields, "MaxSize"), 10) : undefined,
    flags: fieldList(sec.fields, "Flags").length ? fieldList(sec.fields, "Flags") : undefined,
  }));

  const trainers: TrainerEntry[] = trainerSections.map((sec) => {
    const { type, name, version } = parseTrainerHeader(sec.header);
    return {
      id: sec.header,
      trainerType: type,
      name,
      version,
      loseText: fieldOr(sec.fields, "LoseText", "..."),
      items: fieldList(sec.fields, "Items"),
      team: parseTrainerTeam(sec.fields),
    };
  });

  return { trainers, trainerTypes };
}

/** Load encounters.txt using raw parser → EncounterEntry[] */
export async function loadEncounters(
  projectPath: string,
  mapNames: Map<number, string>
): Promise<EncounterEntry[]> {
  const raw = await readRawPbsFile(projectPath, "encounters.txt").catch(() => "");
  const entries = parseEncountersRaw(raw);
  for (const e of entries) {
    const name = mapNames.get(e.mapId);
    if (name) e.mapName = name;
  }
  return entries;
}

/** Load map_metadata.txt → MapMetaEntry[] */
export async function loadMapMeta(
  projectPath: string,
  mapNames: Map<number, string>
): Promise<MapMetaEntry[]> {
  const sections = await loadPbsFile(projectPath, "map_metadata.txt").catch(() => [] as PbsSection[]);
  return sections.map((sec) => {
    const mapId = parseInt(sec.header, 10);

    // MapPosition = regionMapIndex,x,y  (3 values)
    const posRaw = field(sec.fields, "MapPosition");
    const posParts = posRaw ? posRaw.split(",").map((s) => parseInt(s.trim(), 10)) : null;
    const mapPos: [number, number] | undefined =
      posParts && posParts.length >= 3 ? [posParts[1], posParts[2]] : undefined;

    const sizeRaw = field(sec.fields, "MapSize");
    const sizeParts = sizeRaw ? sizeRaw.split(",").map((s) => parseInt(s.trim(), 10)) : null;
    const mapSize: [number, number] | undefined =
      sizeParts && sizeParts.length >= 2 ? [sizeParts[0], sizeParts[1]] : undefined;

    const battleback = field(sec.fields, "BattleBack");

    // HealingSpot = mapId,x,y
    const healRaw = field(sec.fields, "HealingSpot");
    const healParts = healRaw ? healRaw.split(",").map((s) => parseInt(s.trim(), 10)) : null;
    const healingSpot: [number, number, number] | undefined =
      healParts && healParts.length >= 3 ? [healParts[0], healParts[1], healParts[2]] : undefined;

    // Weather = type,chance  or just type
    const weatherRaw = field(sec.fields, "Weather");
    const weatherParts = weatherRaw ? weatherRaw.split(",") : [];

    // Flags
    const mapFlags = fieldList(sec.fields, "Flags");

    return {
      mapId,
      mapName: field(sec.fields, "Name") || mapNames.get(mapId) || `Map ${mapId}`,
      outdoor: fieldBool(sec.fields, "Outdoor"),
      showArea: fieldBool(sec.fields, "ShowArea"),
      canBicycle: fieldBool(sec.fields, "Bicycle"),
      bicycleAlways: fieldBool(sec.fields, "BicycleAlways") || undefined,
      bicycleBridge: fieldBool(sec.fields, "BicycleBridge") || undefined,
      canFly: fieldBool(sec.fields, "Fly"),
      canDigEscape: fieldBool(sec.fields, "Diving") || fieldBool(sec.fields, "DigEscape"),
      healingSpot,
      weather: weatherParts[0] || undefined,
      weatherChance: weatherParts[1] ? parseInt(weatherParts[1].trim(), 10) : undefined,
      environment: field(sec.fields, "Environment") || undefined,
      mapPosition: mapPos,
      mapSize,
      battleBacks: battleback ? { ground: battleback } : undefined,
      defaultFlyTo: field(sec.fields, "DefaultFlyTo") ? parseInt(field(sec.fields, "DefaultFlyTo"), 10) : undefined,
      parent: field(sec.fields, "Parent") ? parseInt(field(sec.fields, "Parent"), 10) : undefined,
      safariBattle: fieldBool(sec.fields, "SafariBattle") || undefined,
      darkMap: fieldBool(sec.fields, "DarkMap") || undefined,
      mapFlags: mapFlags.length ? mapFlags : undefined,
    };
  });
}

/**
 * Load metadata.txt → MetadataEntry
 * PE v21.1:
 *   [0] — global settings
 *   [1], [2], ... — player character definitions
 */
export async function loadMetadata(projectPath: string): Promise<MetadataEntry> {
  const sections = await loadPbsFile(projectPath, "metadata.txt").catch(() => [] as PbsSection[]);

  const globalSec = sections.find((s) => s.header === "0") ?? sections[0];
  const charSections = sections.filter((s) => s.header !== "0" && /^\d+$/.test(s.header));

  const empty: MetadataEntry = {
    startingMap: 1, startingX: 0, startingY: 0, startingDirection: "Down",
    playerChars: [], storageCreator: "", regionMaps: [],
  };
  if (!globalSec) return empty;

  // Home = mapId,x,y[,direction]
  const homeRaw = field(globalSec.fields, "Home");
  const homeParts = homeRaw ? homeRaw.split(",").map((s) => s.trim()) : [];

  // Player characters
  const playerChars: PlayerChar[] = charSections.map((s) => {
    const homeCharRaw = field(s.fields, "Home");
    const homeCharParts = homeCharRaw ? homeCharRaw.split(",").map((p) => p.trim()) : [];
    return {
      trainerType: field(s.fields, "TrainerType"),
      walkCharset: field(s.fields, "WalkCharset"),
      runCharset: field(s.fields, "RunCharset") || undefined,
      cycleCharset: field(s.fields, "CycleCharset") || undefined,
      surfCharset: field(s.fields, "SurfCharset") || undefined,
      diveCharset: field(s.fields, "DiveCharset") || undefined,
      fishCharset: field(s.fields, "FishCharset") || undefined,
      surfFishCharset: field(s.fields, "SurfFishCharset") || undefined,
      home: homeCharParts.length >= 3
        ? [parseInt(homeCharParts[0], 10), parseInt(homeCharParts[1], 10), parseInt(homeCharParts[2], 10), homeCharParts[3] ?? "Down"]
        : undefined,
    };
  });

  // StartItemStorage = ITEM1,ITEM2,...
  const startItems = fieldList(globalSec.fields, "StartItemStorage");

  return {
    startingMap: parseInt(homeParts[0] ?? "1", 10),
    startingX: parseInt(homeParts[1] ?? "0", 10),
    startingY: parseInt(homeParts[2] ?? "0", 10),
    startingDirection: homeParts[3] ?? "Down",
    startMoney: field(globalSec.fields, "StartMoney") ? parseInt(field(globalSec.fields, "StartMoney"), 10) : undefined,
    startItemStorage: startItems.length ? startItems : undefined,
    storageCreator: field(globalSec.fields, "StorageCreator"),
    regionMaps: fieldList(globalSec.fields, "RegionMap"),
    townMapBitmap: field(globalSec.fields, "TownMapBitmap") || undefined,
    wildBattleBGM: field(globalSec.fields, "WildBattleBGM") || undefined,
    trainerBattleBGM: field(globalSec.fields, "TrainerBattleBGM") || undefined,
    wildVictoryBGM: field(globalSec.fields, "WildVictoryBGM") || undefined,
    trainerVictoryBGM: field(globalSec.fields, "TrainerVictoryBGM") || undefined,
    wildCaptureME: field(globalSec.fields, "WildCaptureME") || undefined,
    surfBGM: field(globalSec.fields, "SurfBGM") || undefined,
    bicycleBGM: field(globalSec.fields, "BicycleBGM") || undefined,
    playerChars,
  };
}
