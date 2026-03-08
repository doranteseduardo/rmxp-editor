import type { RpgSkill } from "../../../types/rpgTypes";
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

const DEFAULT_SKILL: RpgSkill = {
  __class: "RPG::Skill", id: 0, name: "New Skill", icon_name: "", description: "",
  scope: 0, occasion: 0, animation1_id: 0, animation2_id: 0,
  menu_se: { name: "", volume: 80, pitch: 100 }, common_event_id: 0,
  sp_cost: 0, power: 0, atk_f: 0, eva_f: 0, str_f: 0, dex_f: 0, agi_f: 0, int_f: 100,
  hit: 100, pdef_f: 0, mdef_f: 100, variance: 15,
  element_set: [], plus_state_set: [], minus_state_set: [],
};

export function SkillsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Skills.rxdata");
  useEditorRegistration("db-Skills.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const s = db.selected as RpgSkill | null;

  if (db.loading) return <div className="db-loading">Loading Skills...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgSkill>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select} onAdd={() => db.addNew(DEFAULT_SKILL)} label="skills" />
        {s ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={s.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Icon</span><AssetPicker projectPath={projectPath} assetType="Icons" value={s.icon_name} onChange={v => u({ icon_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Description</span><input type="text" value={s.description} onChange={e => u({ description: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Scope</span><select value={s.scope} onChange={e => u({ scope: +e.target.value })}>{SCOPES.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
                  <div className="db-field"><span className="db-field-label">Occasion</span><select value={s.occasion} onChange={e => u({ occasion: +e.target.value })}>{OCCASIONS.map((l, i) => <option key={i} value={i}>{l}</option>)}</select></div>
                  <div className="db-field"><span className="db-field-label">SP Cost</span><input type="number" value={s.sp_cost} min={0} onChange={e => u({ sp_cost: +e.target.value })} /></div>
                  <div className="db-field">
                    <span className="db-field-label">Menu SE</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                      <div style={{ flex: 1 }}><AudioAssetPicker projectPath={projectPath} assetType="SE" value={s.menu_se?.name ?? ""} onChange={name => u({ menu_se: { ...s.menu_se, name } })} /></div>
                      <input type="number" style={{ width: 44, textAlign: "center" }} value={s.menu_se?.volume ?? 80} min={0} max={100} title="Volume" onChange={e => u({ menu_se: { ...s.menu_se, volume: +e.target.value } })} />
                      <input type="number" style={{ width: 44, textAlign: "center" }} value={s.menu_se?.pitch ?? 100} min={50} max={150} title="Pitch" onChange={e => u({ menu_se: { ...s.menu_se, pitch: +e.target.value } })} />
                    </div>
                  </div>
                  <div className="db-field"><span className="db-field-label">Common Event</span><IdSelect value={s.common_event_id} entries={names.commonEvents} onChange={id => u({ common_event_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">User Anim</span><IdSelect value={s.animation1_id} entries={names.animations} onChange={id => u({ animation1_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Target Anim</span><IdSelect value={s.animation2_id} entries={names.animations} onChange={id => u({ animation2_id: id })} allowNone /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Power</div>
                  <div className="db-field"><span className="db-field-label">Power</span><input type="number" value={s.power} onChange={e => u({ power: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Hit Rate</span><input type="number" value={s.hit} min={0} max={100} onChange={e => u({ hit: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Variance</span><input type="number" value={s.variance} min={0} onChange={e => u({ variance: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">ATK F</span><input type="number" value={s.atk_f} onChange={e => u({ atk_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">EVA F</span><input type="number" value={s.eva_f} onChange={e => u({ eva_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">STR F</span><input type="number" value={s.str_f} onChange={e => u({ str_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">DEX F</span><input type="number" value={s.dex_f} onChange={e => u({ dex_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">AGI F</span><input type="number" value={s.agi_f} onChange={e => u({ agi_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">INT F</span><input type="number" value={s.int_f} onChange={e => u({ int_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">PDEF F</span><input type="number" value={s.pdef_f} onChange={e => u({ pdef_f: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">MDEF F</span><input type="number" value={s.mdef_f} onChange={e => u({ mdef_f: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Elements</div>
                  <ElementSetEditor value={s.element_set} elements={names.elements} onChange={v => u({ element_set: v })} />
                </div>
                <div className="db-section">
                  <div className="db-section-title">Add State</div>
                  <SetEditor value={s.plus_state_set} entries={names.states} onChange={v => u({ plus_state_set: v })} />
                </div>
                <div className="db-section">
                  <div className="db-section-title">Remove State</div>
                  <SetEditor value={s.minus_state_set} entries={names.states} onChange={v => u({ minus_state_set: v })} />
                </div>
              </div>
            </div>
          </div>
        ) : <div className="db-detail-empty">Select a skill</div>}
      </div>
    </>
  );
}
