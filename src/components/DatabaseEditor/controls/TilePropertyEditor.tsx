/**
 * TilePropertyEditor — visual grid editor for tileset tile properties.
 *
 * Matches the original RMXP editor's 6 property modes:
 * - passage:      simple ○ (passable) / ✕ (impassable) toggle
 * - passage_4dir: per-direction passability (↑↓←→ arrows)
 * - priorities:   integer 0-5
 * - bush_flag:    boolean on/off
 * - counter_flag: boolean on/off
 * - terrain_tags: integer 0-7
 *
 * Autotile slots (IDs 0-383) are shown as one cell per slot (8 total),
 * since all 48 patterns share the same property value.
 * Regular tiles (IDs 384+) use the tileset image as a single CSS background.
 */
import { useState, useRef, useCallback, useEffect } from "react";

export type PropertyMode = "passage" | "passage_4dir" | "priorities" | "bush_flag" | "counter_flag" | "terrain_tags";

interface Props {
  /** Flat i16 data array from the Table */
  data: number[];
  mode: PropertyMode;
  /** Project path for building asset URLs */
  projectPath?: string;
  /** Tileset graphic file name (without extension) */
  tilesetName?: string;
  /** Autotile names array (7 slots) */
  autotileNames?: string[];
  onChange: (data: number[]) => void;
}

const COLS = 8;
const CELL_SIZE = 32;
const AUTOTILE_ID_COUNT = 384;
const AUTOTILE_SLOT_SIZE = 48;

// Passage direction bits
const DIR_DOWN  = 0x01;
const DIR_LEFT  = 0x02;
const DIR_RIGHT = 0x04;
const DIR_UP    = 0x08;

const PRIORITY_COLORS: Record<number, string> = {
  0: "#45475a", 1: "#89b4fa", 2: "#a6e3a1",
  3: "#f9e2af", 4: "#fab387", 5: "#f38ba8",
};

// Pokémon Essentials v21.1 defines terrain tags 0-17:
// 0=None, 1=Ledge, 2=Grass, 3=Sand, 4=Rock, 5=DeepWater, 6=StillWater,
// 7=Water, 8=Waterfall, 9=WaterfallCrest, 10=TallGrass, 11=UnderwaterGrass,
// 12=Ice, 13=Neutral, 14=SootGrass, 15=Bridge, 16=Puddle, 17=NoEffect
const MAX_TERRAIN_TAG = 17;

const TAG_COLORS: Record<number, string> = {
  0: "#45475a",  1: "#89b4fa",  2: "#a6e3a1",  3: "#f9e2af",
  4: "#fab387",  5: "#f38ba8",  6: "#cba6f7",  7: "#94e2d5",
  8: "#74c7ec",  9: "#89dceb", 10: "#b4befe", 11: "#a6e3a1",
  12: "#bac2de", 13: "#6c7086", 14: "#f2cdcd", 15: "#eba0ac",
  16: "#7f849c", 17: "#585b70",
};

const TAG_LABELS: Record<number, string> = {
  0: "None", 1: "Ledge", 2: "Grass", 3: "Sand", 4: "Rock",
  5: "DeepWater", 6: "StillWater", 7: "Water", 8: "Waterfall",
  9: "WfCrest", 10: "TallGrass", 11: "UWGrass", 12: "Ice",
  13: "Neutral", 14: "SootGrass", 15: "Bridge", 16: "Puddle",
  17: "NoEffect",
};

/** Build a Tauri asset protocol URL */
function buildAssetUrl(projectPath: string, subdir: string, name: string): string {
  const fullPath = `${projectPath}/Graphics/${subdir}/${name}.png`;
  return `asset://localhost/${encodeURIComponent(fullPath)}`;
}

/* ─── Overlay badges ──────────────────────────────────────────── */

/** Passage (simple): ○ passable, ✕ blocked */
function PassageBadge({ value }: { value: number }) {
  const blocked = (value & 0x0F) === 0x0F;
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: blocked ? "rgba(243, 139, 168, 0.45)" : "rgba(166, 227, 161, 0.25)",
      color: blocked ? "#f38ba8" : "#a6e3a1",
      fontSize: 14, fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      pointerEvents: "none",
    }}>
      {blocked ? "✕" : "○"}
    </div>
  );
}

/** Passage 4-dir: shows blocked directions as arrows */
function Passage4DirBadge({ value }: { value: number }) {
  const allBlocked = (value & 0x0F) === 0x0F;
  const allOpen = (value & 0x0F) === 0;
  // Show arrows for the BLOCKED directions (bits that are set)
  const arrows: string[] = [];
  if (value & DIR_UP)    arrows.push("↑");
  if (value & DIR_DOWN)  arrows.push("↓");
  if (value & DIR_LEFT)  arrows.push("←");
  if (value & DIR_RIGHT) arrows.push("→");

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: allBlocked ? "rgba(243, 139, 168, 0.45)" : allOpen ? "rgba(166, 227, 161, 0.25)" : "rgba(249, 226, 175, 0.35)",
      color: allBlocked ? "#f38ba8" : allOpen ? "#a6e3a1" : "#f9e2af",
      fontSize: allBlocked || allOpen ? 14 : 9,
      fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      lineHeight: 1,
      pointerEvents: "none",
    }}>
      {allBlocked ? "✕" : allOpen ? "○" : arrows.join("")}
    </div>
  );
}

function PriorityBadge({ value }: { value: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `${PRIORITY_COLORS[value] ?? "#45475a"}55`,
      color: PRIORITY_COLORS[value] ?? "#a6adc8",
      fontSize: 14, fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      pointerEvents: "none",
    }}>
      {value}
    </div>
  );
}

/** Boolean flag badge (bush / counter) */
function FlagBadge({ value, onColor }: { value: number; onColor: string }) {
  const on = value !== 0;
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: on ? `${onColor}55` : "rgba(69, 71, 90, 0.35)",
      color: on ? onColor : "#585b70",
      fontSize: 14, fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      pointerEvents: "none",
    }}>
      {on ? "●" : "·"}
    </div>
  );
}

function TagBadge({ value }: { value: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: `${TAG_COLORS[value] ?? "#45475a"}55`,
      color: TAG_COLORS[value] ?? "#a6adc8",
      fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      pointerEvents: "none",
    }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>{value}</span>
      {value > 0 && (
        <span style={{ fontSize: 5, lineHeight: 1, marginTop: 1, opacity: 0.85 }}>
          {TAG_LABELS[value] ?? ""}
        </span>
      )}
    </div>
  );
}

function Badge({ mode, value }: { mode: PropertyMode; value: number }) {
  switch (mode) {
    case "passage":      return <PassageBadge value={value} />;
    case "passage_4dir": return <Passage4DirBadge value={value} />;
    case "priorities":   return <PriorityBadge value={value} />;
    case "bush_flag":    return <FlagBadge value={value} onColor="#a6e3a1" />;
    case "counter_flag": return <FlagBadge value={value} onColor="#89b4fa" />;
    case "terrain_tags": return <TagBadge value={value} />;
  }
}

/* ─── Value cycling helpers ───────────────────────────────────── */

const HINT_TEXT: Record<PropertyMode, string> = {
  passage:      "Click: toggle ○ passable / ✕ impassable",
  passage_4dir: "Click: toggle direction — Right-click: cycle all",
  priorities:   "Click: cycle 0-5 — Right-click: cycle backwards",
  bush_flag:    "Click: toggle bush flag on/off",
  counter_flag: "Click: toggle counter flag on/off",
  terrain_tags: `Click: cycle 0-${MAX_TERRAIN_TAG} — Right-click: cycle backwards`,
};

/** Forward-cycle a value for left-click */
function cycleForward(mode: PropertyMode, val: number): number {
  switch (mode) {
    case "passage":      return (val & 0x0F) === 0x0F ? 0 : 0x0F;
    case "passage_4dir": return (val & 0x0F) === 0x0F ? 0 : 0x0F; // toggle all
    case "priorities":   return ((val ?? 0) + 1) % 6;
    case "bush_flag":    return val ? 0 : 1;
    case "counter_flag": return val ? 0 : 1;
    case "terrain_tags": return ((val ?? 0) + 1) % (MAX_TERRAIN_TAG + 1);
  }
}

/** Backward-cycle a value for right-click */
function cycleBackward(mode: PropertyMode, val: number): number {
  switch (mode) {
    case "passage":      return (val & 0x0F) === 0x0F ? 0 : 0x0F;
    case "passage_4dir": {
      // Cycle individual direction bits: toggle each direction one at a time
      const cycle = [0, DIR_DOWN, DIR_LEFT, DIR_RIGHT, DIR_UP,
                     DIR_DOWN | DIR_LEFT, DIR_DOWN | DIR_RIGHT, DIR_UP | DIR_LEFT, DIR_UP | DIR_RIGHT,
                     DIR_DOWN | DIR_UP, DIR_LEFT | DIR_RIGHT, 0x0F];
      const idx = cycle.indexOf(val & 0x0F);
      return cycle[(idx + 1) % cycle.length];
    }
    case "priorities":   return ((val ?? 0) - 1 + 6) % 6;
    case "bush_flag":    return val ? 0 : 1;
    case "counter_flag": return val ? 0 : 1;
    case "terrain_tags": return ((val ?? 0) - 1 + MAX_TERRAIN_TAG + 1) % (MAX_TERRAIN_TAG + 1);
  }
}

/* ─── Hook: get tileset image dimensions ──────────────────────── */

function useTilesetSize(projectPath?: string, tilesetName?: string) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!projectPath || !tilesetName) { setSize(null); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setSize({ w: img.width, h: img.height }); };
    img.onerror = () => { if (!cancelled) setSize(null); };
    img.src = buildAssetUrl(projectPath, "Tilesets", tilesetName);
    return () => { cancelled = true; };
  }, [projectPath, tilesetName]);

  return size;
}

/* ─── 4-Dir click handler for individual direction toggling ───── */

function toggle4Dir(val: number, dir: number): number {
  return val ^ dir; // XOR toggles the individual direction bit
}

/* ─── Main Component ───────────────────────────────────────────── */

export function TilePropertyEditor({ data, mode, projectPath, tilesetName, autotileNames, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rows = Math.ceil(data.length / COLS);
  const regularTileStartRow = Math.floor(AUTOTILE_ID_COUNT / COLS);
  const regularTileRows = Math.max(0, rows - regularTileStartRow);

  const tilesetSize = useTilesetSize(projectPath, tilesetName);

  const tilesetBgUrl = (projectPath && tilesetName)
    ? `url("${buildAssetUrl(projectPath, "Tilesets", tilesetName)}")`
    : undefined;

  const autotileBgUrls = (projectPath && autotileNames)
    ? autotileNames.map(name => name ? `url("${buildAssetUrl(projectPath, "Autotiles", name)}")` : null)
    : [];

  /** Left-click handler for regular tiles */
  const handleClick = useCallback((index: number) => {
    const copy = [...data];
    if (mode === "passage_4dir") {
      // In 4-dir mode, left-click cycles through individual directions
      copy[index] = cycleBackward(mode, copy[index] ?? 0);
    } else {
      copy[index] = cycleForward(mode, copy[index] ?? 0);
    }
    onChange(copy);
  }, [data, mode, onChange]);

  /** Right-click handler for regular tiles */
  const handleRightClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const copy = [...data];
    copy[index] = cycleBackward(mode, copy[index] ?? 0);
    onChange(copy);
  }, [data, mode, onChange]);

  /** Left-click for autotile slots — updates all 48 entries */
  const handleAutotileClick = useCallback((slot: number) => {
    const copy = [...data];
    const startIdx = slot * AUTOTILE_SLOT_SIZE;
    const newVal = mode === "passage_4dir"
      ? cycleBackward(mode, copy[startIdx] ?? 0)
      : cycleForward(mode, copy[startIdx] ?? 0);
    for (let i = startIdx; i < startIdx + AUTOTILE_SLOT_SIZE && i < copy.length; i++) {
      copy[i] = newVal;
    }
    onChange(copy);
  }, [data, mode, onChange]);

  /** Right-click for autotile slots — updates all 48 entries */
  const handleAutotileRightClick = useCallback((e: React.MouseEvent, slot: number) => {
    e.preventDefault();
    const copy = [...data];
    const startIdx = slot * AUTOTILE_SLOT_SIZE;
    const newVal = cycleBackward(mode, copy[startIdx] ?? 0);
    for (let i = startIdx; i < startIdx + AUTOTILE_SLOT_SIZE && i < copy.length; i++) {
      copy[i] = newVal;
    }
    onChange(copy);
  }, [data, mode, onChange]);

  if (data.length === 0) {
    return <div style={{ fontSize: 11, color: "#6c7086", padding: 4 }}>No tile data available</div>;
  }

  const gridWidth = COLS * CELL_SIZE;

  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7086", marginBottom: 4 }}>
        {HINT_TEXT[mode]}
      </div>
      <div
        ref={containerRef}
        style={{
          maxHeight: 14 * CELL_SIZE + 2,
          overflowY: "auto",
          border: "1px solid #313244",
          borderRadius: 3,
          background: "#11111b",
        }}
      >
        {/* Autotile section — one cell per slot */}
        <div style={{
          padding: "2px 6px",
          fontSize: 9, fontWeight: 600,
          color: "#6c7086", background: "#181825",
          borderBottom: "1px solid #313244",
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          Autotiles
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
          {Array.from({ length: Math.min(8, Math.ceil(Math.min(data.length, AUTOTILE_ID_COUNT) / AUTOTILE_SLOT_SIZE)) }, (_, slot) => {
            const startIdx = slot * AUTOTILE_SLOT_SIZE;
            if (startIdx >= data.length) return null;
            const val = data[startIdx] ?? 0;
            const atName = slot === 0 ? "" : (autotileNames?.[slot - 1] ?? "");
            const atBgUrl = slot > 0 ? autotileBgUrls[slot - 1] : null;
            const isHovered = hoveredIdx === -(slot + 1);

            return (
              <div key={slot} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  onClick={() => handleAutotileClick(slot)}
                  onContextMenu={(e) => handleAutotileRightClick(e, slot)}
                  onMouseEnter={() => setHoveredIdx(-(slot + 1))}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    width: CELL_SIZE, height: CELL_SIZE,
                    position: "relative", cursor: "pointer",
                    border: isHovered ? "1px solid #89b4fa" : "1px solid #313244",
                    boxSizing: "border-box",
                    backgroundImage: atBgUrl ?? undefined,
                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "0 0",
                    imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
                  }}
                >
                  <Badge mode={mode} value={val} />
                </div>
                <div style={{
                  fontSize: 7, color: "#585b70",
                  textAlign: "center", width: CELL_SIZE,
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", padding: "1px 0",
                }}>
                  {slot === 0 ? "—" : (atName || `AT${slot}`)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Regular tiles section — tileset as single background */}
        {data.length > AUTOTILE_ID_COUNT && (
          <div>
            <div style={{
              padding: "3px 6px",
              fontSize: 9, fontWeight: 600,
              color: "#89b4fa", background: "#181825",
              borderBottom: "1px solid #313244",
              borderTop: "1px solid #45475a",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              Regular Tiles {tilesetName ? `— ${tilesetName}` : ""}
            </div>
            <div style={{ display: "flex" }}>
              {/* Row number gutter */}
              <div style={{ flexShrink: 0, width: 28 }}>
                {Array.from({ length: regularTileRows }, (_, ri) => (
                  <div key={ri} style={{
                    width: 28, height: CELL_SIZE,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 7, color: "#585b70",
                    borderRight: "1px solid #313244",
                  }}>
                    {regularTileStartRow + ri}
                  </div>
                ))}
              </div>
              {/* Tile grid with tileset as single background image */}
              <div style={{
                position: "relative",
                width: gridWidth,
                height: regularTileRows * CELL_SIZE,
                backgroundImage: tilesetBgUrl,
                backgroundSize: `${gridWidth}px auto`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 0",
                imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
              }}>
                {Array.from({ length: regularTileRows * COLS }, (_, ci) => {
                  const index = AUTOTILE_ID_COUNT + ci;
                  if (index >= data.length) return null;
                  const col = ci % COLS;
                  const row = Math.floor(ci / COLS);
                  const val = data[index] ?? 0;
                  const isHovered = hoveredIdx === index;
                  return (
                    <div
                      key={ci}
                      onClick={() => handleClick(index)}
                      onContextMenu={(e) => handleRightClick(e, index)}
                      onMouseEnter={() => setHoveredIdx(index)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      style={{
                        position: "absolute",
                        left: col * CELL_SIZE,
                        top: row * CELL_SIZE,
                        width: CELL_SIZE, height: CELL_SIZE,
                        cursor: "pointer",
                        border: isHovered ? "1px solid #89b4fa" : "1px solid rgba(49,50,68,0.5)",
                        boxSizing: "border-box",
                      }}
                    >
                      <Badge mode={mode} value={val} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ fontSize: 10, color: "#6c7086", marginTop: 2, display: "flex", justifyContent: "space-between" }}>
        <span>{data.length} tiles ({rows} rows × {COLS} cols)</span>
        {hoveredIdx !== null && hoveredIdx < 0 && (
          <span>
            Autotile {-(hoveredIdx + 1)}
            {" = "}{data[-(hoveredIdx + 1) * AUTOTILE_SLOT_SIZE] ?? 0}
          </span>
        )}
        {hoveredIdx !== null && hoveredIdx >= AUTOTILE_ID_COUNT && (
          <span>
            ID {hoveredIdx}
            {` — Tile (${(hoveredIdx - AUTOTILE_ID_COUNT) % COLS}, ${Math.floor((hoveredIdx - AUTOTILE_ID_COUNT) / COLS)})`}
            {" = "}{data[hoveredIdx] ?? 0}
          </span>
        )}
      </div>
    </div>
  );
}
