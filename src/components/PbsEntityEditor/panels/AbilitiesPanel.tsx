import { useCallback } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadAbilities } from "../../../services/pbsUnified";
import { saveAbilities } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { AbilityEntry } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";
import { ChipListEditor } from "../shared/ChipListEditor";

const getId = (a: AbilityEntry) => a.id;

export function AbilitiesPanel() {
  const { projectPath } = usePbsEntityContext();

  const loadFn = useCallback(() => loadAbilities(projectPath), [projectPath]);
  const saveFn = useCallback((items: AbilityEntry[]) => saveAbilities(projectPath, items), [projectPath]);

  const { items, selectedId, selected, dirty, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-abilities", getId, loadFn, saveFn);

  const handleAdd = () => {
    const id = `ABILITY_${Date.now()}`;
    add({ id, name: "New Ability", description: "", flags: [] });
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(a) => `${a.id} — ${a.name}`}
        onSelect={select}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
        dirty={dirty}
      />

      {/* Detail panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: 16 }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!selected && !loading && (
          <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select an ability to edit.</div>
        )}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69", borderBottom: "1px solid #ccd0da", paddingBottom: 8 }}>
              {selected.name}
              <span style={{ fontSize: 11, fontWeight: 400, color: "#8c8fa1", marginLeft: 8 }}>{selected.id}</span>
            </div>

            <Field label="Internal ID">
              <input
                value={selected.id}
                onChange={(e) => update(selected.id, { id: e.target.value })}
                style={inputStyle}
              />
            </Field>

            <Field label="Name">
              <input
                value={selected.name}
                onChange={(e) => update(selected.id, { name: e.target.value })}
                style={inputStyle}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={selected.description}
                onChange={(e) => update(selected.id, { description: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>

            <Field label="Flags">
              <ChipListEditor values={selected.flags} onChange={(v) => update(selected.id, { flags: v })} placeholder="Add flag…" />
            </Field>
          </div>
        )}
      </div>
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

const inputStyle: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12,
  border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69",
  width: "100%", boxSizing: "border-box",
};
