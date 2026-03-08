/**
 * TilePropertyEditor — visual grid editor for tileset passages, priorities, and terrain tags.
 *
 * Renders an 8-column grid representing all tileset tiles.
 * - IDs 0–383 are autotiles (8 slots × 48 patterns each, slot 0 is blank)
 * - IDs 384+ are regular tiles from the tileset image (8 columns wide)
 *
 * Uses the tileset image as a single CSS background on the regular-tiles
 * grid container — no per-cell slicing, no data URLs, minimal memory.
 * Autotile slots each show one representative image as background.
 *
 * Three modes:
 * - passages: bitfield (0=all pass, 15=impassable, individual direction bits)
 * - priorities: integer 0-5
 * - terrain_tags: integer 0-7
 */
import { useState, useRef, useCallback, useEffect } from "react";

type PropertyMode = "passages" | "priorities" | "terrain_tags";

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
const CELL_SIZE = 32; // Display cell size
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

const TAG_COLORS: Record<number, string> = {
  0: "#45475a", 1: "#89b4fa", 2: "#a6e3a1", 3: "#f9e2af",
  4: "#fab387", 5: "#f38ba8", 6: "#cba6f7", 7: "#94e2d5",
};

/** Build a Tauri asset protocol URL */
function buildAssetUrl(projectPath: string, subdir: string, name: string): string {
  const fullPath = `${projectPath}/Graphics/${subdir}/${name}.png`;
  return `asset://localhost/${encodeURIComponent(fullPath)}`;
}

/* ─── Overlay badges ──────────────────────────────────────────── */

function PassageBadge({ value }: { value: number }) {
  const blocked = value === 0x0F || value === 15;
  const arrows: string[] = [];
  if (!(value & DIR_UP))    arrows.push("↑");
  if (!(value & DIR_DOWN))  arrows.push("↓");
  if (!(value & DIR_LEFT))  arrows.push("←");
  if (!(value & DIR_RIGHT)) arrows.push("→");

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: blocked ? "rgba(243, 139, 168, 0.45)" : value === 0 ? "rgba(166, 227, 161, 0.25)" : "rgba(249, 226, 175, 0.35)",
      color: blocked ? "#f38ba8" : "#a6e3a1",
      fontSize: blocked || value === 0 ? 14 : 9,
      fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      lineHeight: 1,
      pointerEvents: "none",
    }}>
      {blocked ? "✕" : value === 0 ? "○" : arrows.join("")}
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

function TagBadge({ value }: { value: number }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `${TAG_COLORS[value] ?? "#45475a"}55`,
      color: TAG_COLORS[value] ?? "#a6adc8",
      fontSize: 14, fontWeight: 700,
      textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)",
      pointerEvents: "none",
    }}>
      {value}
    </div>
  );
}

function Badge({ mode, value }: { mode: PropertyMode; value: number }) {
  if (mode === "passages") return <PassageBadge value={value} />;
  if (mode === "priorities") return <PriorityBadge value={value} />;
  return <TagBadge value={value} />;
}

/* ─── Autotile row header ──────────────────────────────────────── */

function AutotileHeader({ slot, name }: { slot: number; name: string }) {
  return (
    <div style={{
      gridColumn: "1 / -1",
      padding: "2px 6px",
      fontSize: 9, fontWeight: 600,
      color: "#6c7086", background: "#181825",
      borderBottom: "1px solid #313244",
      textTransform: "uppercase", letterSpacing: 0.5,
    }}>
      {slot === 0 ? "Autotile (blank)" : `Autotile ${slot}: ${name || "(none)"}`}
    </div>
  );
}

/* ─── Hook: get tileset image dimensions (no slicing!) ─────────── */

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

/* ─── Main Component ───────────────────────────────────────────── */

export function TilePropertyEditor({ data, mode, projectPath, tilesetName, autotileNames, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rows = Math.ceil(data.length / COLS);
  const regularTileStartRow = Math.floor(AUTOTILE_ID_COUNT / COLS);
  const regularTileRows = Math.max(0, rows - regularTileStartRow);

  // Only need tileset dimensions to know how many rows exist — the image itself
  // is used as a single CSS background, no slicing or data URLs at all.
  const tilesetSize = useTilesetSize(projectPath, tilesetName);

  // Build the tileset background URL (just one string, not per-cell)
  const tilesetBgUrl = (projectPath && tilesetName)
    ? `url("${buildAssetUrl(projectPath, "Tilesets", tilesetName)}")`
    : undefined;

  // Build autotile background URLs (just 7 URL strings max)
  const autotileBgUrls = (projectPath && autotileNames)
    ? autotileNames.map(name => name ? `url("${buildAssetUrl(projectPath, "Autotiles", name)}")` : null)
    : [];

  const handleClick = useCallback((index: number) => {
    const copy = [...data];
    if (mode === "passages") {
      copy[index] = copy[index] === 0 ? 0x0F : 0;
    } else if (mode === "priorities") {
      copy[index] = ((copy[index] ?? 0) + 1) % 6;
    } else {
      copy[index] = ((copy[index] ?? 0) + 1) % 8;
    }
    onChange(copy);
  }, [data, mode, onChange]);

  const handleRightClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const copy = [...data];
    if (mode === "passages") {
      const val = copy[index] ?? 0;
      const cycle = [0, DIR_DOWN, DIR_LEFT, DIR_RIGHT, DIR_UP, 0x0F];
      const idx = cycle.indexOf(val);
      copy[index] = cycle[(idx + 1) % cycle.length];
    } else if (mode === "priorities") {
      copy[index] = ((copy[index] ?? 0) - 1 + 6) % 6;
    } else {
      copy[index] = ((copy[index] ?? 0) - 1 + 8) % 8;
    }
    onChange(copy);
  }, [data, mode, onChange]);

  if (data.length === 0) {
    return <div style={{ fontSize: 11, color: "#6c7086", padding: 4 }}>No tile data available</div>;
  }

  // The regular tiles grid: 8 columns × N rows, with the tileset PNG as a single
  // background image. Each cell is a transparent overlay with just the property badge.
  // The background-size forces the tileset to exactly COLS*CELL_SIZE wide, so tiles
  // align pixel-perfectly with the grid cells.

  const gridWidth = COLS * CELL_SIZE;

  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7086", marginBottom: 4 }}>
        {mode === "passages" && "Click: toggle pass/block — Right-click: cycle directions"}
        {mode === "priorities" && "Click: cycle priority 0-5 — Right-click: cycle backwards"}
        {mode === "terrain_tags" && "Click: cycle tag 0-7 — Right-click: cycle backwards"}
      </div>
      <div
        ref={containerRef}
        style={{
          maxHeight: 14 * (CELL_SIZE) + 2,
          overflowY: "auto",
          border: "1px solid #313244",
          borderRadius: 3,
          background: "#11111b",
        }}
      >
        {/* Autotile sections — each slot gets its autotile image as background */}
        {Array.from({ length: Math.min(8, Math.ceil(Math.min(data.length, AUTOTILE_ID_COUNT) / AUTOTILE_SLOT_SIZE)) }, (_, slot) => {
          const startIdx = slot * AUTOTILE_SLOT_SIZE;
          const endIdx = Math.min(startIdx + AUTOTILE_SLOT_SIZE, data.length, AUTOTILE_ID_COUNT);
          if (startIdx >= data.length) return null;
          const slotRows = Math.ceil((endIdx - startIdx) / COLS);
          const atName = slot === 0 ? "" : (autotileNames?.[slot - 1] ?? "");
          // Use the autotile image as background for this slot section
          const atBgUrl = slot > 0 ? autotileBgUrls[slot - 1] : null;

          return (
            <div key={`at-${slot}`}>
              <AutotileHeader slot={slot} name={atName} />
              <div style={{ display: "flex" }}>
                {/* Row number gutter */}
                <div style={{ flexShrink: 0, width: 28 }}>
                  {Array.from({ length: slotRows }, (_, ri) => (
                    <div key={ri} style={{
                      width: 28, height: CELL_SIZE,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 7, color: "#585b70",
                      borderRight: "1px solid #313244",
                    }}>
                      {Math.floor((startIdx + ri * COLS) / COLS)}
                    </div>
                  ))}
                </div>
                {/* Autotile grid with single background — same approach as regular tiles.
                    The autotile image is placed once and stretched to fill the grid width,
                    so the browser only holds one reference to the image. */}
                <div style={{
                  position: "relative",
                  width: gridWidth,
                  height: slotRows * CELL_SIZE,
                  backgroundImage: atBgUrl ?? undefined,
                  backgroundSize: `${gridWidth}px auto`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "0 0",
                  imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
                }}>
                  {/* Overlay cells with just badges + click handlers */}
                  {Array.from({ length: slotRows * COLS }, (_, ci) => {
                    const index = startIdx + ci;
                    if (index >= endIdx) return null;
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
                          width: CELL_SIZE,
                          height: CELL_SIZE,
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
          );
        })}

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
                // The tileset is 256px (8×32) wide — force it to gridWidth so each
                // tile column is exactly CELL_SIZE. Height scales proportionally.
                backgroundSize: `${gridWidth}px auto`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 0",
                imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
              }}>
                {/* Overlay cells — transparent, just badges + interaction */}
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
                        width: CELL_SIZE,
                        height: CELL_SIZE,
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
        {hoveredIdx !== null && (
          <span>
            ID {hoveredIdx}
            {hoveredIdx >= AUTOTILE_ID_COUNT
              ? ` — Tile (${(hoveredIdx - AUTOTILE_ID_COUNT) % COLS}, ${Math.floor((hoveredIdx - AUTOTILE_ID_COUNT) / COLS)})`
              : ` — AT${Math.floor(hoveredIdx / AUTOTILE_SLOT_SIZE)}`
            }
            {" = "}{data[hoveredIdx] ?? 0}
          </span>
        )}
      </div>
    </div>
  );
}
