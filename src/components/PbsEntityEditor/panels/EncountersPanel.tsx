/**
 * Encounters panel
 * - Left: list of maps with encounter data
 * - Right: per-encounter-type probability bar + editable slots
 */
import { useCallback, useId } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadEncounters } from "../../../services/pbsUnified";
import { saveEncounters } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { EncounterEntry, EncounterSlot, EncounterTable } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";

const getId = (e: EncounterEntry) => String(e.mapId);

const ENCOUNTER_TYPE_COLORS: Record<string, string> = {
  Land: "#78C850", LandMorning: "#a8e878", LandDay: "#78C850", LandNight: "#305098",
  Water: "#6890F0", Cave: "#705848", OldRod: "#98d8d8", GoodRod: "#6890F0",
  SuperRod: "#3050d8", BugContest: "#A8B820", RockSmash: "#B8A038", Headbutt: "#A8A878",
};

function ProbabilityBar({ table, pokemonNames, onUpdate }: {
  table: EncounterTable;
  pokemonNames: string[];
  onUpdate: (slots: EncounterSlot[]) => void;
}) {
  const datalistId = useId();
  const total = table.slots.reduce((s, sl) => s + sl.probability, 0) || 1;

  const updateSlot = (idx: number, patch: Partial<EncounterSlot>) => {
    const next = [...table.slots];
    next[idx] = { ...next[idx], ...patch };
    onUpdate(next);
  };

  const removeSlot = (idx: number) => {
    onUpdate(table.slots.filter((_, i) => i !== idx));
  };

  const addSlot = () => {
    onUpdate([...table.slots, { probability: 10, species: "", minLevel: 5, maxLevel: 10 }]);
  };

  const color = ENCOUNTER_TYPE_COLORS[table.type] ?? "#888";

  return (
    <div style={{ marginBottom: 16 }}>
      <datalist id={datalistId}>
        {pokemonNames.map((n) => <option key={n} value={n} />)}
      </datalist>

      {/* Type header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "4px 8px", background: color,
        color: "#fff", fontSize: 12, fontWeight: 700,
        borderRadius: "4px 4px 0 0",
      }}>
        {table.type}
        <span style={{ fontSize: 10, fontWeight: 400 }}>({table.slots.length} slots)</span>
      </div>

      {/* Probability stacked bar */}
      {table.slots.length > 0 && (
        <div style={{ display: "flex", height: 16, borderRadius: 0, overflow: "hidden", border: "1px solid #ccd0da", borderTop: "none" }}>
          {table.slots.map((sl, i) => (
            <div
              key={i}
              title={`${sl.species} Lv${sl.minLevel}–${sl.maxLevel}: ${sl.probability}/${total} (${Math.round(sl.probability / total * 100)}%)`}
              style={{
                flex: sl.probability, background: `hsl(${i * 37 % 360},60%,55%)`,
                borderRight: "1px solid rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}

      {/* Slot rows */}
      <div style={{ border: "1px solid #ccd0da", borderTop: "none", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
        {table.slots.map((sl, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
            background: i % 2 ? "#f0f2f5" : "#fff", borderTop: i > 0 ? "1px solid #e6e9ef" : "none",
            fontSize: 11,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: `hsl(${i * 37 % 360},60%,55%)`,
            }} />
            <input
              type="number"
              value={sl.probability}
              onChange={(e) => updateSlot(i, { probability: parseInt(e.target.value, 10) || 0 })}
              title="Probability weight"
              style={{ width: 42, ...slotInp }}
            />
            <span style={{ color: "#8c8fa1", fontSize: 10, flexShrink: 0 }}>
              {Math.round(sl.probability / total * 100)}%
            </span>
            <input
              list={datalistId}
              value={sl.species}
              onChange={(e) => updateSlot(i, { species: e.target.value })}
              placeholder="Species"
              style={{ flex: 1, ...slotInp }}
            />
            <span style={{ color: "#8c8fa1", fontSize: 10, flexShrink: 0 }}>Lv</span>
            <input
              type="number"
              value={sl.minLevel}
              onChange={(e) => updateSlot(i, { minLevel: parseInt(e.target.value, 10) || 1 })}
              style={{ width: 38, ...slotInp }}
            />
            <span style={{ color: "#8c8fa1", fontSize: 10 }}>–</span>
            <input
              type="number"
              value={sl.maxLevel}
              onChange={(e) => updateSlot(i, { maxLevel: parseInt(e.target.value, 10) || 1 })}
              style={{ width: 38, ...slotInp }}
            />
            <button onClick={() => removeSlot(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 13 }}>×</button>
          </div>
        ))}
        <div style={{ padding: "4px 8px", background: "#f8f9fb" }}>
          <button onClick={addSlot} style={{ fontSize: 10, padding: "2px 8px", background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            + Add slot
          </button>
        </div>
      </div>
    </div>
  );
}

export function EncountersPanel() {
  const { projectPath, mapNames, pbsIndex } = usePbsEntityContext();
  const pokemonNames = pbsIndex.get("pokemon.txt") ?? [];

  const loadFn = useCallback(() => loadEncounters(projectPath, mapNames), [projectPath, mapNames]);
  const saveFn = useCallback((items: EncounterEntry[]) => saveEncounters(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-encounters", getId, loadFn, saveFn);

  const handleAdd = () => {
    const mapId = Math.max(0, ...items.map((e) => e.mapId)) + 1;
    add({ mapId, mapName: `Map ${mapId}`, tables: [] });
  };

  const addTable = (type: string) => {
    if (!selected) return;
    if (selected.tables.some((t) => t.type === type)) return;
    update(getId(selected), { tables: [...selected.tables, { type, slots: [] }] });
  };

  const updateTableSlots = (type: string, slots: EncounterSlot[]) => {
    if (!selected) return;
    update(getId(selected), {
      tables: selected.tables.map((t) => t.type === type ? { ...t, slots } : t),
    });
  };

  const AVAILABLE_TYPES = ["Land", "LandMorning", "LandDay", "LandNight", "Water", "Cave", "OldRod", "GoodRod", "SuperRod", "BugContest", "RockSmash", "Headbutt"];

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(e) => `${e.mapId} — ${e.mapName}`}
        onSelect={select}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
        addLabel="+ Add Map"
      />

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!selected && !loading && <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select a map.</div>}
        {selected && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69", borderBottom: "1px solid #ccd0da", paddingBottom: 8, marginBottom: 12 }}>
              Map {selected.mapId} — {selected.mapName}
            </div>

            {/* Add encounter type */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {AVAILABLE_TYPES.filter((t) => !selected.tables.some((tb) => tb.type === t)).map((t) => (
                <button key={t} onClick={() => addTable(t)} style={{
                  fontSize: 10, padding: "2px 8px", background: "#e6e9ef",
                  color: "#4c4f69", border: "1px solid #ccd0da", borderRadius: 3, cursor: "pointer",
                }}>
                  + {t}
                </button>
              ))}
            </div>

            {selected.tables.map((table) => (
              <ProbabilityBar
                key={table.type}
                table={table}
                pokemonNames={pokemonNames}
                onUpdate={(slots) => updateTableSlots(table.type, slots)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const slotInp: React.CSSProperties = {
  padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3,
  background: "#fff", color: "#4c4f69", boxSizing: "border-box",
};
