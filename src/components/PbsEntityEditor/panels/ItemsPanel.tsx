import { useCallback, useId, useState } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadItems } from "../../../services/pbsUnified";
import { saveItems } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { ItemEntry } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";
import { ChipListEditor } from "../shared/ChipListEditor";

const getId = (it: ItemEntry) => it.id;

const POCKET_NAMES = ["", "Items", "Medicine", "Poké Balls", "TMs & HMs", "Berries", "Mail", "Battle Items", "Key Items"];

function buildAssetUrl(p: string) {
  return `asset://localhost/${encodeURIComponent(p)}`;
}

function ItemIcon({ projectPath, id }: { projectPath: string; id: string }) {
  const [failed, setFailed] = useState(false);
  if (!id || failed) return <span style={{ width: 24, height: 24, display: "inline-block" }} />;
  return (
    <img
      src={buildAssetUrl(`${projectPath}/Graphics/Items/${id}.png`)}
      alt={id}
      onError={() => setFailed(true)}
      style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain" }}
    />
  );
}

export function ItemsPanel() {
  const { projectPath, pbsIndex } = usePbsEntityContext();
  const moveNames = pbsIndex.get("moves.txt") ?? [];
  const moveDlId = useId();

  const loadFn = useCallback(() => loadItems(projectPath), [projectPath]);
  const saveFn = useCallback((items: ItemEntry[]) => saveItems(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-items", getId, loadFn, saveFn);

  const handleAdd = () => {
    add({
      id: `ITEM_${Date.now()}`, name: "New Item", namePlural: "New Items",
      pocket: 1, price: 0, sellPrice: 0, description: "", flags: [],
    });
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(it) => `${it.id} — ${it.name}`}
        renderPrefix={(it) => <ItemIcon projectPath={projectPath} id={it.id} />}
        onSelect={select}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
      />

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!selected && !loading && <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select an item.</div>}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
            {/* Header with large icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #ccd0da", paddingBottom: 8 }}>
              <img
                src={buildAssetUrl(`${projectPath}/Graphics/Items/${selected.id}.png`)}
                alt={selected.id}
                style={{ width: 48, height: 48, imageRendering: "pixelated", objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69" }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: "#8c8fa1" }}>{selected.id} · {POCKET_NAMES[selected.pocket] ?? `Pocket ${selected.pocket}`}</div>
              </div>
            </div>

            <Row2>
              <Field label="Internal ID">
                <input value={selected.id} onChange={(e) => update(selected.id, { id: e.target.value })} style={inp} />
              </Field>
              <Field label="Name">
                <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} style={inp} />
              </Field>
            </Row2>

            <Row2>
              <Field label="Name (Plural)">
                <input value={selected.namePlural} onChange={(e) => update(selected.id, { namePlural: e.target.value })} style={inp} />
              </Field>
              <Field label="Pocket">
                <select value={selected.pocket} onChange={(e) => update(selected.id, { pocket: parseInt(e.target.value, 10) })} style={inp}>
                  {POCKET_NAMES.filter(Boolean).map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </Field>
            </Row2>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Field label="Buy Price">
                <input type="number" value={selected.price} onChange={(e) => update(selected.id, { price: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 90 }} />
              </Field>
              <Field label="Sell Price">
                <input type="number" value={selected.sellPrice ?? ""} onChange={(e) => update(selected.id, { sellPrice: parseInt(e.target.value, 10) || undefined })} placeholder="auto" style={{ ...inp, width: 90 }} />
              </Field>
              <Field label="BP Price">
                <input type="number" value={selected.bpPrice ?? ""} onChange={(e) => update(selected.id, { bpPrice: parseInt(e.target.value, 10) || undefined })} style={{ ...inp, width: 80 }} />
              </Field>
            </div>

            <Row2>
              <Field label="Field Use">
                <select value={selected.fieldUse ?? ""} onChange={(e) => update(selected.id, { fieldUse: e.target.value || undefined })} style={inp}>
                  <option value="">—</option>
                  <option>None</option>
                  <option>OnPokemon</option>
                  <option>Direct</option>
                  <option>TwoHandler</option>
                </select>
              </Field>
              <Field label="Battle Use">
                <select value={selected.battleUse ?? ""} onChange={(e) => update(selected.id, { battleUse: e.target.value || undefined })} style={inp}>
                  <option value="">—</option>
                  <option>None</option>
                  <option>OnPokemon</option>
                  <option>OnMove</option>
                  <option>OnBattler</option>
                </select>
              </Field>
            </Row2>

            <datalist id={moveDlId}>{moveNames.map((n) => <option key={n} value={n} />)}</datalist>
            <Row2>
              <Field label="Move (TM/HM/TR)">
                <input list={moveDlId} value={selected.move ?? ""} onChange={(e) => update(selected.id, { move: e.target.value || undefined })} style={inp} />
              </Field>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4c4f69", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={selected.consumable !== false}
                    onChange={(e) => update(selected.id, { consumable: e.target.checked ? undefined : false })}
                  />
                  Consumable
                </label>
              </div>
            </Row2>

            <Field label="Description">
              <textarea
                value={selected.description}
                onChange={(e) => update(selected.id, { description: e.target.value })}
                rows={3}
                style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>

            <Field label="Flags">
              <ChipListEditor values={selected.flags} onChange={(v) => update(selected.id, { flags: v })} placeholder="e.g. ImportantItem, KeyItem…" />
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
function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}
const inp: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12,
  border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69",
  width: "100%", boxSizing: "border-box",
};
