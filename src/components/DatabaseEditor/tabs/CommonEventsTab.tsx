import type { RpgCommonEvent } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { EventCommandList } from "../controls/EventCommandList";

interface Props { projectPath: string }

const TRIGGERS = ["None", "Autorun", "Parallel Process"];

const DEFAULT: RpgCommonEvent = {
  __class: "RPG::CommonEvent", id: 0, name: "New Common Event",
  trigger: 0, switch_id: 1,
  list: [{ code: 0, indent: 0, parameters: [] }],
};

export function CommonEventsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "CommonEvents.rxdata");
  useEditorRegistration("db-CommonEvents.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const ce = db.selected as RpgCommonEvent | null;

  if (db.loading) return <div className="db-loading">Loading Common Events...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgCommonEvent>) => db.update(patch);

  // Build switch name for display
  const switchName = (id: number) => {
    const name = names.switches[id];
    return name ? `[${String(id).padStart(4, "0")}] ${name}` : `Switch ${String(id).padStart(4, "0")}`;
  };

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="common events" />
        {ce ? (
          <div className="db-detail-panel">
            <div className="db-section">
              <div className="db-section-title">General</div>
              <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={ce.name} onChange={e => u({ name: e.target.value })} /></div>
              <div className="db-field"><span className="db-field-label">Trigger</span>
                <select value={ce.trigger} onChange={e => u({ trigger: +e.target.value })}>{TRIGGERS.map((t, i) => <option key={i} value={i}>{t}</option>)}</select>
              </div>
              {ce.trigger > 0 && (
                <div className="db-field">
                  <span className="db-field-label">Condition Switch</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" value={ce.switch_id} min={1} style={{ width: 60 }} onChange={e => u({ switch_id: +e.target.value })} />
                    <span style={{ fontSize: 10, color: "#a6adc8" }}>{switchName(ce.switch_id)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="db-section">
              <div className="db-section-title">Event Commands</div>
              <EventCommandList commands={ce.list} maxHeight={400} onChange={list => u({ list })} />
              <div style={{ fontSize: 10, color: "#6c7086", marginTop: 4 }}>{ce.list.length} command(s)</div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a common event</div>
        )}
      </div>
    </>
  );
}
