/**
 * Types panel with:
 * - Left list of type chips
 * - Right detail editor for weaknesses/resistances/immunities
 * - Bottom 18×18 effectiveness matrix (Canvas)
 */
import { useCallback } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadTypes } from "../../../services/pbsUnified";
import { saveTypes } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { TypeEntry } from "../../../types/pbsEntityTypes";
import { TypeChip } from "../shared/TypeChip";
import { ChipListEditor } from "../shared/ChipListEditor";

const getId = (t: TypeEntry) => t.id;

/** Compute effectiveness multiplier for attacking type → defending type */
function getEffectiveness(attacker: TypeEntry, defenders: TypeEntry[]): Map<string, number> {
  // Default 1× for everything
  const result = new Map<string, number>();
  for (const def of defenders) result.set(def.id, 1);
  // Apply weaknesses (defender is weak to attacker → 2×)
  for (const def of defenders) {
    if (def.weaknesses.includes(attacker.id)) result.set(def.id, (result.get(def.id) ?? 1) * 2);
    if (def.resistances.includes(attacker.id)) result.set(def.id, (result.get(def.id) ?? 1) * 0.5);
    if (def.immunities.includes(attacker.id)) result.set(def.id, 0);
  }
  return result;
}

function effectivenessColor(mult: number): string {
  if (mult === 0) return "#1e1e2e";       // immune — black
  if (mult >= 4) return "#e64553";        // 4× — deep red
  if (mult >= 2) return "#fe640b";        // 2× — orange
  if (mult <= 0.25) return "#179299";     // 0.25× — teal
  if (mult <= 0.5) return "#8839ef";      // 0.5× — purple
  return "#dce0e8";                        // 1× — neutral gray
}

function effectivenessLabel(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.25) return "¼";
  if (mult === 0.5) return "½";
  if (mult === 1) return "";
  if (mult === 2) return "2";
  if (mult === 4) return "4";
  return String(mult);
}

function EffectivenessMatrix({ types }: { types: TypeEntry[] }) {
  if (types.length === 0) return null;
  const CELL = 28;
  const LABEL_W = 72;
  const LABEL_H = 72;

  return (
    <div style={{ overflowAuto: "auto", marginTop: 12 } as React.CSSProperties}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77", marginBottom: 6 }}>
        Effectiveness Matrix — Attacker (row) → Defender (column)
      </div>
      <div style={{ overflow: "auto", maxHeight: 560 }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", fontSize: 9 }}>
          <thead>
            <tr>
              <th style={{ width: LABEL_W, minWidth: LABEL_W }} />
              {types.map((t) => (
                <th key={t.id} style={{ width: CELL, minWidth: CELL, padding: 0, height: LABEL_H }}>
                  <div style={{
                    transform: "rotate(-60deg) translateX(-4px)",
                    transformOrigin: "bottom left",
                    whiteSpace: "nowrap",
                    fontSize: 9, fontWeight: 700, color: "#4c4f69",
                    width: 60,
                  }}>
                    {t.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((atk) => {
              const row = getEffectiveness(atk, types);
              return (
                <tr key={atk.id}>
                  <td style={{ padding: "1px 4px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#4c4f69", whiteSpace: "nowrap" }}>
                    {atk.name}
                  </td>
                  {types.map((def) => {
                    const mult = row.get(def.id) ?? 1;
                    const label = effectivenessLabel(mult);
                    return (
                      <td
                        key={def.id}
                        style={{
                          width: CELL, height: CELL, padding: 0,
                          background: effectivenessColor(mult),
                          textAlign: "center", verticalAlign: "middle",
                          color: mult === 1 ? "transparent" : "#fff",
                          fontSize: 9, fontWeight: 700,
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        {label}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TypesPanel() {
  const { projectPath } = usePbsEntityContext();

  const loadFn = useCallback(() => loadTypes(projectPath), [projectPath]);
  const saveFn = useCallback((items: TypeEntry[]) => saveTypes(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-types", getId, loadFn, saveFn);

  const handleAdd = () => {
    add({
      id: `NEWTYPE`, name: "New Type",
      iconPosition: 0, isSpecial: false,
      weaknesses: [], resistances: [], immunities: [],
      color: "#888888",
    });
  };

  const allTypeNames = items.map((t) => t.id);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Left list */}
      <div style={{
        width: 160, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #ccd0da", background: "#e6e9ef",
      }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 12, fontSize: 11, color: "#8c8fa1" }}>Loading...</div>}
          {items.map((t) => (
            <div
              key={t.id}
              onClick={() => select(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 8px", cursor: "pointer",
                background: t.id === selectedId ? "#1e66f5" : "transparent",
              }}
            >
              <TypeChip typeId={t.id} />
              <button
                onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                style={{
                  marginLeft: "auto", background: "none", border: "none",
                  cursor: "pointer", color: t.id === selectedId ? "#fff" : "#acb0be",
                  fontSize: 13, padding: 0,
                }}
              >×</button>
            </div>
          ))}
        </div>
        <div style={{ padding: "6px 8px", borderTop: "1px solid #ccd0da" }}>
          <button onClick={handleAdd} style={{ width: "100%", padding: "4px 0", fontSize: 11, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            + Add Type
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!selected && !loading && <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select a type.</div>}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #ccd0da", paddingBottom: 8 }}>
              <TypeChip typeId={selected.id} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69" }}>{selected.name}</span>
            </div>

            <Row2>
              <Field label="Internal ID">
                <input value={selected.id} onChange={(e) => update(selected.id, { id: e.target.value })} style={inp} />
              </Field>
              <Field label="Name">
                <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} style={inp} />
              </Field>
            </Row2>

            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Icon Position">
                <input
                  type="number" min={0}
                  value={selected.iconPosition ?? 0}
                  onChange={(e) => update(selected.id, { iconPosition: parseInt(e.target.value, 10) || 0 })}
                  style={{ ...inp, width: 70 }}
                />
              </Field>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end", paddingBottom: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4c4f69" }}>
                  <input type="checkbox" checked={!!selected.isPseudoType} onChange={(e) => update(selected.id, { isPseudoType: e.target.checked || undefined })} />
                  Pseudo-type (e.g. ???)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#8c8fa1" }} title="Only relevant in Gen 3 mode (MOVE_CATEGORY_PER_MOVE=false)">
                  <input type="checkbox" checked={selected.isSpecial} onChange={(e) => update(selected.id, { isSpecial: e.target.checked })} />
                  Special split (Gen 3 only)
                </label>
              </div>
            </div>

            <Field label="Flags">
              <ChipListEditor values={selected.flags ?? []} onChange={(v) => update(selected.id, { flags: v.length ? v : undefined })} placeholder="e.g. AffectedByMagicRoom…" />
            </Field>

            {(["weaknesses", "resistances", "immunities"] as const).map((rel) => (
              <Field key={rel} label={rel.charAt(0).toUpperCase() + rel.slice(1)}>
                <MultiTypeSelect
                  selected={selected[rel]}
                  all={allTypeNames}
                  onChange={(v) => update(selected.id, { [rel]: v })}
                />
              </Field>
            ))}
          </div>
        )}

        {/* Full effectiveness matrix at the bottom */}
        {!loading && <EffectivenessMatrix types={items} />}
      </div>
    </div>
  );
}

function MultiTypeSelect({ selected: sel, all, onChange }: {
  selected: string[];
  all: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {all.map((id) => {
        const active = sel.includes(id);
        return (
          <button
            key={id}
            onClick={() => toggle(id)}
            style={{
              padding: "2px 7px", fontSize: 11, borderRadius: 3, cursor: "pointer",
              border: active ? "2px solid #1e66f5" : "2px solid transparent",
              background: active ? "#1e66f5" : "#dce0e8",
              color: active ? "#fff" : "#4c4f69",
              fontWeight: active ? 700 : 400,
            }}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77" }}>{label}</label>
      {children}
    </div>
  );
}
function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}
const inp: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12, border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69", width: "100%", boxSizing: "border-box",
};
