import type { RpgItem } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";

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
  const item = db.selected as RpgItem | null;

  if (db.loading) return <div className="db-loading">Loading Items...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgItem>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT_ITEM)} label="items" />
        {item ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={item.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Icon</span><input type="text" value={item.icon_name} onChange={e => u({ icon_name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Description</span><input type="text" value={item.description} onChange={e => u({ description: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Scope</span>
                    <select value={item.scope} onChange={e => u({ scope: +e.target.value })}>{SCOPES.map((l, i) => <option key={i} value={i}>{l}</option>)}</select>
                  </div>
                  <div className="db-field"><span className="db-field-label">Occasion</span>
                    <select value={item.occasion} onChange={e => u({ occasion: +e.target.value })}>{OCCASIONS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select>
                  </div>
                  <div className="db-field"><span className="db-field-label">Price</span><input type="number" value={item.price} min={0} onChange={e => u({ price: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Consumable</span>
                    <label className="db-check-label"><input type="checkbox" checked={item.consumable} onChange={e => u({ consumable: e.target.checked })} /> Yes</label>
                  </div>
                  <div className="db-field"><span className="db-field-label">Common Event</span><input type="number" value={item.common_event_id} min={0} onChange={e => u({ common_event_id: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Recovery</div>
                  <div className="db-field"><span className="db-field-label">HP Rate %</span><input type="number" value={item.recover_hp_rate} onChange={e => u({ recover_hp_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">HP +</span><input type="number" value={item.recover_hp} onChange={e => u({ recover_hp: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">SP Rate %</span><input type="number" value={item.recover_sp_rate} onChange={e => u({ recover_sp_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">SP +</span><input type="number" value={item.recover_sp} onChange={e => u({ recover_sp: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Parameter Change</div>
                  <div className="db-field"><span className="db-field-label">Parameter</span>
                    <select value={item.parameter_type} onChange={e => u({ parameter_type: +e.target.value })}>{PARAM_TYPES.map((l, i) => <option key={i} value={i}>{l}</option>)}</select>
                  </div>
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
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select an item</div>
        )}
      </div>
      {db.dirty && (
        <div className="db-save-bar">
          <span className="db-dirty">Unsaved changes</span>
          <button className="db-save-btn" onClick={db.save} disabled={db.loading}>Save</button>
        </div>
      )}
    </>
  );
}
