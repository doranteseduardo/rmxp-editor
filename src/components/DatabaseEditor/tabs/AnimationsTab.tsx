import type { RpgAnimation } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";

interface Props { projectPath: string }

const POSITIONS = ["Top", "Middle", "Bottom", "Screen"];

const DEFAULT: RpgAnimation = {
  __class: "RPG::Animation", id: 0, name: "New Animation",
  animation_name: "", animation_hue: 0, position: 1, frame_max: 1,
  frames: [], timings: [],
};

export function AnimationsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Animations.rxdata");
  const a = db.selected as RpgAnimation | null;

  if (db.loading) return <div className="db-loading">Loading Animations...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgAnimation>) => db.update(patch);

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="animations" />
        {a ? (
          <div className="db-detail-panel">
            <div className="db-section">
              <div className="db-section-title">General</div>
              <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={a.name} onChange={e => u({ name: e.target.value })} /></div>
              <div className="db-field"><span className="db-field-label">Animation File</span><input type="text" value={a.animation_name} onChange={e => u({ animation_name: e.target.value })} /></div>
              <div className="db-field"><span className="db-field-label">Hue</span><input type="number" value={a.animation_hue} min={0} max={360} onChange={e => u({ animation_hue: +e.target.value })} /></div>
              <div className="db-field"><span className="db-field-label">Position</span>
                <select value={a.position} onChange={e => u({ position: +e.target.value })}>{POSITIONS.map((p, i) => <option key={i} value={i}>{p}</option>)}</select>
              </div>
              <div className="db-field"><span className="db-field-label">Frames</span><input type="number" value={a.frame_max} min={1} onChange={e => u({ frame_max: +e.target.value })} /></div>
            </div>
            <div className="db-section">
              <div className="db-section-title">Frame Data</div>
              <div style={{ fontSize: 11, color: "#6c7086" }}>{a.frames.length} frame(s) defined</div>
            </div>
            <div className="db-section">
              <div className="db-section-title">Timing / SE</div>
              <div className="db-sublist">
                {a.timings.map((t, i) => (
                  <div key={i} className="db-sublist-item">
                    Frame {t.frame}: {t.se?.name || "(none)"} — Flash scope {t.flash_scope}
                  </div>
                ))}
                {a.timings.length === 0 && <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>No timings</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select an animation</div>
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
