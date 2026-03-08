import type { RpgActor } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";

interface Props { projectPath: string }

const DEFAULT_ACTOR: RpgActor = {
  __class: "RPG::Actor", id: 0, name: "New Actor", class_id: 1,
  initial_level: 1, final_level: 99, exp_basis: 30, exp_inflation: 30,
  character_name: "", character_hue: 0, battler_name: "", battler_hue: 0,
  parameters: { __class: "Table", dims: 2, x_size: 6, y_size: 100, z_size: 1 },
  weapon_id: 0, armor1_id: 0, armor2_id: 0, armor3_id: 0, armor4_id: 0,
  weapon_fix: false, armor1_fix: false, armor2_fix: false, armor3_fix: false, armor4_fix: false,
};

export function ActorsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Actors.rxdata");
  const a = db.selected as RpgActor | null;

  if (db.loading) return <div className="db-loading">Loading Actors...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT_ACTOR)} label="actors" />
        {a ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field">
                    <span className="db-field-label">Name</span>
                    <input type="text" value={a.name} onChange={e => db.update({ name: e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Class ID</span>
                    <input type="number" value={a.class_id} min={1} onChange={e => db.update({ class_id: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Initial Level</span>
                    <input type="number" value={a.initial_level} min={1} onChange={e => db.update({ initial_level: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Final Level</span>
                    <input type="number" value={a.final_level} min={1} onChange={e => db.update({ final_level: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">EXP Basis</span>
                    <input type="number" value={a.exp_basis} min={10} max={50} onChange={e => db.update({ exp_basis: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">EXP Inflation</span>
                    <input type="number" value={a.exp_inflation} min={10} max={50} onChange={e => db.update({ exp_inflation: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Graphics</div>
                  <div className="db-field">
                    <span className="db-field-label">Character</span>
                    <input type="text" value={a.character_name} onChange={e => db.update({ character_name: e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Character Hue</span>
                    <input type="number" value={a.character_hue} min={0} max={360} onChange={e => db.update({ character_hue: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Battler</span>
                    <input type="text" value={a.battler_name} onChange={e => db.update({ battler_name: e.target.value } as Partial<RpgActor>)} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Battler Hue</span>
                    <input type="number" value={a.battler_hue} min={0} max={360} onChange={e => db.update({ battler_hue: +e.target.value } as Partial<RpgActor>)} />
                  </div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Initial Equipment</div>
                  <div className="db-field">
                    <span className="db-field-label">Weapon ID</span>
                    <input type="number" value={a.weapon_id} min={0} onChange={e => db.update({ weapon_id: +e.target.value } as Partial<RpgActor>)} />
                    <label className="db-check-label"><input type="checkbox" checked={a.weapon_fix} onChange={e => db.update({ weapon_fix: e.target.checked } as Partial<RpgActor>)} /> Fixed</label>
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Shield ID</span>
                    <input type="number" value={a.armor1_id} min={0} onChange={e => db.update({ armor1_id: +e.target.value } as Partial<RpgActor>)} />
                    <label className="db-check-label"><input type="checkbox" checked={a.armor1_fix} onChange={e => db.update({ armor1_fix: e.target.checked } as Partial<RpgActor>)} /> Fixed</label>
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Helmet ID</span>
                    <input type="number" value={a.armor2_id} min={0} onChange={e => db.update({ armor2_id: +e.target.value } as Partial<RpgActor>)} />
                    <label className="db-check-label"><input type="checkbox" checked={a.armor2_fix} onChange={e => db.update({ armor2_fix: e.target.checked } as Partial<RpgActor>)} /> Fixed</label>
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Body Armor ID</span>
                    <input type="number" value={a.armor3_id} min={0} onChange={e => db.update({ armor3_id: +e.target.value } as Partial<RpgActor>)} />
                    <label className="db-check-label"><input type="checkbox" checked={a.armor3_fix} onChange={e => db.update({ armor3_fix: e.target.checked } as Partial<RpgActor>)} /> Fixed</label>
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Accessory ID</span>
                    <input type="number" value={a.armor4_id} min={0} onChange={e => db.update({ armor4_id: +e.target.value } as Partial<RpgActor>)} />
                    <label className="db-check-label"><input type="checkbox" checked={a.armor4_fix} onChange={e => db.update({ armor4_fix: e.target.checked } as Partial<RpgActor>)} /> Fixed</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select an actor</div>
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
