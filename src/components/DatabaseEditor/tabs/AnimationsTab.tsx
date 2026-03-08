import type { RpgAnimation, RpgAnimationTiming, RpgAudioFile } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { useEditorRegistration } from "../../context/ProjectSaveContext";
import { AssetPicker } from "../controls/AssetPicker";
import { AnimationFrameEditor } from "../controls/AnimationFrameEditor";
import { useState } from "react";

interface Props { projectPath: string }

const POSITIONS = ["Top", "Middle", "Bottom", "Screen"];
const FLASH_SCOPES = ["None", "Target", "Screen", "Hide Target"];

const DEFAULT: RpgAnimation = {
  __class: "RPG::Animation", id: 0, name: "New Animation",
  animation_name: "", animation_hue: 0, position: 1, frame_max: 1,
  frames: [], timings: [],
};

export function AnimationsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Animations.rxdata");
  useEditorRegistration("db-Animations.rxdata", db.save, db.cancel, db.dirty);
  const a = db.selected as RpgAnimation | null;
  const [selTiming, setSelTiming] = useState(-1);

  if (db.loading) return <div className="db-loading">Loading Animations...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgAnimation>) => db.update(patch);

  const addTiming = () => {
    if (!a) return;
    const t: RpgAnimationTiming = {
      __class: "RPG::Animation::Timing",
      frame: 0,
      se: { name: "", volume: 80, pitch: 100 } as RpgAudioFile,
      flash_scope: 0,
      flash_color: { __class: "Color", red: 255, green: 255, blue: 255, alpha: 255 },
      flash_duration: 5,
      condition: 0,
    };
    u({ timings: [...a.timings, t] });
  };

  const updateTiming = (idx: number, patch: Partial<RpgAnimationTiming>) => {
    if (!a) return;
    const copy = [...a.timings];
    copy[idx] = { ...copy[idx], ...patch };
    u({ timings: copy });
  };

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="animations" />
        {a ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={a.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Animation</span><AssetPicker projectPath={projectPath} assetType="Animations" value={a.animation_name} onChange={v => u({ animation_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Hue</span><input type="number" value={a.animation_hue} min={0} max={360} onChange={e => u({ animation_hue: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Position</span>
                    <select value={a.position} onChange={e => u({ position: +e.target.value })}>{POSITIONS.map((p, i) => <option key={i} value={i}>{p}</option>)}</select>
                  </div>
                  <div className="db-field"><span className="db-field-label">Frames</span><input type="number" value={a.frame_max} min={1} onChange={e => u({ frame_max: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Frame Data</div>
                  <AnimationFrameEditor frames={a.frames} frameMax={a.frame_max} timings={a.timings} onChange={frames => u({ frames })} />
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Timing / SE</div>
                  <div className="db-sublist">
                    {a.timings.map((t, i) => (
                      <div key={i} className={`db-sublist-item${selTiming === i ? " selected" : ""}`} onClick={() => setSelTiming(i)}>
                        Frame {t.frame}: {t.se?.name || "(no SE)"} — {FLASH_SCOPES[t.flash_scope] ?? `Flash ${t.flash_scope}`}
                      </div>
                    ))}
                    {a.timings.length === 0 && <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>No timings</div>}
                  </div>
                  <div className="db-sublist-toolbar">
                    <button onClick={addTiming}>+ Add</button>
                    <button
                      disabled={selTiming < 0}
                      onClick={() => {
                        if (selTiming >= 0 && a) {
                          u({ timings: a.timings.filter((_, i) => i !== selTiming) });
                          setSelTiming(-1);
                        }
                      }}
                    >Remove</button>
                  </div>
                  {selTiming >= 0 && a.timings[selTiming] && (
                    <div style={{ marginTop: 8 }}>
                      <div className="db-field"><span className="db-field-label">Frame</span><input type="number" value={a.timings[selTiming].frame} min={0} onChange={e => updateTiming(selTiming, { frame: +e.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">SE Name</span><input type="text" value={a.timings[selTiming].se?.name ?? ""} onChange={e => updateTiming(selTiming, { se: { ...(a.timings[selTiming].se ?? { name: "", volume: 80, pitch: 100 }), name: e.target.value } as RpgAudioFile })} /></div>
                      <div className="db-field"><span className="db-field-label">SE Volume</span><input type="number" value={a.timings[selTiming].se?.volume ?? 80} min={0} max={100} onChange={e => updateTiming(selTiming, { se: { ...(a.timings[selTiming].se ?? { name: "", volume: 80, pitch: 100 }), volume: +e.target.value } as RpgAudioFile })} /></div>
                      <div className="db-field"><span className="db-field-label">SE Pitch</span><input type="number" value={a.timings[selTiming].se?.pitch ?? 100} min={50} max={150} onChange={e => updateTiming(selTiming, { se: { ...(a.timings[selTiming].se ?? { name: "", volume: 80, pitch: 100 }), pitch: +e.target.value } as RpgAudioFile })} /></div>
                      <div className="db-field"><span className="db-field-label">Flash Scope</span>
                        <select value={a.timings[selTiming].flash_scope} onChange={e => updateTiming(selTiming, { flash_scope: +e.target.value })}>{FLASH_SCOPES.map((s, i) => <option key={i} value={i}>{s}</option>)}</select>
                      </div>
                      <div className="db-field"><span className="db-field-label">Flash Duration</span><input type="number" value={a.timings[selTiming].flash_duration} min={0} onChange={e => updateTiming(selTiming, { flash_duration: +e.target.value })} /></div>
                    </div>
                  )}
                </div>
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
          <button className="db-cancel-btn" onClick={db.cancel}>Cancel</button>
          <button className="db-save-btn" onClick={db.save} disabled={db.loading}>Save</button>
        </div>
      )}
    </>
  );
}
