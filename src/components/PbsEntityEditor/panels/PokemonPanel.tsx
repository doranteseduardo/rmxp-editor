/**
 * Pokémon panel — the flagship entity editor.
 * Left: searchable list with sprite thumbnails.
 * Right: tabbed editor with Base / Stats (radar) / Moves / Evolutions / Forms / Metrics.
 */
import { useCallback, useState, useId } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadPokemon } from "../../../services/pbsUnified";
import { savePokemon } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { PokemonEntry } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";
import { TypeChip } from "../shared/TypeChip";
import { ChipListEditor } from "../shared/ChipListEditor";
import { previewAudioSafe } from "../../../services/tauriApi";
import { buildAssetUrl } from "../../../services/assetUrl";
import { Field, Row2, inp } from "./pokemon/shared";
import { PokemonIconSprite } from "./pokemon/PokemonIconSprite";
import { EvolutionChain } from "./pokemon/EvolutionChain";
import { MetricsVisualEditor, DEFAULT_METRICS } from "./pokemon/MetricsVisualEditor";
import { LearnsetTable } from "./pokemon/LearnsetTable";
import { StatsTab } from "./pokemon/StatsTab";
import { EvolutionsTab } from "./pokemon/EvolutionsTab";
import { FormsTab } from "./pokemon/FormsTab";
import { EvYieldEditor } from "./pokemon/EvYieldEditor";

const getId = (p: PokemonEntry) => p.id;

// ── Main panel ─────────────────────────────────────────────────────────────────

type PokemonTab = "base" | "stats" | "moves" | "evolutions" | "forms" | "metrics";

export function PokemonPanel() {
  const { projectPath, pbsIndex } = usePbsEntityContext();
  const moveNames = pbsIndex.get("moves.txt") ?? [];
  const typeNames = pbsIndex.get("types.txt") ?? [];
  const abilityNames = pbsIndex.get("abilities.txt") ?? [];
  const itemNames = pbsIndex.get("items.txt") ?? [];
  const pokemonNames = pbsIndex.get("pokemon.txt") ?? [];

  const loadFn = useCallback(() => loadPokemon(projectPath), [projectPath]);
  const saveFn = useCallback((items: PokemonEntry[]) => savePokemon(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-pokemon", getId, loadFn, saveFn);

  const [tab, setTab] = useState<PokemonTab>("base");
  const [shiny, setShiny] = useState(false);

  const typesDlId = useId();
  const abilitiesDlId = useId();

  const handleAdd = () => {
    add({
      id: `NEWPOKE_${Date.now()}`, name: "New Pokémon",
      type1: "NORMAL", baseStats: { hp: 45, atk: 45, def: 45, spa: 45, spd: 45, spe: 45 },
      evYield: "", abilities: [], genderRatio: "FemaleOneEighth",
      catchRate: 45, happiness: 70, expYield: 64, growthRate: "Medium",
      eggGroups: ["Undiscovered"], hatchSteps: 1, height: 0.5, weight: 5.0,
      moves: [], tutorMoves: [], eggMoves: [], evolutions: [],
      color: "Red", shape: "Upright", forms: [],
    });
  };

  const TABS: { id: PokemonTab; label: string }[] = [
    { id: "base", label: "Base" },
    { id: "stats", label: "Stats" },
    { id: "moves", label: "Moves" },
    { id: "evolutions", label: "Evolutions" },
    { id: "forms", label: `Forms${selected?.forms?.length ? ` (${selected.forms.length})` : ""}` },
    { id: "metrics", label: "Metrics" },
  ];

  const GROWTH_RATES = ["Medium", "Slow", "Fast", "MediumSlow", "Parabolic", "Fluctuating", "Erratic"];
  const GENDER_RATIOS = ["AlwaysMale", "AlwaysFemale", "FemaleOneInEight", "FemaleOneInFour", "Female50Percent", "Female75Percent", "Female87_5Percent", "Genderless"];
  const COLORS = ["Red", "Blue", "Yellow", "Green", "Black", "Brown", "Purple", "Gray", "White", "Pink"];
  const EGG_GROUPS = ["Monster", "Water1", "Bug", "Flying", "Field", "Fairy", "Grass", "HumanLike", "Water3", "Mineral", "Amorphous", "Water2", "Ditto", "Dragon", "Undiscovered"];

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Left list */}
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(p) => `${p.id} — ${p.name}`}
        renderPrefix={(p) => (
          <PokemonIconSprite projectPath={projectPath} id={p.id} size={32} />
        )}
        onSelect={(id) => { select(id); setTab("base"); }}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
        addLabel="+ Add Pokémon"
      />

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, padding: "4px 12px" }}>{error}</div>}

        {selected && (
          <>
            {/* Sprite header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16, padding: "12px 16px",
              borderBottom: "1px solid #ccd0da", background: "#f0f2f5", flexShrink: 0,
            }}>
              <img
                src={buildAssetUrl(`${projectPath}/Graphics/Pokemon/${shiny ? "Front shiny" : "Front"}/${selected.id}.png`)}
                alt={selected.id}
                style={{ width: 80, height: 80, imageRendering: "pixelated", objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#4c4f69" }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: "#8c8fa1", marginBottom: 4 }}>
                  {selected.id} · #{String(items.indexOf(selected) + 1).padStart(3, "0")}
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <TypeChip typeId={selected.type1} />
                  {selected.type2 && <TypeChip typeId={selected.type2} />}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => setShiny((s) => !s)}
                  style={{
                    padding: "3px 10px", fontSize: 10,
                    background: shiny ? "#df8e1d" : "#dce0e8",
                    color: shiny ? "#fff" : "#4c4f69",
                    border: "1px solid #ccd0da", borderRadius: 3, cursor: "pointer",
                  }}
                >✨ Shiny</button>
                <button
                  onClick={() => previewAudioSafe(projectPath, "se", `Cries/${selected.id}`, 0.8)}
                  style={{ padding: "3px 10px", fontSize: 10, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
                >▶ Cry</button>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #ccd0da", padding: "4px 12px 0", background: "#e6e9ef", flexShrink: 0 }}>
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "4px 12px", fontSize: 11,
                  background: tab === t.id ? "#eff1f5" : "transparent",
                  border: "1px solid", borderColor: tab === t.id ? "#ccd0da" : "transparent",
                  borderBottom: tab === t.id ? "1px solid #eff1f5" : "1px solid transparent",
                  borderRadius: "4px 4px 0 0", cursor: "pointer",
                  color: tab === t.id ? "#4c4f69" : "#8c8fa1", fontWeight: tab === t.id ? 600 : 400,
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <datalist id={typesDlId}>{typeNames.map((n) => <option key={n} value={n} />)}</datalist>
              <datalist id={abilitiesDlId}>{abilityNames.map((n) => <option key={n} value={n} />)}</datalist>

              {/* Base tab */}
              {tab === "base" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 540 }}>
                  <Row2>
                    <Field label="Internal ID">
                      <input value={selected.id} onChange={(e) => update(selected.id, { id: e.target.value })} style={inp} />
                    </Field>
                    <Field label="Name">
                      <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} style={inp} />
                    </Field>
                  </Row2>
                  <Row2>
                    <Field label="Type 1">
                      <input list={typesDlId} value={selected.type1} onChange={(e) => update(selected.id, { type1: e.target.value })} style={inp} />
                    </Field>
                    <Field label="Type 2">
                      <input list={typesDlId} value={selected.type2 ?? ""} onChange={(e) => update(selected.id, { type2: e.target.value || undefined })} placeholder="(none)" style={inp} />
                    </Field>
                  </Row2>
                  <Field label="Abilities">
                    <ChipListEditor values={selected.abilities} options={abilityNames} maxItems={2} onChange={(v) => update(selected.id, { abilities: v })} placeholder="Add ability…" />
                  </Field>
                  <Field label="Hidden Ability">
                    <input list={abilitiesDlId} value={selected.hiddenAbility ?? ""} onChange={(e) => update(selected.id, { hiddenAbility: e.target.value || undefined })} placeholder="(none)" style={inp} />
                  </Field>
                  <Row2>
                    <Field label="Gender Ratio">
                      <select value={selected.genderRatio} onChange={(e) => update(selected.id, { genderRatio: e.target.value })} style={inp}>
                        {GENDER_RATIOS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Growth Rate">
                      <select value={selected.growthRate} onChange={(e) => update(selected.id, { growthRate: e.target.value })} style={inp}>
                        {GROWTH_RATES.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                  </Row2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {([["Catch Rate", "catchRate"], ["Base Happiness", "happiness"], ["Exp Yield", "expYield"], ["Hatch Steps", "hatchSteps"]] as const).map(([label, key]) => (
                      <Field key={key} label={label}>
                        <input type="number" value={(selected as unknown as Record<string, number>)[key]} onChange={(e) => update(selected.id, { [key]: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 80 }} />
                      </Field>
                    ))}
                  </div>
                  <Row2>
                    <Field label="Height (m)">
                      <input type="number" step="0.1" min="0.1" value={selected.height} onChange={(e) => update(selected.id, { height: parseFloat(e.target.value) || 0.1 })} style={{ ...inp, width: 80 }} />
                    </Field>
                    <Field label="Weight (kg)">
                      <input type="number" step="0.1" min="0.1" value={selected.weight} onChange={(e) => update(selected.id, { weight: parseFloat(e.target.value) || 0.1 })} style={{ ...inp, width: 80 }} />
                    </Field>
                    <Field label="Color">
                      <select value={selected.color} onChange={(e) => update(selected.id, { color: e.target.value })} style={inp}>
                        {COLORS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Shape">
                      <select value={selected.shape} onChange={(e) => update(selected.id, { shape: e.target.value })} style={inp}>
                        {["Upright","Quadruped","Fish","Snake","Arms","Blob","Multiparts","Multi-wing","Tentacles","Crystalline","Bug","Humanoid","Armor","Ball"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                  </Row2>
                  <Field label="Egg Groups">
                    <ChipListEditor values={selected.eggGroups} options={EGG_GROUPS} maxItems={2} onChange={(v) => update(selected.id, { eggGroups: v })} placeholder="Add egg group…" />
                  </Field>
                  <Field label="Tutor Moves">
                    <ChipListEditor values={selected.tutorMoves} options={moveNames} onChange={(v) => update(selected.id, { tutorMoves: v })} placeholder="Add tutor move…" />
                  </Field>
                  <Field label="Egg Moves">
                    <ChipListEditor values={selected.eggMoves} options={moveNames} onChange={(v) => update(selected.id, { eggMoves: v })} placeholder="Add egg move…" />
                  </Field>
                  <Field label="Flags">
                    <ChipListEditor values={selected.flags ?? []} onChange={(v) => update(selected.id, { flags: v })} placeholder="Legendary, Mythical…" />
                  </Field>
                  <Field label="EV Yield">
                    <EvYieldEditor
                      value={selected.evYield ?? ""}
                      onChange={(v) => update(selected.id, { evYield: v })}
                    />
                  </Field>
                  <Row2>
                    <Field label="Pokédex Category">
                      <input
                        value={selected.category ?? ""}
                        onChange={(e) => update(selected.id, { category: e.target.value || undefined })}
                        placeholder="Seed, Lizard, …"
                        style={inp}
                      />
                    </Field>
                    <Field label="Habitat">
                      <select value={selected.habitat ?? ""} onChange={(e) => update(selected.id, { habitat: e.target.value || undefined })} style={inp}>
                        <option value="">(none)</option>
                        {["Cave", "Forest", "Grassland", "Mountain", "Rare", "RoughTerrain", "Sea", "Urban", "WatersEdge"].map((h) => <option key={h}>{h}</option>)}
                      </select>
                    </Field>
                  </Row2>
                  <Field label="Pokédex Entry">
                    <textarea
                      value={selected.pokedex ?? ""}
                      onChange={(e) => update(selected.id, { pokedex: e.target.value || undefined })}
                      rows={3}
                      style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </Field>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Field label="Wild Item (Common)">
                      <input list={abilitiesDlId} value={selected.wildItems?.common ?? ""} onChange={(e) => update(selected.id, { wildItems: { ...selected.wildItems, common: e.target.value || undefined } })} placeholder="(none)" style={{ ...inp, width: 130 }} />
                    </Field>
                    <Field label="Wild Item (Uncommon)">
                      <input value={selected.wildItems?.uncommon ?? ""} onChange={(e) => update(selected.id, { wildItems: { ...selected.wildItems, uncommon: e.target.value || undefined } })} placeholder="(none)" style={{ ...inp, width: 130 }} />
                    </Field>
                    <Field label="Wild Item (Rare)">
                      <input value={selected.wildItems?.rare ?? ""} onChange={(e) => update(selected.id, { wildItems: { ...selected.wildItems, rare: e.target.value || undefined } })} placeholder="(none)" style={{ ...inp, width: 130 }} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Stats tab */}
              {tab === "stats" && (
                <StatsTab
                  stats={selected.baseStats}
                  onChange={(s) => update(selected.id, { baseStats: s })}
                />
              )}

              {/* Moves tab */}
              {tab === "moves" && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#5c5f77", marginBottom: 8 }}>Level-Up Moves</div>
                  <LearnsetTable
                    moves={selected.moves}
                    moveNames={moveNames}
                    onChange={(m) => update(selected.id, { moves: m })}
                  />
                </div>
              )}

              {/* Evolutions tab */}
              {tab === "evolutions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#5c5f77", marginBottom: 8 }}>Evolution Chain</div>
                    <EvolutionChain entry={selected} all={items} projectPath={projectPath} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#5c5f77", marginBottom: 8 }}>Edit Evolutions</div>
                    <EvolutionsTab
                      evolutions={selected.evolutions}
                      pokemonNames={pokemonNames}
                      onChange={(evos) => update(selected.id, { evolutions: evos })}
                    />
                  </div>
                </div>
              )}

              {/* Forms tab */}
              {tab === "forms" && (
                <FormsTab
                  key={selected.id}
                  forms={selected.forms ?? []}
                  typeNames={typeNames}
                  abilityNames={abilityNames}
                  moveNames={moveNames}
                  itemNames={itemNames}
                  onChange={(forms) => update(selected.id, { forms })}
                />
              )}

              {/* Metrics tab */}
              {tab === "metrics" && (
                <MetricsVisualEditor
                  pokemonId={selected.id}
                  projectPath={projectPath}
                  metrics={selected.metrics ?? DEFAULT_METRICS}
                  onChange={(m) => update(selected.id, { metrics: m })}
                />
              )}
            </div>
          </>
        )}

        {!selected && !loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8fa1", fontSize: 13 }}>
            Select a Pokémon to edit.
          </div>
        )}
      </div>
    </div>
  );
}

