import { useState, useMemo, useCallback } from "react";
import type { RpgTileset } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { AssetPicker } from "../controls/AssetPicker";
import { TilePropertyEditor, type PropertyMode } from "../controls/TilePropertyEditor";

interface Props { projectPath: string }

const BLEND_TYPES = ["Normal", "Add", "Sub"];

/** All 6 property modes matching the original RMXP editor */
const TILE_TABS: { mode: PropertyMode; label: string }[] = [
  { mode: "passage",      label: "Passage" },
  { mode: "passage_4dir", label: "Passage (4 Dir)" },
  { mode: "priorities",   label: "Priority" },
  { mode: "bush_flag",    label: "Bush Flag" },
  { mode: "counter_flag", label: "Counter Flag" },
  { mode: "terrain_tags", label: "Terrain Tag" },
];

const DEFAULT: RpgTileset = {
  __class: "RPG::Tileset", id: 0, name: "New Tileset",
  tileset_name: "", autotile_names: ["", "", "", "", "", "", ""],
  panorama_name: "", panorama_hue: 0,
  fog_name: "", fog_hue: 0, fog_opacity: 64, fog_blend_type: 0, fog_zoom: 200, fog_sx: 0, fog_sy: 0,
  battleback_name: "",
  passages: { __class: "Table" }, priorities: { __class: "Table" }, terrain_tags: { __class: "Table" },
};

// In RMXP, the passages table encodes multiple properties per tile:
// Bits 0-3 (0x0F): directional passage flags (down=0x01, left=0x02, right=0x04, up=0x08)
// Bit 6   (0x40): bush flag
// Bit 7   (0x80): counter flag
const BUSH_BIT    = 0x40;
const COUNTER_BIT = 0x80;

/**
 * Extract a virtual boolean array from a bit mask in the passages table.
 * Returns 1 if the bit is set, 0 if not.
 */
function extractBitFlags(passages: number[], bit: number): number[] {
  return passages.map(v => (v & bit) ? 1 : 0);
}

/**
 * Write boolean flag changes back into the passages table by setting/clearing a bit.
 */
function applyBitFlags(passages: number[], flagData: number[], bit: number): number[] {
  return passages.map((v, i) => {
    const flag = flagData[i] ?? 0;
    return flag ? (v | bit) : (v & ~bit);
  });
}

/**
 * Get the data array for the TilePropertyEditor based on the current mode.
 * For passage/passage_4dir: the raw passages table.
 * For bush_flag/counter_flag: extracted boolean array from passages bits.
 * For priorities/terrain_tags: their own tables.
 */
function getTableData(t: RpgTileset, mode: PropertyMode): number[] {
  const passages = t.passages?.data ?? [];
  switch (mode) {
    case "passage":
    case "passage_4dir":
      return passages;
    case "priorities":
      return t.priorities?.data ?? [];
    case "bush_flag":
      return extractBitFlags(passages, BUSH_BIT);
    case "counter_flag":
      return extractBitFlags(passages, COUNTER_BIT);
    case "terrain_tags":
      return t.terrain_tags?.data ?? [];
  }
}

/**
 * Build an update patch for the correct table field when the editor changes data.
 * For bush_flag/counter_flag, we merge the boolean changes back into passages bits.
 */
function makeTablePatch(t: RpgTileset, mode: PropertyMode, data: number[]): Partial<RpgTileset> {
  switch (mode) {
    case "passage":
    case "passage_4dir":
      return { passages: { ...t.passages, data } };
    case "priorities":
      return { priorities: { ...t.priorities, data } };
    case "bush_flag": {
      const passages = t.passages?.data ?? [];
      return { passages: { ...t.passages, data: applyBitFlags(passages, data, BUSH_BIT) } };
    }
    case "counter_flag": {
      const passages = t.passages?.data ?? [];
      return { passages: { ...t.passages, data: applyBitFlags(passages, data, COUNTER_BIT) } };
    }
    case "terrain_tags":
      return { terrain_tags: { ...t.terrain_tags, data } };
  }
}

export function TilesetsTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Tilesets.rxdata");
  useEditorRegistration("db-Tilesets.rxdata", db.save, db.cancel, db.dirty);
  const t = db.selected as RpgTileset | null;
  const [tileTab, setTileTab] = useState<PropertyMode>("passage");

  if (db.loading) return <div className="db-loading">Loading Tilesets...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgTileset>) => db.update(patch);

  const updateAutotile = (idx: number, val: string) => {
    if (!t) return;
    const copy = [...t.autotile_names];
    copy[idx] = val;
    u({ autotile_names: copy });
  };

  const currentData = t ? getTableData(t, tileTab) : [];

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
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Tile Properties</div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 6, flexWrap: "wrap" }}>
                    {TILE_TABS.map(({ mode, label }) => (
                      <button
                        key={mode}
                        onClick={() => setTileTab(mode)}
                        style={{
                          padding: "3px 8px",
                          fontSize: 10,
                          fontWeight: tileTab === mode ? 600 : 400,
                          background: tileTab === mode ? "#89b4fa" : "#313244",
                          color: tileTab === mode ? "#1e1e2e" : "#a6adc8",
                          border: "1px solid " + (tileTab === mode ? "#89b4fa" : "#45475a"),
                          borderRadius: 3,
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {currentData.length > 0 ? (
                    <TilePropertyEditor
                      data={currentData}
                      mode={tileTab}
                      projectPath={projectPath}
                      tilesetName={t.tileset_name}
                      autotileNames={t.autotile_names}
                      onChange={data => u(makeTablePatch(t, tileTab, data))}
                    />
                  ) : (
                    <div style={{ fontSize: 11, color: "#6c7086" }}>No data available for this property</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select a tileset</div>
        )}
      </div>
    </>
  );
}
