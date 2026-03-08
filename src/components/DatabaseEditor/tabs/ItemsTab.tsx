import type { RpgItem } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { AssetPicker, AudioAssetPicker } from "../controls/AssetPicker";
import { ElementSetEditor, SetEditor } from "../controls/SetEditor";

interface Props { projectPath: string }

const SCOPES = ["None", "One Enemy", "All Enemies", "One Ally", "All Allies", "1 Ally (HP 0)", "All Allies (HP 0)", "User"];
const OCCASIONS = ["Always", "Battle Only", "Menu Only", "Never"];
const PARAM_TYPES = ["None", "Max HP", "Max SP", "STR", "DEX", "AGI", "INT"];

const DEFAULT_ITEM: RpgItem = {
  __class: "RPG::Item", id: 0, name: "New Item", icon_name: "", description: "",
  scope: 0, occasion: 0, animation1_id: 0, animation2_id: 0,
  menu_se: { name: "", volume: 80, pitch: 100 }, common_event_id: 0,
  price: 0, consumable: true, parameter_type: 0, parameter_points: 0,
  recover_hp_rate: 0, recover_hp: 0, recover_sp_rate: 0, recover_sp: 0,
  hit: 100, pdef_f: 0, mdef_f: 0, variance: 0,
  element_set: [], plus_state_set: [], minus_state_set: [],
};

export function ItemsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Items.rxdata");
  useEditorRegistration("db-Items.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const item = db.selected as RpgItem | null;

  if (db.loading) return <div className="db-loading">Loading Items...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#d20f39" }}>{db.error}</div>;

  const u = (patch: Partial<RpgItem>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select} onAdd={() => db.addNew(DEFAULT_ITEM)} label="items" />
        {item ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={item.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Icon</span><AssetPicker projectPath={projectPath} assetType="Icons" value={item.icon_name} onChange={v => u({ icon_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Description</span><input type="text" value={item.description} onChange={e => u({ description: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Scope</span><select value={item.scope} onChange={e => u({ scope: +e.target.value })}>{SCOPES.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
                  <div className="db-field"><span className="db-field-label">Occasion</span><select value={item.occasion} onChange={e => u({ occasion: +e.target.value })}>{OCCASIONS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
                  <div className="db-field"><span className="db-field-label">Price</span><input type="number" value={item.price} min={0} onChange={e => u({ price: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Consumable</span><label className="db-check-label"><input type="checkbox" checked={item.consumable} onChange={e => u({ consumable: e.target.checked })} /> Yes</label></div>
                  <div className="db-field">
                    <span className="db-field-label">Menu SE</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                      <div style={{ flex: 1 }}><AudioAssetPicker projectPath={projectPath} assetType="SE" value={item.menu_se?.name ?? ""} onChange={name => u({ menu_se: { ...item.menu_se, name } })} /></div>
                      <input type="number" style={{ width: 44, textAlign: "center" }} value={item.menu_se?.volume ?? 80} min={0} max={100} title="Volume" onChange={e => u({ menu_se: { ...item.menu_se, volume: +e.target.value } })} />
                      <input type="number" style={{ width: 44, textAlign: "center" }} value={item.menu_se?.pitch ?? 100} min={50} max={150} title="Pitch" onChange={e => u({ menu_se: { ...item.menu_se, pitch: +e.target.value } })} />
                    </div>
                  </div>
                  <div className="db-field"><span className="db-field-label">Common Event</span><IdSelect value={item.common_event_id} entries={names.commonEvents} onChange={id => u({ common_event_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">User Anim</span><IdSelect value={item.animation1_id} entries={names.animations} onChange={id => u({ animation1_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Target Anim</span><IdSelect value={item.animation2_id} entries={names.animations} onChange={id => u({ animation2_id: id })} allowNone /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Recovery</div>
                  <div className="db-field"><span className="db-field-label">HP Rate %</span><input type="number" value={item.recover_hp_rate} onChange={e => u({ recover_hp_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">HP +</span><input type="number" value={item.recover_hp} onChange={e => u({ recover_hp: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">SP Rate %</span><input type="number" value={item.recover_sp_rate} onChange={e => u({ recover_sp_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">SP +</span><input type="number" value={item.recover_sp} onChange={e => u({ recover_sp: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Parameter Change</div>
                  <div className="db-field"><span className="db-field-label">Parameter</span><select value={item.parameter_type} onChange={e => u({ parameter_type: +e.target.value })}>{PARAM_TYPES.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
                  <div className="db-field"><span className="db-field-label">Points</span><input type="number" value={item.parameter_points} onChange={e => u({ parameter_points: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Accuracy</div>
                  <div className="db-field"><span className="db-field-label">Hit Rate</span><input type="number" value={item.hit} min={0} max={100} onChange={e => u({ hit: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">PDEF F</span><input type="number" value={item.pdef_f} onChange={e => u({ pdef_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">MDEF F</span><input type="number" value={item.mdef_f} onChange={e => u({ mdef_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Variance</span><input type="number" value={item.variance} min={0} onChange={e => u({ variance: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section"><div className="db-section-title">Elements</div><ElementSetEditor value={item.element_set} elements={names.elements} onChange={v => u({ element_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Add State</div><SetEditor value={item.plus_state_set} entries={names.states} onChange={v => u({ plus_state_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Remove State</div><SetEditor value={item.minus_state_set} entries={names.states} onChange={v => u({ minus_state_set: v })} /></div>
              </div>
            </div>
          </div>
        ) : <div className="db-detail-empty">Select an item</div>}
      </div>
    </>
  );
}
