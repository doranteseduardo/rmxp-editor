import type { RpgTroop, RpgTroopMember } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { TroopPositionEditor } from "../controls/TroopPositionEditor";
import { EventCommandList } from "../controls/EventCommandList";
import { useState } from "react";

interface Props { projectPath: string }

const DEFAULT: RpgTroop = {
  __class: "RPG::Troop", id: 0, name: "New Troop",
  members: [], pages: [],
};

export function TroopsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Troops.rxdata");
  const names = useDatabaseNames();
  const t = db.selected as RpgTroop | null;
  const [selMember, setSelMember] = useState(-1);
  const [selPage, setSelPage] = useState(0);

  if (db.loading) return <div className="db-loading">Loading Troops...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgTroop>) => db.update(patch);

  const addMember = () => {
    if (!t) return;
    const m: RpgTroopMember = { __class: "RPG::Troop::Member", enemy_id: 1, x: 320, y: 200, hidden: false, immortal: false };
    u({ members: [...t.members, m] });
  };

  const updateMember = (idx: number, patch: Partial<RpgTroopMember>) => {
    if (!t) return;
    const copy = [...t.members];
    copy[idx] = { ...copy[idx], ...patch };
    u({ members: copy });
  };

  const handleMove = (idx: number, x: number, y: number) => {
    updateMember(idx, { x, y });
  };

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="troops" />
        {t ? (
          <div className="db-detail-panel">
            <div className="db-section">
              <div className="db-section-title">General</div>
              <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={t.name} onChange={e => u({ name: e.target.value })} /></div>
            </div>

            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Formation</div>
                  <TroopPositionEditor
                    members={t.members}
                    enemyNames={names.enemies}
                    selectedIndex={selMember}
                    onSelect={setSelMember}
                    onMove={handleMove}
                  />
                </div>
                <div className="db-section">
                  <div className="db-section-title">Members</div>
                  <div className="db-sublist">
                    {t.members.map((m, i) => (
                      <div key={i} className={`db-sublist-item${selMember === i ? " selected" : ""}`} onClick={() => setSelMember(i)}>
                        {names.enemies.find(en => en.id === m.enemy_id)?.name ?? `Enemy #${m.enemy_id}`} ({m.x},{m.y}){m.hidden ? " [H]" : ""}{m.immortal ? " [I]" : ""}
                      </div>
                    ))}
                    {t.members.length === 0 && <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>No members</div>}
                  </div>
                  <div className="db-sublist-toolbar">
                    <button onClick={addMember}>+ Add</button>
                    <button onClick={() => { if (selMember >= 0) { u({ members: t.members.filter((_, i) => i !== selMember) }); setSelMember(-1); } }} disabled={selMember < 0}>Remove</button>
                  </div>
                  {selMember >= 0 && t.members[selMember] && (
                    <div style={{ marginTop: 8 }}>
                      <div className="db-field"><span className="db-field-label">Enemy</span><IdSelect value={t.members[selMember].enemy_id} entries={names.enemies} onChange={id => updateMember(selMember, { enemy_id: id })} /></div>
                      <div className="db-field"><span className="db-field-label">X</span><input type="number" value={t.members[selMember].x} onChange={e => updateMember(selMember, { x: +e.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Y</span><input type="number" value={t.members[selMember].y} onChange={e => updateMember(selMember, { y: +e.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Hidden</span><label className="db-check-label"><input type="checkbox" checked={t.members[selMember].hidden} onChange={e => updateMember(selMember, { hidden: e.target.checked })} /> Yes</label></div>
                      <div className="db-field"><span className="db-field-label">Immortal</span><label className="db-check-label"><input type="checkbox" checked={t.members[selMember].immortal} onChange={e => updateMember(selMember, { immortal: e.target.checked })} /> Yes</label></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Battle Events</div>
                  {t.pages.length > 0 ? (
                    <>
                      <div style={{ display: "flex", gap: 2, marginBottom: 6, flexWrap: "wrap" }}>
                        {t.pages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSelPage(i)}
                            style={{
                              padding: "2px 8px",
                              fontSize: 10,
                              background: selPage === i ? "#89b4fa" : "#313244",
                              color: selPage === i ? "#1e1e2e" : "#a6adc8",
                              border: "1px solid " + (selPage === i ? "#89b4fa" : "#45475a"),
                              borderRadius: 2,
                              cursor: "pointer",
                            }}
                          >
                            Page {i + 1}
                          </button>
                        ))}
                      </div>
                      {t.pages[selPage] && (
                        <>
                          <div style={{ fontSize: 10, color: "#6c7086", marginBottom: 4 }}>
                            Span: {t.pages[selPage].span === 0 ? "Battle" : t.pages[selPage].span === 1 ? "Turn" : "Moment"}
                          </div>
                          <EventCommandList commands={t.pages[selPage].list} maxHeight={350} />
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#6c7086" }}>No battle event pages</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a troop</div>
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
