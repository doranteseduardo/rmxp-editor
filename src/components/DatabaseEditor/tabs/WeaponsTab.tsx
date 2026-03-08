import type { RpgWeapon } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { AssetPicker } from "../controls/AssetPicker";
import { ElementSetEditor, SetEditor } from "../controls/SetEditor";

interface Props { projectPath: string }

const DEFAULT: RpgWeapon = {
  __class: "RPG::Weapon", id: 0, name: "New Weapon", icon_name: "", description: "",
  animation1_id: 0, animation2_id: 0, price: 0,
  atk: 0, pdef: 0, mdef: 0, str_plus: 0, dex_plus: 0, agi_plus: 0, int_plus: 0,
  element_set: [], plus_state_set: [], minus_state_set: [],
};

export function WeaponsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Weapons.rxdata");
  useEditorRegistration("db-Weapons.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const w = db.selected as RpgWeapon | null;

  if (db.loading) return <div className="db-loading">Loading Weapons...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgWeapon>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select} onAdd={() => db.addNew(DEFAULT)} label="weapons" />
        {w ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={w.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Icon</span><AssetPicker projectPath={projectPath} assetType="Icons" value={w.icon_name} onChange={v => u({ icon_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Description</span><input type="text" value={w.description} onChange={e => u({ description: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Price</span><input type="number" value={w.price} min={0} onChange={e => u({ price: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">User Anim</span><IdSelect value={w.animation1_id} entries={names.animations} onChange={id => u({ animation1_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Target Anim</span><IdSelect value={w.animation2_id} entries={names.animations} onChange={id => u({ animation2_id: id })} allowNone /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Stats</div>
                  <div className="db-field"><span className="db-field-label">ATK</span><input type="number" value={w.atk} onChange={e => u({ atk: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">PDEF</span><input type="number" value={w.pdef} onChange={e => u({ pdef: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">MDEF</span><input type="number" value={w.mdef} onChange={e => u({ mdef: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">STR+</span><input type="number" value={w.str_plus} onChange={e => u({ str_plus: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">DEX+</span><input type="number" value={w.dex_plus} onChange={e => u({ dex_plus: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">AGI+</span><input type="number" value={w.agi_plus} onChange={e => u({ agi_plus: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">INT+</span><input type="number" value={w.int_plus} onChange={e => u({ int_plus: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section"><div className="db-section-title">Elements</div><ElementSetEditor value={w.element_set} elements={names.elements} onChange={v => u({ element_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Add State</div><SetEditor value={w.plus_state_set} entries={names.states} onChange={v => u({ plus_state_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Remove State</div><SetEditor value={w.minus_state_set} entries={names.states} onChange={v => u({ minus_state_set: v })} /></div>
              </div>
            </div>
          </div>
        ) : <div className="db-detail-empty">Select a weapon</div>}
      </div>
      {db.dirty && <div className="db-save-bar"><span className="db-dirty">Unsaved changes</span><button className="db-cancel-btn" onClick={db.cancel}>Cancel</button><button className="db-save-btn" onClick={db.save} disabled={db.loading}>Save</button></div>}
    </>
  );
}
