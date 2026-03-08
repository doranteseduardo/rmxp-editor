import type { RpgClass, RpgClassLearning } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";
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
  const c = db.selected as RpgClass | null;
  const [selLearning, setSelLearning] = useState<number>(-1);

  if (db.loading) return <div className="db-loading">Loading Classes...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const addLearning = () => {
    if (!c) return;
    const l: RpgClassLearning = { __class: "RPG::Class::Learning", level: 1, skill_id: 1 };
    db.update({ learnings: [...c.learnings, l] } as Partial<RpgClass>);
  };

  const updateLearning = (idx: number, patch: Partial<RpgClassLearning>) => {
    if (!c) return;
    const copy = [...c.learnings];
    copy[idx] = { ...copy[idx], ...patch };
    db.update({ learnings: copy } as Partial<RpgClass>);
  };

  const removeLearning = (idx: number) => {
    if (!c) return;
    db.update({ learnings: c.learnings.filter((_, i) => i !== idx) } as Partial<RpgClass>);
    setSelLearning(-1);
  };

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT_CLASS)} label="classes" />
        {c ? (
          <div className="db-detail-panel">
            <div className="db-section">
              <div className="db-section-title">General</div>
              <div className="db-field">
                <span className="db-field-label">Name</span>
                <input type="text" value={c.name} onChange={e => db.update({ name: e.target.value } as Partial<RpgClass>)} />
              </div>
              <div className="db-field">
                <span className="db-field-label">Position</span>
                <select value={c.position} onChange={e => db.update({ position: +e.target.value } as Partial<RpgClass>)}>
                  {POSITIONS.map((p, i) => <option key={i} value={i}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="db-section">
              <div className="db-section-title">Skills to Learn</div>
              <div className="db-sublist">
                {c.learnings.map((l, i) => (
                  <div key={i} className={`db-sublist-item${selLearning === i ? " selected" : ""}`} onClick={() => setSelLearning(i)}>
                    Lv {l.level} → Skill #{l.skill_id}
                  </div>
                ))}
                {c.learnings.length === 0 && (
                  <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>No skills</div>
                )}
              </div>
              <div className="db-sublist-toolbar">
                <button onClick={addLearning}>+ Add</button>
                <button onClick={() => selLearning >= 0 && removeLearning(selLearning)} disabled={selLearning < 0}>Remove</button>
              </div>
              {selLearning >= 0 && c.learnings[selLearning] && (
                <div style={{ marginTop: 8 }}>
                  <div className="db-field">
                    <span className="db-field-label">Level</span>
                    <input type="number" value={c.learnings[selLearning].level} min={1}
                      onChange={e => updateLearning(selLearning, { level: +e.target.value })} />
                  </div>
                  <div className="db-field">
                    <span className="db-field-label">Skill ID</span>
                    <input type="number" value={c.learnings[selLearning].skill_id} min={1}
                      onChange={e => updateLearning(selLearning, { skill_id: +e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a class</div>
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
