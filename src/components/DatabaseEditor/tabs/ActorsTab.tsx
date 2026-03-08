import type { RpgActor } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { AssetPicker } from "../controls/AssetPicker";
import { ParameterCurveEditor } from "../controls/ParameterCurveEditor";

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
  const names = useDatabaseNames();
  const a = db.selected as RpgActor | null;

  if (db.loading) return <div className="db-loading">Loading Actors...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgActor>) => db.update(patch);
  const paramValues: number[] = (a?.parameters as unknown as { data?: number[] })?.data ?? [];

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
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={a.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Class</span><IdSelect value={a.class_id} entries={names.classes} onChange={id => u({ class_id: id })} /></div>
                  <div className="db-field"><span className="db-field-label">Initial Level</span><input type="number" value={a.initial_level} min={1} onChange={e => u({ initial_level: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Final Level</span><input type="number" value={a.final_level} min={1} onChange={e => u({ final_level: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">EXP Basis</span><input type="number" value={a.exp_basis} min={10} max={50} onChange={e => u({ exp_basis: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">EXP Inflation</span><input type="number" value={a.exp_inflation} min={10} max={50} onChange={e => u({ exp_inflation: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Graphics</div>
                  <div className="db-field"><span className="db-field-label">Character</span><AssetPicker projectPath={projectPath} assetType="Characters" value={a.character_name} onChange={v => u({ character_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Char Hue</span><input type="number" value={a.character_hue} min={0} max={360} onChange={e => u({ character_hue: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Battler</span><AssetPicker projectPath={projectPath} assetType="Battlers" value={a.battler_name} onChange={v => u({ battler_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Battler Hue</span><input type="number" value={a.battler_hue} min={0} max={360} onChange={e => u({ battler_hue: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Initial Equipment</div>
                  <div className="db-field"><span className="db-field-label">Weapon</span><IdSelect value={a.weapon_id} entries={names.weapons} onChange={id => u({ weapon_id: id })} allowNone /><label className="db-check-label"><input type="checkbox" checked={a.weapon_fix} onChange={e => u({ weapon_fix: e.target.checked })} /> Fixed</label></div>
                  <div className="db-field"><span className="db-field-label">Shield</span><IdSelect value={a.armor1_id} entries={names.armors} onChange={id => u({ armor1_id: id })} allowNone /><label className="db-check-label"><input type="checkbox" checked={a.armor1_fix} onChange={e => u({ armor1_fix: e.target.checked })} /> Fixed</label></div>
                  <div className="db-field"><span className="db-field-label">Helmet</span><IdSelect value={a.armor2_id} entries={names.armors} onChange={id => u({ armor2_id: id })} allowNone /><label className="db-check-label"><input type="checkbox" checked={a.armor2_fix} onChange={e => u({ armor2_fix: e.target.checked })} /> Fixed</label></div>
                  <div className="db-field"><span className="db-field-label">Body Armor</span><IdSelect value={a.armor3_id} entries={names.armors} onChange={id => u({ armor3_id: id })} allowNone /><label className="db-check-label"><input type="checkbox" checked={a.armor3_fix} onChange={e => u({ armor3_fix: e.target.checked })} /> Fixed</label></div>
                  <div className="db-field"><span className="db-field-label">Accessory</span><IdSelect value={a.armor4_id} entries={names.armors} onChange={id => u({ armor4_id: id })} allowNone /><label className="db-check-label"><input type="checkbox" checked={a.armor4_fix} onChange={e => u({ armor4_fix: e.target.checked })} /> Fixed</label></div>
                </div>
              </div>
            </div>
            <div className="db-section">
              <div className="db-section-title">Parameters (6 stats x 99 levels)</div>
              {paramValues.length > 0 ? (
                <ParameterCurveEditor values={paramValues} onChange={(vals) => u({ parameters: { ...a.parameters, data: vals } as unknown as RpgActor["parameters"] })} />
              ) : (
                <div style={{ fontSize: 11, color: "#6c7086" }}>Parameter data in binary Table format — preserved on save.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select an actor</div>
        )}
      </div>
      {db.dirty && (
        <div className="db-save-bar"><span className="db-dirty">Unsaved changes</span><button className="db-save-btn" onClick={db.save} disabled={db.loading}>Save</button></div>
      )}
    </>
  );
}
