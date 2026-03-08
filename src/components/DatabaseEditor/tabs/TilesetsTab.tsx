import type { RpgTileset } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { useEditorRegistration } from "../../context/ProjectSaveContext";
import { AssetPicker } from "../controls/AssetPicker";

interface Props { projectPath: string }

const BLEND_TYPES = ["Normal", "Add", "Sub"];

const DEFAULT: RpgTileset = {
  __class: "RPG::Tileset", id: 0, name: "New Tileset",
  tileset_name: "", autotile_names: ["", "", "", "", "", "", ""],
  panorama_name: "", panorama_hue: 0,
  fog_name: "", fog_hue: 0, fog_opacity: 64, fog_blend_type: 0, fog_zoom: 200, fog_sx: 0, fog_sy: 0,
  battleback_name: "",
  passages: { __class: "Table" }, priorities: { __class: "Table" }, terrain_tags: { __class: "Table" },
};

export function TilesetsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Tilesets.rxdata");
  useEditorRegistration("db-Tilesets.rxdata", db.save, db.cancel, db.dirty);
  const t = db.selected as RpgTileset | null;

  if (db.loading) return <div className="db-loading">Loading Tilesets...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgTileset>) => db.update(patch);

  const updateAutotile = (idx: number, val: string) => {
    if (!t) return;
    const copy = [...t.autotile_names];
    copy[idx] = val;
    u({ autotile_names: copy });
  };

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="tilesets" />
        {t ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={t.name} onChange={e => u({ name: e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Tileset</span><AssetPicker projectPath={projectPath} assetType="Tilesets" value={t.tileset_name} onChange={v => u({ tileset_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Battleback</span><AssetPicker projectPath={projectPath} assetType="Battlebacks" value={t.battleback_name} onChange={v => u({ battleback_name: v })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Autotiles (7 slots)</div>
                  {t.autotile_names.map((at, i) => (
                    <div key={i} className="db-field">
                      <span className="db-field-label">Slot {i + 1}</span>
                      <AssetPicker projectPath={projectPath} assetType="Autotiles" value={at} onChange={v => updateAutotile(i, v)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Panorama</div>
                  <div className="db-field"><span className="db-field-label">Name</span><AssetPicker projectPath={projectPath} assetType="Panoramas" value={t.panorama_name} onChange={v => u({ panorama_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Hue</span><input type="number" value={t.panorama_hue} min={0} max={360} onChange={e => u({ panorama_hue: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Fog</div>
                  <div className="db-field"><span className="db-field-label">Name</span><AssetPicker projectPath={projectPath} assetType="Fogs" value={t.fog_name} onChange={v => u({ fog_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Hue</span><input type="number" value={t.fog_hue} min={0} max={360} onChange={e => u({ fog_hue: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Opacity</span><input type="number" value={t.fog_opacity} min={0} max={255} onChange={e => u({ fog_opacity: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Blend Type</span>
                    <select value={t.fog_blend_type} onChange={e => u({ fog_blend_type: +e.target.value })}>{BLEND_TYPES.map((b, i) => <option key={i} value={i}>{b}</option>)}</select>
                  </div>
                  <div className="db-field"><span className="db-field-label">Zoom %</span><input type="number" value={t.fog_zoom} min={100} onChange={e => u({ fog_zoom: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">SX</span><input type="number" value={t.fog_sx} onChange={e => u({ fog_sx: +e.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">SY</span><input type="number" value={t.fog_sy} onChange={e => u({ fog_sy: +e.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Tile Data</div>
                  <div style={{ fontSize: 10, color: "#6c7086" }}>
                    Passages, priorities, and terrain tags are stored as binary Table data and are preserved on save.
                    Use the Tileset Editor in map view for visual tile property editing.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a tileset</div>
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
