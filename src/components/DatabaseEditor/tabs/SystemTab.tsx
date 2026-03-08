import { useState, useEffect, useCallback, useRef } from "react";
import type { RpgSystemData, RpgAudioFile } from "../../../types/rpgTypes";
import { loadSystemData, saveSystemData } from "../../../services/tauriApi";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { useDatabaseNames } from "../DatabaseContext";
import { AssetPicker, AudioAssetPicker } from "../controls/AssetPicker";
import { IdSelect } from "../controls/IdSelect";

interface Props { projectPath: string }

function AudioField({ label, audio, audioType, projectPath, onChange }: {
  label: string;
  audio: RpgAudioFile;
  audioType: string; // "BGM", "BGS", "ME", "SE"
  projectPath: string;
  onChange: (a: RpgAudioFile) => void;
}) {
  return (
    <div className="db-field">
      <span className="db-field-label wide">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
        <div style={{ flex: 1 }}>
          <AudioAssetPicker projectPath={projectPath} assetType={audioType} value={audio.name} onChange={name => onChange({ ...audio, name })} />
        </div>
        <input type="number" style={{ width: 44, textAlign: "center" }} value={audio.volume} min={0} max={100} title="Volume" onChange={e => onChange({ ...audio, volume: +e.target.value })} />
        <input type="number" style={{ width: 44, textAlign: "center" }} value={audio.pitch} min={50} max={150} title="Pitch" onChange={e => onChange({ ...audio, pitch: +e.target.value })} />
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
  const names = useDatabaseNames();

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

  // Party member editing
  const addPartyMember = () => {
    if (!sys) return;
    const nextActor = names.actors.find(a => !sys.party_members.includes(a.id))?.id ?? 1;
    u({ party_members: [...sys.party_members, nextActor] });
  };
  const removePartyMember = (idx: number) => {
    if (!sys) return;
    u({ party_members: sys.party_members.filter((_, i) => i !== idx) });
  };
  const updatePartyMember = (idx: number, actorId: number) => {
    if (!sys) return;
    const copy = [...sys.party_members];
    copy[idx] = actorId;
    u({ party_members: copy });
  };

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
                <div className="db-section-title">Graphics</div>
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
                <div className="db-sublist" style={{ maxHeight: 150 }}>
                  {sys.party_members.map((actorId, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 4px", borderBottom: "1px solid #181825" }}>
                      <span style={{ fontSize: 10, color: "#6c7086", width: 16, textAlign: "right" }}>{idx + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <IdSelect value={actorId} entries={names.actors} onChange={id => updatePartyMember(idx, id)} />
                      </div>
                      <button
                        onClick={() => removePartyMember(idx)}
                        style={{ padding: "1px 6px", fontSize: 10, background: "#313244", color: "#f38ba8", border: "1px solid #45475a", borderRadius: 2, cursor: "pointer" }}
                      >×</button>
                    </div>
                  ))}
                  {sys.party_members.length === 0 && <div style={{ padding: 4, fontSize: 11, color: "#6c7086" }}>No party members</div>}
                </div>
                <div className="db-sublist-toolbar">
                  <button onClick={addPartyMember}>+ Add Member</button>
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
                <AudioField label="Title BGM" audio={sys.title_bgm} audioType="BGM" projectPath={projectPath} onChange={a => uAudio("title_bgm", a)} />
                <AudioField label="Battle BGM" audio={sys.battle_bgm} audioType="BGM" projectPath={projectPath} onChange={a => uAudio("battle_bgm", a)} />
                <AudioField label="Battle End ME" audio={sys.battle_end_me} audioType="ME" projectPath={projectPath} onChange={a => uAudio("battle_end_me", a)} />
                <AudioField label="Game Over ME" audio={sys.gameover_me} audioType="ME" projectPath={projectPath} onChange={a => uAudio("gameover_me", a)} />
              </div>
              <div className="db-section">
                <div className="db-section-title">Sound Effects</div>
                <AudioField label="Cursor SE" audio={sys.cursor_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("cursor_se", a)} />
                <AudioField label="Decision SE" audio={sys.decision_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("decision_se", a)} />
                <AudioField label="Cancel SE" audio={sys.cancel_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("cancel_se", a)} />
                <AudioField label="Buzzer SE" audio={sys.buzzer_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("buzzer_se", a)} />
                <AudioField label="Equip SE" audio={sys.equip_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("equip_se", a)} />
                <AudioField label="Shop SE" audio={sys.shop_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("shop_se", a)} />
                <AudioField label="Save SE" audio={sys.save_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("save_se", a)} />
                <AudioField label="Load SE" audio={sys.load_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("load_se", a)} />
                <AudioField label="Battle Start SE" audio={sys.battle_start_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("battle_start_se", a)} />
                <AudioField label="Escape SE" audio={sys.escape_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("escape_se", a)} />
                <AudioField label="Actor Collapse" audio={sys.actor_collapse_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("actor_collapse_se", a)} />
                <AudioField label="Enemy Collapse" audio={sys.enemy_collapse_se} audioType="SE" projectPath={projectPath} onChange={a => uAudio("enemy_collapse_se", a)} />
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
