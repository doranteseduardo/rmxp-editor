import type { RpgCommonEvent } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";

interface Props { projectPath: string }

const TRIGGERS = ["None", "Autorun", "Parallel Process"];

const DEFAULT: RpgCommonEvent = {
  __class: "RPG::CommonEvent", id: 0, name: "New Common Event",
  trigger: 0, switch_id: 1,
  list: [{ code: 0, indent: 0, parameters: [] }],
};

export function CommonEventsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "CommonEvents.rxdata");
  const ce = db.selected as RpgCommonEvent | null;

  if (db.loading) return <div className="db-loading">Loading Common Events...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgCommonEvent>) => db.update(patch);

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
                <div className="db-field"><span className="db-field-label">Condition Switch</span><input type="number" value={ce.switch_id} min={1} onChange={e => u({ switch_id: +e.target.value })} /></div>
              )}
            </div>
            <div className="db-section">
              <div className="db-section-title">Event Commands</div>
              <div className="db-sublist" style={{ maxHeight: 400 }}>
                {ce.list.map((cmd, i) => {
                  if (cmd.code === 0) return null;
                  const indent = "  ".repeat(cmd.indent);
                  return (
                    <div key={i} className="db-sublist-item" style={{ fontFamily: "monospace", fontSize: 10 }}>
                      {indent}[{cmd.code}] {cmd.parameters.length > 0 ? JSON.stringify(cmd.parameters).slice(0, 60) : ""}
                    </div>
                  );
                })}
                {ce.list.length <= 1 && <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>Empty event list</div>}
              </div>
              <div style={{ fontSize: 10, color: "#6c7086", marginTop: 4 }}>{ce.list.length} command(s)</div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a common event</div>
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
