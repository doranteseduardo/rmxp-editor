import { useCallback, useEffect, useRef, useState } from "react";
import type { TilesetRenderInfo } from "../../types";
import { TILE_SIZE, FIRST_REGULAR_TILE } from "../../types";
import { renderAutotilePattern } from "../../services/autotileData";
import "./TilesetPalette.css";

interface Props {
  tilesetInfo: TilesetRenderInfo | null;
  tilesetImage: HTMLImageElement | null;
  autotileImages: (HTMLImageElement | null)[];
  selectedTileId: number;
  onSelectTile: (tileId: number) => void;
}

type PaletteTab = "tiles" | "autotiles" | "properties";

/**
 * Tileset palette panel.
 *
 * Displays the tileset image as a clickable grid of 32×32 tiles
 * (8 columns wide, matching RMXP's tileset layout).
 * Also shows autotile previews and tile properties.
 */
export function TilesetPalette({
  tilesetInfo,
  tilesetImage,
  autotileImages,
  selectedTileId,
  onSelectTile,
}: Props) {
  const [activeTab, setActiveTab] = useState<PaletteTab>("tiles");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverTileId, setHoverTileId] = useState<number | null>(null);

  // Render the tileset grid onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tilesetImage || activeTab !== "tiles") return;

    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    // Canvas is 8 tiles wide (256px), height matches tileset
    const cols = 8;
    const rows = Math.ceil(tilesetImage.height / TILE_SIZE);
    canvas.width = cols * TILE_SIZE;
    canvas.height = rows * TILE_SIZE;

    // Draw the tileset image
    ctx.drawImage(tilesetImage, 0, 0);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(canvas.width, y * TILE_SIZE);
      ctx.stroke();
    }

    // Highlight selected tile
    if (selectedTileId >= FIRST_REGULAR_TILE) {
      const idx = selectedTileId - FIRST_REGULAR_TILE;
      const sx = (idx % 8) * TILE_SIZE;
      const sy = Math.floor(idx / 8) * TILE_SIZE;
      ctx.strokeStyle = "#1e66f5";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // Highlight hovered tile
    if (hoverTileId !== null && hoverTileId >= FIRST_REGULAR_TILE) {
      const idx = hoverTileId - FIRST_REGULAR_TILE;
      const sx = (idx % 8) * TILE_SIZE;
      const sy = Math.floor(idx / 8) * TILE_SIZE;
      ctx.fillStyle = "rgba(137, 180, 250, 0.2)";
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }, [tilesetImage, selectedTileId, hoverTileId, activeTab]);

  // Handle click on tileset canvas
  const handleTilesetClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);

      if (x >= 0 && x < 8) {
        const tileId = FIRST_REGULAR_TILE + y * 8 + x;
        onSelectTile(tileId);
      }
    },
    [onSelectTile]
  );

  // Handle hover for tile info
  const handleTilesetMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);

      if (x >= 0 && x < 8) {
        setHoverTileId(FIRST_REGULAR_TILE + y * 8 + x);
      } else {
        setHoverTileId(null);
      }
    },
    []
  );

  // Handle autotile selection
  const handleAutotileClick = useCallback(
    (slot: number) => {
      // Select the "full" autotile pattern (pattern 0 = all same)
      // tileId = (slot + 1) * 48
      const tileId = (slot + 1) * 48;
      onSelectTile(tileId);
    },
    [onSelectTile]
  );

  if (!tilesetInfo) {
    return (
      <div className="tileset-palette">
        <div className="palette-header">Tileset</div>
        <div className="palette-empty">No tileset loaded</div>
      </div>
    );
  }

  // Tile info for status display
  const displayTileId = hoverTileId ?? selectedTileId;
  const priority =
    displayTileId < tilesetInfo.priorities.length
      ? tilesetInfo.priorities[displayTileId]
      : 0;
  const passage =
    displayTileId < tilesetInfo.passages.length
      ? tilesetInfo.passages[displayTileId]
      : 0;
  const terrain =
    displayTileId < tilesetInfo.terrain_tags.length
      ? tilesetInfo.terrain_tags[displayTileId]
      : 0;

  return (
    <div className="tileset-palette">
      <div className="palette-header">
        {tilesetInfo.name || "Tileset"}
      </div>

      {/* Tab bar */}
      <div className="palette-tabs">
        <button
          className={activeTab === "tiles" ? "active" : ""}
          onClick={() => setActiveTab("tiles")}
        >
          Tiles
        </button>
        <button
          className={activeTab === "autotiles" ? "active" : ""}
          onClick={() => setActiveTab("autotiles")}
        >
          Auto
        </button>
        <button
          className={activeTab === "properties" ? "active" : ""}
          onClick={() => setActiveTab("properties")}
        >
          Props
        </button>
      </div>

      {/* Tiles tab: clickable tileset grid */}
      {activeTab === "tiles" && (
        <div className="palette-scroll">
          {tilesetImage ? (
            <canvas
              ref={canvasRef}
              className="tileset-canvas"
              onClick={handleTilesetClick}
              onMouseMove={handleTilesetMove}
              onMouseLeave={() => setHoverTileId(null)}
            />
          ) : (
            <div className="palette-empty">
              <p>Tileset image: {tilesetInfo.tileset_name}</p>
              <p className="dim">Image not loaded</p>
            </div>
          )}
        </div>
      )}

      {/* Autotiles tab */}
      {activeTab === "autotiles" && (
        <div className="palette-scroll">
          <div className="autotile-list">
            {tilesetInfo.autotile_names.map((name, idx) => (
              <div
                key={idx}
                className={`autotile-item ${
                  selectedTileId >= (idx + 1) * 48 &&
                  selectedTileId < (idx + 2) * 48
                    ? "selected"
                    : ""
                }`}
                onClick={() => handleAutotileClick(idx)}
              >
                <div className="autotile-preview">
                  {autotileImages[idx] ? (
                    <AutotilePreview image={autotileImages[idx]!} />
                  ) : (
                    <div className="autotile-empty-preview" />
                  )}
                </div>
                <div className="autotile-info">
                  <span className="autotile-slot">#{idx}</span>
                  <span className="autotile-name">
                    {name || "(empty)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Properties tab */}
      {activeTab === "properties" && (
        <div className="palette-scroll">
          <div className="tile-properties">
            <div className="prop-row">
              <span className="prop-label">Tile ID</span>
              <span className="prop-value">{displayTileId}</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Priority</span>
              <span className="prop-value">{priority}</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Passage</span>
              <span className="prop-value">
                {passage === 0
                  ? "Passable"
                  : passage === 0xf
                  ? "Impassable"
                  : `Partial (0x${passage.toString(16)})`}
              </span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Terrain</span>
              <span className="prop-value">{terrain}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tile info status */}
      <div className="palette-status">
        <span>ID: {displayTileId}</span>
        <span>P: {priority}</span>
      </div>
    </div>
  );
}

/** Renders a 32×32 preview of autotile pattern 0 (all neighbors match). */
function AutotilePreview({ image }: { image: HTMLImageElement }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    canvas.width = 32;
    canvas.height = 32;

    // Composite 4 mini-tiles for pattern 0 using the AUTOTILE_RECTS lookup
    renderAutotilePattern(ctx, image, 0, 0, 0);
  }, [image]);

  return <canvas ref={canvasRef} className="autotile-canvas" />;
}
