import type { RpgClass, RpgClassLearning } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { SetEditor } from "../controls/SetEditor";
import { RankTableEditor } from "../controls/RankTableEditor";
import { useState } from "react";

interface Props { projectPath: string }

const DEFAULT_CLASS: RpgClass = {
  __class: "RPG::Class", id: 0, name: "New Class", position: 0,
  weapon_set: [], armor_set: [],
  element_ranks: { __class: "Table", dims: 1, x_size: 1, y_size: 1, z_size: 1 },
  state_ranks: { __class: "Table", dims: 1, x_size: 1, y_size: 1, z_size: 1 },
  learnings: [],
};

const POSITIONS = ["Front", "Middle", "Rear"];

export function ClassesTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Classes.rxdata");
  useEditorRegistration("db-Classes.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const c = db.selected as RpgClass | null;
  const [selLearning, setSelLearning] = useState<number>(-1);

  if (db.loading) return <div className="db-loading">Loading Classes...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgClass>) => db.update(patch);

  const addLearning = () => {
    if (!c) return;
    u({ learnings: [...c.learnings, { __class: "RPG::Class::Learning", level: 1, skill_id: 1 }] });
  };
  const updateLearning = (idx: number, patch: Partial<RpgClassLearning>) => {
    if (!c) return;
    const copy = [...c.learnings]; copy[idx] = { ...copy[idx], ...patch }; u({ learnings: copy });
  };
  const removeLearning = (idx: number) => { if (!c) return; u({ learnings: c.learnings.filter((_, i) => i !== idx) }); setSelLearning(-1); };

  const elementRanks: number[] = c?.element_ranks?.data ?? [];
  const stateRanks: number[] = c?.state_ranks?.data ?? [];

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select} onAdd={() => db.addNew(DEFAULT_CLASS)} label="classes" />
        {c ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={c.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Position</span><select value={c.position} onChange={e => u({ position: +e.target.value })}>{POSITIONS.map((p, i) => <option key={i} value={i}>{p}</option>)}</select></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Equippable Weapons</div>
                  <SetEditor value={c.weapon_set} entries={names.weapons} onChange={v => u({ weapon_set: v })} />
                </div>
                <div className="db-section">
                  <div className="db-section-title">Equippable Armor</div>
                  <SetEditor value={c.armor_set} entries={names.armors} onChange={v => u({ armor_set: v })} />
                </div>
                <div className="db-section">
                  <div className="db-section-title">Skills to Learn</div>
                  <div className="db-sublist">
                    {c.learnings.map((l, i) => (
                      <div key={i} className={`db-sublist-item${selLearning === i ? " selected" : ""}`} onClick={() => setSelLearning(i)}>
                        Lv {l.level} → {names.skills.find(s => s.id === l.skill_id)?.name ?? `Skill #${l.skill_id}`}
                      </div>
                    ))}
                    {c.learnings.length === 0 && <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>No skills</div>}
                  </div>
                  <div className="db-sublist-toolbar">
                    <button onClick={addLearning}>+ Add</button>
                    <button onClick={() => selLearning >= 0 && removeLearning(selLearning)} disabled={selLearning < 0}>Remove</button>
                  </div>
                  {selLearning >= 0 && c.learnings[selLearning] && (
                    <div style={{ marginTop: 8 }}>
                      <div className="db-field"><span className="db-field-label">Level</span><input type="number" value={c.learnings[selLearning].level} min={1} onChange={e => updateLearning(selLearning, { level: +e.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Skill</span><IdSelect value={c.learnings[selLearning].skill_id} entries={names.skills} onChange={id => updateLearning(selLearning, { skill_id: id })} /></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Element Efficiency</div>
                  {elementRanks.length > 0 ? (
                    <RankTableEditor ranks={elementRanks} labels={names.elements.slice(1)} onChange={v => u({ element_ranks: { ...c.element_ranks, data: v } })} />
                  ) : <div style={{ fontSize: 11, color: "#6c7086" }}>Element rank data not available.</div>}
                </div>
                <div className="db-section">
                  <div className="db-section-title">State Efficiency</div>
                  {stateRanks.length > 0 ? (
                    <RankTableEditor ranks={stateRanks} labels={names.states.map(s => s.name)} onChange={v => u({ state_ranks: { ...c.state_ranks, data: v } })} />
                  ) : <div style={{ fontSize: 11, color: "#6c7086" }}>State rank data not available.</div>}
                </div>
              </div>
            </div>
          </div>
        ) : <div className="db-detail-empty">Select a class</div>}
      </div>
    </>
  );
}
