import type { RpgState } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { ElementSetEditor, SetEditor } from "../controls/SetEditor";

interface Props { projectPath: string }

const RESTRICTIONS = ["None", "Can't Use Magic", "Always Attack Enemies", "Always Attack Allies", "Can't Move"];

const DEFAULT: RpgState = {
  __class: "RPG::State", id: 0, name: "New State", animation_id: 0,
  restriction: 0, nonresistance: false, zero_hp: false, cant_get_exp: false,
  cant_evade: false, slip_damage: false, rating: 5, hit_rate: 100,
  maxhp_rate: 100, maxsp_rate: 100, str_rate: 100, dex_rate: 100, agi_rate: 100, int_rate: 100,
  atk_rate: 100, pdef_rate: 100, mdef_rate: 100, eva: 0,
  battle_only: true, hold_turn: 0, auto_release_prob: 0, shock_release_prob: 0,
  guard_element_set: [], plus_state_set: [], minus_state_set: [],
};

export function StatesTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "States.rxdata");
  useEditorRegistration("db-States.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const s = db.selected as RpgState | null;

  if (db.loading) return <div className="db-loading">Loading States...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#d20f39" }}>{db.error}</div>;

  const u = (patch: Partial<RpgState>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="states" />
        {s ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={s.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Animation</span><IdSelect value={s.animation_id} entries={names.animations} onChange={id => u({ animation_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Restriction</span>
                    <select value={s.restriction} onChange={e => u({ restriction: +e.target.value })}>{RESTRICTIONS.map((r, i) => <option key={i} value={i}>{r}</option>)}</select>
                  </div>
                  <div className="db-field"><span className="db-field-label">Rating</span><input type="number" value={s.rating} min={0} max={10} onChange={e => u({ rating: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Flags</div>
                  <div className="db-field"><span className="db-field-label" /><label className="db-check-label"><input type="checkbox" checked={s.nonresistance} onChange={e => u({ nonresistance: e.target.checked })} /> Nonresistance</label></div>
                  <div className="db-field"><span className="db-field-label" /><label className="db-check-label"><input type="checkbox" checked={s.zero_hp} onChange={e => u({ zero_hp: e.target.checked })} /> Zero HP</label></div>
                  <div className="db-field"><span className="db-field-label" /><label className="db-check-label"><input type="checkbox" checked={s.cant_get_exp} onChange={e => u({ cant_get_exp: e.target.checked })} /> Can't Get EXP</label></div>
                  <div className="db-field"><span className="db-field-label" /><label className="db-check-label"><input type="checkbox" checked={s.cant_evade} onChange={e => u({ cant_evade: e.target.checked })} /> Can't Evade</label></div>
                  <div className="db-field"><span className="db-field-label" /><label className="db-check-label"><input type="checkbox" checked={s.slip_damage} onChange={e => u({ slip_damage: e.target.checked })} /> Slip Damage</label></div>
                  <div className="db-field"><span className="db-field-label" /><label className="db-check-label"><input type="checkbox" checked={s.battle_only} onChange={e => u({ battle_only: e.target.checked })} /> Battle Only</label></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Release</div>
                  <div className="db-field"><span className="db-field-label">Hold Turn</span><input type="number" value={s.hold_turn} min={0} onChange={e => u({ hold_turn: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Auto Release %</span><input type="number" value={s.auto_release_prob} min={0} max={100} onChange={e => u({ auto_release_prob: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Shock Release %</span><input type="number" value={s.shock_release_prob} min={0} max={100} onChange={e => u({ shock_release_prob: +e.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Stat Rates %</div>
                  <div className="db-field"><span className="db-field-label">Hit Rate</span><input type="number" value={s.hit_rate} onChange={e => u({ hit_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Max HP</span><input type="number" value={s.maxhp_rate} onChange={e => u({ maxhp_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Max SP</span><input type="number" value={s.maxsp_rate} onChange={e => u({ maxsp_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">STR</span><input type="number" value={s.str_rate} onChange={e => u({ str_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">DEX</span><input type="number" value={s.dex_rate} onChange={e => u({ dex_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">AGI</span><input type="number" value={s.agi_rate} onChange={e => u({ agi_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">INT</span><input type="number" value={s.int_rate} onChange={e => u({ int_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">ATK</span><input type="number" value={s.atk_rate} onChange={e => u({ atk_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">PDEF</span><input type="number" value={s.pdef_rate} onChange={e => u({ pdef_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">MDEF</span><input type="number" value={s.mdef_rate} onChange={e => u({ mdef_rate: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">EVA</span><input type="number" value={s.eva} onChange={e => u({ eva: +e.target.value })} /></div>
                </div>
                <div className="db-section"><div className="db-section-title">Guard Elements</div><ElementSetEditor value={s.guard_element_set} elements={names.elements} onChange={v => u({ guard_element_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Add State</div><SetEditor value={s.plus_state_set} entries={names.states} onChange={v => u({ plus_state_set: v })} /></div>
                <div className="db-section"><div className="db-section-title">Remove State</div><SetEditor value={s.minus_state_set} entries={names.states} onChange={v => u({ minus_state_set: v })} /></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a state</div>
        )}
      </div>
    </>
  );
}
