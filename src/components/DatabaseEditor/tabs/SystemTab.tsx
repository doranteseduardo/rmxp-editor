import { useState, useEffect, useCallback, useRef } from "react";
import type { RpgSystemData, RpgAudioFile } from "../../../types/rpgTypes";
import { loadSystemData, saveSystemData } from "../../../services/tauriApi";
import { useEditorRegistration } from "../../context/ProjectSaveContext";
import { AssetPicker } from "../controls/AssetPicker";

interface Props { projectPath: string }

function AudioField({ label, audio, onChange }: { label: string; audio: RpgAudioFile; onChange: (a: RpgAudioFile) => void }) {
  return (
    <div className="db-field">
      <span className="db-field-label wide">{label}</span>
      <div className="db-audio-field">
        <input type="text" value={audio.name} placeholder="(none)" onChange={e => onChange({ ...audio, name: e.target.value })} />
        <input type="number" className="db-audio-vol" value={audio.volume} min={0} max={100} title="Volume" onChange={e => onChange({ ...audio, volume: +e.target.value })} />
        <input type="number" className="db-audio-pitch" value={audio.pitch} min={50} max={150} title="Pitch" onChange={e => onChange({ ...audio, pitch: +e.target.value })} />
      </div>
    </div>
  );
}

export function SystemTab({ projectPath }: Props) {
  const [sys, setSys] = useState<RpgSystemData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef(projectPath);
  const snapshotRef = useRef<RpgSystemData | null>(null);

  useEffect(() => {
    pathRef.current = projectPath;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDirty(false);

    loadSystemData(projectPath)
      .then(data => {
        if (!cancelled) {
          setSys(data);
          snapshotRef.current = data;
        }
      })
      .catch(err => { if (!cancelled) setError(String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [projectPath]);

  const u = useCallback((patch: Partial<RpgSystemData>) => {
    setSys(prev => prev ? { ...prev, ...patch } : prev);
    setDirty(true);
  }, []);

  const uAudio = useCallback((key: keyof RpgSystemData, audio: RpgAudioFile) => {
    u({ [key]: audio } as Partial<RpgSystemData>);
  }, [u]);

  const save = useCallback(async () => {
    if (!sys) return;
    try {
      setLoading(true);
      setError(null);
      await saveSystemData(pathRef.current, sys);
      snapshotRef.current = sys;
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [sys]);

  const cancel = useCallback(() => {
    if (snapshotRef.current) {
      setSys(snapshotRef.current);
      setDirty(false);
    }
  }, []);

  useEditorRegistration("db-System.rxdata", save, cancel, dirty);

  if (loading && !sys) return <div className="db-loading">Loading System...</div>;
  if (error && !sys) return <div className="db-loading" style={{ color: "#f38ba8" }}>{error}</div>;
  if (!sys) return <div className="db-loading">No system data</div>;

  return (
    <>
      <div className="db-content">
        <div className="db-detail-panel" style={{ maxWidth: "100%" }}>
          <div className="db-columns">
            <div className="db-column">
              <div className="db-section">
                <div className="db-section-title">General</div>
                <div className="db-field"><span className="db-field-label wide">Windowskin</span><AssetPicker projectPath={projectPath} assetType="Windowskins" value={sys.windowskin_name} onChange={v => u({ windowskin_name: v })} /></div>
                <div className="db-field"><span className="db-field-label wide">Title Screen</span><AssetPicker projectPath={projectPath} assetType="Titles" value={sys.title_name} onChange={v => u({ title_name: v })} /></div>
                <div className="db-field"><span className="db-field-label wide">Game Over</span><AssetPicker projectPath={projectPath} assetType="Gameovers" value={sys.gameover_name} onChange={v => u({ gameover_name: v })} /></div>
                <div className="db-field"><span className="db-field-label wide">Battle Transition</span><AssetPicker projectPath={projectPath} assetType="Transitions" value={sys.battle_transition} onChange={v => u({ battle_transition: v })} /></div>
                <div className="db-field"><span className="db-field-label wide">Battleback</span><AssetPicker projectPath={projectPath} assetType="Battlebacks" value={sys.battleback_name} onChange={v => u({ battleback_name: v })} /></div>
                <div className="db-field"><span className="db-field-label wide">Battler Graphic</span><AssetPicker projectPath={projectPath} assetType="Battlers" value={sys.battler_name} onChange={v => u({ battler_name: v })} /></div>
                <div className="db-field"><span className="db-field-label wide">Battler Hue</span><input type="number" value={sys.battler_hue} min={0} max={360} onChange={e => u({ battler_hue: +e.target.value })} /></div>
              </div>
              <div className="db-section">
                <div className="db-section-title">Starting Position</div>
                <div className="db-field"><span className="db-field-label wide">Map ID</span><input type="number" value={sys.start_map_id} min={1} onChange={e => u({ start_map_id: +e.target.value })} /></div>
                <div className="db-field"><span className="db-field-label wide">X</span><input type="number" value={sys.start_x} min={0} onChange={e => u({ start_x: +e.target.value })} /></div>
                <div className="db-field"><span className="db-field-label wide">Y</span><input type="number" value={sys.start_y} min={0} onChange={e => u({ start_y: +e.target.value })} /></div>
              </div>
              <div className="db-section">
                <div className="db-section-title">Party Members</div>
                <div style={{ fontSize: 11, color: "#a6adc8" }}>
                  {sys.party_members.length > 0 ? sys.party_members.join(", ") : "(none)"}
                </div>
              </div>
              <div className="db-section">
                <div className="db-section-title">Test</div>
                <div className="db-field"><span className="db-field-label wide">Test Troop ID</span><input type="number" value={sys.test_troop_id} min={1} onChange={e => u({ test_troop_id: +e.target.value })} /></div>
                <div style={{ fontSize: 11, color: "#6c7086" }}>{sys.test_battlers.length} test battler(s)</div>
              </div>
            </div>
            <div className="db-column">
              <div className="db-section">
                <div className="db-section-title">BGM / ME</div>
                <AudioField label="Title BGM" audio={sys.title_bgm} onChange={a => uAudio("title_bgm", a)} />
                <AudioField label="Battle BGM" audio={sys.battle_bgm} onChange={a => uAudio("battle_bgm", a)} />
                <AudioField label="Battle End ME" audio={sys.battle_end_me} onChange={a => uAudio("battle_end_me", a)} />
                <AudioField label="Game Over ME" audio={sys.gameover_me} onChange={a => uAudio("gameover_me", a)} />
              </div>
              <div className="db-section">
                <div className="db-section-title">Sound Effects</div>
                <AudioField label="Cursor SE" audio={sys.cursor_se} onChange={a => uAudio("cursor_se", a)} />
                <AudioField label="Decision SE" audio={sys.decision_se} onChange={a => uAudio("decision_se", a)} />
                <AudioField label="Cancel SE" audio={sys.cancel_se} onChange={a => uAudio("cancel_se", a)} />
                <AudioField label="Buzzer SE" audio={sys.buzzer_se} onChange={a => uAudio("buzzer_se", a)} />
                <AudioField label="Equip SE" audio={sys.equip_se} onChange={a => uAudio("equip_se", a)} />
                <AudioField label="Shop SE" audio={sys.shop_se} onChange={a => uAudio("shop_se", a)} />
                <AudioField label="Save SE" audio={sys.save_se} onChange={a => uAudio("save_se", a)} />
                <AudioField label="Load SE" audio={sys.load_se} onChange={a => uAudio("load_se", a)} />
                <AudioField label="Battle Start SE" audio={sys.battle_start_se} onChange={a => uAudio("battle_start_se", a)} />
                <AudioField label="Escape SE" audio={sys.escape_se} onChange={a => uAudio("escape_se", a)} />
                <AudioField label="Actor Collapse SE" audio={sys.actor_collapse_se} onChange={a => uAudio("actor_collapse_se", a)} />
                <AudioField label="Enemy Collapse SE" audio={sys.enemy_collapse_se} onChange={a => uAudio("enemy_collapse_se", a)} />
              </div>
              <div className="db-section">
                <div className="db-section-title">Vocabulary</div>
                {Object.entries(sys.words).map(([key, val]) => (
                  <div key={key} className="db-field">
                    <span className="db-field-label wide">{key}</span>
                    <input type="text" value={val} onChange={ev => u({ words: { ...sys.words, [key]: ev.target.value } })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {dirty && (
        <div className="db-save-bar">
          <span className="db-dirty">Unsaved changes</span>
          <button className="db-cancel-btn" onClick={cancel}>Cancel</button>
          <button className="db-save-btn" onClick={save} disabled={loading}>Save</button>
        </div>
      )}
    </>
  );
}
