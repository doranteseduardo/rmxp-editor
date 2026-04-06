/**
 * PBS Distributor
 * Converts typed entity arrays back into raw PbsSection[] and saves to the
 * correct PBS files. Inverse of pbsUnified.ts loaders.
 */
import { savePbsFile, writeRawPbsFile } from "./tauriApi";
import type { PbsSection, PbsField } from "../types/pbsTypes";
import type {
  PokemonEntry, MoveEntry, AbilityEntry, ItemEntry, TypeEntry,
  TrainerEntry, TrainerTypeEntry, EncounterEntry, MapMetaEntry, MetadataEntry,
  TrainerPokemon,
} from "../types/pbsEntityTypes";
import { serializeBaseStats, serializeMoves, serializeEvolutions } from "./pbsUnified";

// ── Field builder ─────────────────────────────────────────────────────────────

function f(key: string, value: string | number | boolean | undefined | null): PbsField | null {
  if (value === undefined || value === null || value === "") return null;
  return { key, value: String(value) };
}

function fields(...items: (PbsField | null)[]): PbsField[] {
  return items.filter((x): x is PbsField => x !== null);
}

// ── Pokémon serialization ──────────────────────────────────────────────────────

export function serializePokemon(entries: PokemonEntry[]): {
  pokemon: PbsSection[];
  pokemon_forms: PbsSection[];
  pokemon_metrics: PbsSection[];
} {
  const pokemon: PbsSection[] = [];
  const pokemon_forms: PbsSection[] = [];
  const pokemon_metrics: PbsSection[] = [];

  for (const e of entries) {
    const types = e.type2 ? `${e.type1},${e.type2}` : e.type1;
    const sec: PbsSection = {
      header: e.id,
      fields: fields(
        f("Name", e.name),
        f("Types", types),
        f("BaseStats", serializeBaseStats(e.baseStats)),
        e.evYield ? f("EVs", e.evYield) : null,
        f("GenderRatio", e.genderRatio),
        f("GrowthRate", e.growthRate),
        f("BaseExp", e.expYield),
        f("Abilities", e.abilities.join(",")),
        e.hiddenAbility ? f("HiddenAbilities", e.hiddenAbility) : null,
        f("CatchRate", e.catchRate),
        f("Happiness", e.happiness),
        e.moves.length ? f("Moves", serializeMoves(e.moves)) : null,
        e.tutorMoves.length ? f("TutorMoves", e.tutorMoves.join(",")) : null,
        e.eggMoves.length ? f("EggMoves", e.eggMoves.join(",")) : null,
        e.eggGroups.length ? f("EggGroups", e.eggGroups.join(",")) : null,
        f("HatchSteps", e.hatchSteps),
        f("Height", e.height),
        f("Weight", e.weight),
        f("Color", e.color),
        f("Shape", e.shape),
        e.habitat ? f("Habitat", e.habitat) : null,
        e.category ? f("Category", e.category) : null,
        e.pokedex ? f("Pokedex", e.pokedex) : null,
        e.generation != null ? f("Generation", e.generation) : null,
        e.evolutions.length ? f("Evolutions", serializeEvolutions(e.evolutions)) : null,
        e.flags?.length ? f("Flags", e.flags.join(",")) : null,
        e.wildItems?.common ? f("WildItemCommon", e.wildItems.common) : null,
        e.wildItems?.uncommon ? f("WildItemUncommon", e.wildItems.uncommon) : null,
        e.wildItems?.rare ? f("WildItemRare", e.wildItems.rare) : null,
        e.incense ? f("Incense", e.incense) : null,
        e.offspring?.length ? f("Offspring", e.offspring.join(",")) : null,
      ),
    };
    pokemon.push(sec);

    // Forms
    e.forms.forEach((form, idx) => {
      const formTypes = form.type2 ? `${form.type1},${form.type2}` : form.type1;
      const formSec: PbsSection = {
        header: `${e.id},${idx + 1}`,
        fields: fields(
          f("FormName", form.formName),
          f("Types", formTypes),
          form.megaStone ? f("MegaStone", form.megaStone) : null,
          form.baseStats ? f("BaseStats", serializeBaseStats(form.baseStats)) : null,
          form.abilities?.length ? f("Abilities", form.abilities.join(",")) : null,
          form.hiddenAbility ? f("HiddenAbilities", form.hiddenAbility) : null,
          form.height != null ? f("Height", form.height) : null,
          form.weight != null ? f("Weight", form.weight) : null,
          form.color ? f("Color", form.color) : null,
          form.pokedex ? f("Pokedex", form.pokedex) : null,
          form.generation != null ? f("Generation", form.generation) : null,
          form.moves?.length ? f("Moves", serializeMoves(form.moves)) : null,
          form.evolutions?.length ? f("Evolutions", serializeEvolutions(form.evolutions)) : null,
        ),
      };
      pokemon_forms.push(formSec);
    });

    // Metrics
    if (e.metrics) {
      const m = e.metrics;
      pokemon_metrics.push({
        header: e.id,
        fields: fields(
          f("FrontSprite", `${m.frontSpriteOffset[0]},${m.frontSpriteOffset[1]}`),
          f("BackSprite", `${m.backSpriteOffset[0]},${m.backSpriteOffset[1]}`),
          f("ShadowX", m.shadowX),
          f("ShadowSize", m.shadowSize),
        ),
      });
    }
  }

  return { pokemon, pokemon_forms, pokemon_metrics };
}

export async function savePokemon(projectPath: string, entries: PokemonEntry[]): Promise<void> {
  const { pokemon, pokemon_forms, pokemon_metrics } = serializePokemon(entries);
  await Promise.all([
    savePbsFile(projectPath, "pokemon.txt", pokemon),
    pokemon_forms.length ? savePbsFile(projectPath, "pokemon_forms.txt", pokemon_forms) : Promise.resolve(),
    pokemon_metrics.length ? savePbsFile(projectPath, "pokemon_metrics.txt", pokemon_metrics) : Promise.resolve(),
  ]);
}

// ── Moves serialization ────────────────────────────────────────────────────────

export async function saveMoves(projectPath: string, entries: MoveEntry[]): Promise<void> {
  const sections: PbsSection[] = entries.map((e) => ({
    header: e.id,
    fields: fields(
      f("Name", e.name),
      f("Type", e.type),
      f("Category", e.category),
      e.power !== 0 ? f("Power", e.power) : null,
      f("Accuracy", e.accuracy),
      f("TotalPP", e.pp),
      f("Target", e.target),
      e.priority !== 0 ? f("Priority", e.priority) : null,
      f("FunctionCode", e.functionCode),
      e.effectChance !== 0 ? f("EffectChance", e.effectChance) : null,
      e.flags.length ? f("Flags", e.flags.join(",")) : null,
      f("Description", e.description),
    ),
  }));
  await savePbsFile(projectPath, "moves.txt", sections);
}

// ── Abilities serialization ────────────────────────────────────────────────────

export async function saveAbilities(projectPath: string, entries: AbilityEntry[]): Promise<void> {
  const sections: PbsSection[] = entries.map((e) => ({
    header: e.id,
    fields: fields(
      f("Name", e.name),
      f("Description", e.description),
      e.flags.length ? f("Flags", e.flags.join(",")) : null,
    ),
  }));
  await savePbsFile(projectPath, "abilities.txt", sections);
}

// ── Items serialization ────────────────────────────────────────────────────────

export async function saveItems(projectPath: string, entries: ItemEntry[]): Promise<void> {
  const sections: PbsSection[] = entries.map((e) => ({
    header: e.id,
    fields: fields(
      f("Name", e.name),
      f("NamePlural", e.namePlural),
      f("Pocket", e.pocket),
      f("Price", e.price),
      e.sellPrice != null ? f("SellPrice", e.sellPrice) : null,
      e.bpPrice != null ? f("BPPrice", e.bpPrice) : null,
      e.fieldUse ? f("FieldUse", e.fieldUse) : null,
      e.battleUse ? f("BattleUse", e.battleUse) : null,
      e.consumable === false ? f("Consumable", "false") : null,
      e.move ? f("Move", e.move) : null,
      f("Description", e.description),
      e.flags.length ? f("Flags", e.flags.join(",")) : null,
    ),
  }));
  await savePbsFile(projectPath, "items.txt", sections);
}

// ── Types serialization ────────────────────────────────────────────────────────

export async function saveTypes(projectPath: string, entries: TypeEntry[]): Promise<void> {
  const sections: PbsSection[] = entries.map((e) => ({
    header: e.id,
    fields: fields(
      f("Name", e.name),
      f("IconPosition", e.iconPosition),
      e.isSpecial ? f("IsSpecialType", "true") : null,
      e.isPseudoType ? f("IsPseudoType", "true") : null,
      e.weaknesses.length ? f("Weaknesses", e.weaknesses.join(",")) : null,
      e.resistances.length ? f("Resistances", e.resistances.join(",")) : null,
      e.immunities.length ? f("Immunities", e.immunities.join(",")) : null,
      e.flags?.length ? f("Flags", e.flags.join(",")) : null,
    ),
  }));
  await savePbsFile(projectPath, "types.txt", sections);
}

// ── Trainers serialization ─────────────────────────────────────────────────────

function serializeTrainerPokemon(team: TrainerPokemon[]): PbsField[] {
  const result: PbsField[] = [];
  for (const poke of team) {
    result.push({ key: "Pokemon", value: `${poke.species},${poke.level}` });
    if (poke.nickname) result.push({ key: "Name", value: poke.nickname });
    if (poke.moves.length) result.push({ key: "Moves", value: poke.moves.join(",") });
    if (poke.heldItem) result.push({ key: "Item", value: poke.heldItem });
    if (poke.ability) result.push({ key: "Ability", value: poke.ability });
    if (poke.abilityIndex != null) result.push({ key: "AbilityIndex", value: String(poke.abilityIndex) });
    if (poke.gender) result.push({ key: "Gender", value: poke.gender });
    if (poke.nature) result.push({ key: "Nature", value: poke.nature });
    if (poke.form != null) result.push({ key: "Form", value: String(poke.form) });
    if (poke.happiness != null) result.push({ key: "Happiness", value: String(poke.happiness) });
    if (poke.shiny) result.push({ key: "Shiny", value: "yes" });
    if (poke.superShiny) result.push({ key: "SuperShiny", value: "yes" });
    if (poke.shadow) result.push({ key: "Shadow", value: "yes" });
    if (poke.ball) result.push({ key: "Ball", value: poke.ball });
    if (poke.ivs) result.push({ key: "IV", value: serializeBaseStats(poke.ivs) });
    if (poke.evs) result.push({ key: "EV", value: serializeBaseStats(poke.evs) });
  }
  return result;
}

export async function saveTrainers(
  projectPath: string,
  trainers: TrainerEntry[],
  trainerTypes: TrainerTypeEntry[]
): Promise<void> {
  const trainerSections: PbsSection[] = trainers.map((t) => ({
    header: t.id,
    fields: fields(
      f("LoseText", t.loseText),
      t.items.length ? f("Items", t.items.join(",")) : null,
      ...serializeTrainerPokemon(t.team),
    ),
  }));

  const typeSections: PbsSection[] = trainerTypes.map((tt) => ({
    header: tt.id,
    fields: fields(
      f("Name", tt.name),
      f("Gender", tt.gender),
      f("BaseMoney", tt.baseMoney),
      f("SkillLevel", tt.skillLevel),
      tt.battleBGM ? f("BattleBGM", tt.battleBGM) : null,
      tt.victoryBGM ? f("VictoryBGM", tt.victoryBGM) : null,
      tt.introBGM ? f("IntroBGM", tt.introBGM) : null,
      tt.maxSize != null ? f("MaxSize", tt.maxSize) : null,
      tt.flags?.length ? f("Flags", tt.flags.join(",")) : null,
    ),
  }));

  await Promise.all([
    savePbsFile(projectPath, "trainers.txt", trainerSections),
    savePbsFile(projectPath, "trainer_types.txt", typeSections),
  ]);
}

// ── Encounters serialization ───────────────────────────────────────────────────

export async function saveEncounters(projectPath: string, entries: EncounterEntry[]): Promise<void> {
  const lines: string[] = [
    "# See the documentation on the wiki to learn how to edit this file.",
  ];
  for (const e of entries) {
    lines.push("#-------------------------------");
    const header = e.mapVersion != null ? `[${e.mapId},${e.mapVersion}]` : `[${e.mapId}]`;
    lines.push(`${header} # ${e.mapName}`);
    for (const table of e.tables) {
      if (!table.slots.length) continue;
      const total = table.slots.reduce((s, sl) => s + sl.probability, 0);
      // Some table types (OldRod etc.) may not have a density
      const typeLine = table.density != null ? `${table.type},${total}` : table.type;
      lines.push(typeLine);
      for (const slot of table.slots) {
        const lvl = slot.minLevel === slot.maxLevel
          ? String(slot.minLevel)
          : `${slot.minLevel},${slot.maxLevel}`;
        lines.push(`    ${slot.probability},${slot.species},${lvl}`);
      }
    }
  }
  await writeRawPbsFile(projectPath, "encounters.txt", lines.join("\n") + "\n");
}

// ── Map Metadata serialization ─────────────────────────────────────────────────

export async function saveMapMeta(projectPath: string, entries: MapMetaEntry[]): Promise<void> {
  const sections: PbsSection[] = entries.map((e) => ({
    header: String(e.mapId),
    fields: fields(
      f("Name", e.mapName),
      e.outdoor ? f("Outdoor", "true") : null,
      e.showArea ? f("ShowArea", "true") : null,
      e.canBicycle ? f("Bicycle", "true") : null,
      e.bicycleAlways ? f("BicycleAlways", "true") : null,
      e.bicycleBridge ? f("BicycleBridge", "true") : null,
      e.canFly ? f("Fly", "true") : null,
      e.canDigEscape ? f("Diving", "true") : null,
      e.healingSpot ? f("HealingSpot", e.healingSpot.join(",")) : null,
      e.mapPosition ? f("MapPosition", `0,${e.mapPosition[0]},${e.mapPosition[1]}`) : null,
      e.mapSize ? f("MapSize", e.mapSize.join(",")) : null,
      e.weather
        ? f("Weather", e.weatherChance != null ? `${e.weather},${e.weatherChance}` : e.weather)
        : null,
      e.environment ? f("Environment", e.environment) : null,
      e.battleBacks?.ground ? f("BattleBack", e.battleBacks.ground) : null,
      e.defaultFlyTo != null ? f("DefaultFlyTo", e.defaultFlyTo) : null,
      e.parent != null ? f("Parent", e.parent) : null,
      e.safariBattle ? f("SafariBattle", "true") : null,
      e.darkMap ? f("DarkMap", "true") : null,
      e.mapFlags?.length ? f("Flags", e.mapFlags.join(",")) : null,
    ),
  }));
  await savePbsFile(projectPath, "map_metadata.txt", sections);
}

// ── Global Metadata serialization ─────────────────────────────────────────────

export async function saveMetadata(projectPath: string, meta: MetadataEntry): Promise<void> {
  const home = [meta.startingMap, meta.startingX, meta.startingY, meta.startingDirection].join(",");

  const sections: PbsSection[] = [];

  // Section [0] — global
  sections.push({
    header: "0",
    fields: fields(
      f("Home", home),
      meta.startMoney != null ? f("StartMoney", meta.startMoney) : null,
      meta.startItemStorage?.length ? f("StartItemStorage", meta.startItemStorage.join(",")) : null,
      meta.storageCreator ? f("StorageCreator", meta.storageCreator) : null,
      meta.regionMaps.length ? f("RegionMap", meta.regionMaps.join(",")) : null,
      meta.townMapBitmap ? f("TownMapBitmap", meta.townMapBitmap) : null,
      meta.wildBattleBGM ? f("WildBattleBGM", meta.wildBattleBGM) : null,
      meta.trainerBattleBGM ? f("TrainerBattleBGM", meta.trainerBattleBGM) : null,
      meta.wildVictoryBGM ? f("WildVictoryBGM", meta.wildVictoryBGM) : null,
      meta.trainerVictoryBGM ? f("TrainerVictoryBGM", meta.trainerVictoryBGM) : null,
      meta.wildCaptureME ? f("WildCaptureME", meta.wildCaptureME) : null,
      meta.surfBGM ? f("SurfBGM", meta.surfBGM) : null,
      meta.bicycleBGM ? f("BicycleBGM", meta.bicycleBGM) : null,
    ),
  });

  // Sections [1], [2], ... — player characters
  meta.playerChars.forEach((char, idx) => {
    const charHome = char.home
      ? [char.home[0], char.home[1], char.home[2], char.home[3]].join(",")
      : null;
    sections.push({
      header: String(idx + 1),
      fields: fields(
        f("TrainerType", char.trainerType),
        f("WalkCharset", char.walkCharset),
        char.runCharset ? f("RunCharset", char.runCharset) : null,
        char.cycleCharset ? f("CycleCharset", char.cycleCharset) : null,
        char.surfCharset ? f("SurfCharset", char.surfCharset) : null,
        char.diveCharset ? f("DiveCharset", char.diveCharset) : null,
        char.fishCharset ? f("FishCharset", char.fishCharset) : null,
        char.surfFishCharset ? f("SurfFishCharset", char.surfFishCharset) : null,
        charHome ? f("Home", charHome) : null,
      ),
    });
  });

  await savePbsFile(projectPath, "metadata.txt", sections);
}
