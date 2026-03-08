import type { RpgArmor } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { AssetPicker } from "../controls/AssetPicker";
import { ElementSetEditor, SetEditor } from "../controls/SetEditor";

interface Props { projectPath: string }
const KINDS = ["Shield", "Helmet", "Body Armor", "Accessory"];

const DEFAULT: RpgArmor = {
  __class: "RPG::Armor", id: 0, name: "New Armor", icon_name: "", description: "",
  kind: 0, auto_state_id: 0, price: 0,
  pdef: 0, mdef: 0, eva: 0, str_plus: 0, dex_plus: 0, agi_plus: 0, int_plus: 0,
  guard_element_set: [], guard_state_set: [],
};

export function ArmorsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Armors.rxdata");
  const names = useDatabaseNames();
  const a = db.selected as RpgArmor | null;

  if (db.loading) return <div className="db-loading">Loading Armors...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgArmor>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select} onAdd={() => db.addNew(DEFAULT)} label="armors" />
        {a ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={a.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Icon</span><AssetPicker projectPath={projectPath} assetType="Icons" value={a.icon_name} onChange={v => u({ icon_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Description</span><input type="text" value={a.description} onChange={e => u({ description: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Kind</span><select value={a.kind} onChange={e => u({ kind: +e.target.value })}>{KINDS.map((k, i) => <option key={i} value={i}>{k}</option>)}</select></div>
                  <div className="db-field"><span className="db-field-label">Price</span><input type="number" value={a.price} min={0} onChange={e => u({ price: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Auto State</span><IdSelect value={a.auto_state_id} entries={names.states} onChange={id => u({ auto_state_id: id })} allowNone /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Stats</div>
                  <div className="db-field"><span className="db-field-label">PDEF</span><input type="number" value={a.pdef} onChange={e => u({ pdef: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">MDEF</span><input type="number" value={a.mdef} onChange={e => u({ mdef: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">EVA</span><input type="number" value={a.eva} onChange={e => u({ eva: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">STR+</span><input type="number" value={a.str_plus} onChange={e => u({ str_plus: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">DEX+</span><input type="number" value={a.dex_plus} onChange={e => u({ dex_plus: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">AGI+</span><input type="number" value={a.agi_plus} onChange={e => u({ agi_plus: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">INT+</span><input type="number" value={a.int_plus} onChange={e => u({ int_plus: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section"><div className="db-section-title">Guard Elements</div><ElementSetEditor value={a.guard_element_set} elements={names.elements} onChange={v => u({ guard_element_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Guard States</div><SetEditor value={a.guard_state_set} entries={names.states} onChange={v => u({ guard_state_set: v })} /></div>
              </div>
            </div>
          </div>
        ) : <div className="db-detail-empty">Select an armor</div>}
      </div>
      {db.dirty && <div className="db-save-bar"><span className="db-dirty">Unsaved changes</span><button className="db-save-btn" onClick={db.save} disabled={db.loading}>Save</button></div>}
    </>
  );
}
