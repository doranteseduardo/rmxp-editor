/**
 * AnimationPreviewCanvas — visual canvas renderer for RMXP animation frames.
 *
 * Loads the animation sprite sheet from Graphics/Animations/ and renders
 * the selected frame's cells on a canvas with proper positioning, zoom,
 * rotation, opacity, and mirror transforms.
 *
 * RMXP animation sprite sheets:
 * - Arranged in a 5-column grid
 * - Each cell is 192×192 px
 * - Pattern index: col = pattern % 5, row = Math.floor(pattern / 5)
 *
 * cell_data Table(cell_max, 8) properties per cell:
 *   0: pattern (sprite index)
 *   1: x offset from center
 *   2: y offset from center
 *   3: zoom% (100 = normal)
 *   4: rotation degrees
 *   5: mirror (0/1)
 *   6: opacity (0-255)
 *   7: blend_type (0=normal, 1=add, 2=sub)
 */
import { useRef, useEffect, useState, useCallback } from "react";
import type { RpgAnimationFrame, RpgTable } from "../../../types/rpgTypes";
import { getAssetPath } from "../../../services/tauriApi";
import { loadImage } from "../../../services/imageLoader";

interface Props {
  projectPath: string;
  /** Name of the animation sprite sheet (from animation_name field) */
  animationName: string;
  /** Hue shift (0-360) */
  animationHue: number;
  /** The frame to render */
  frame: RpgAnimationFrame | null;
  /** Frame index (for display) */
  frameIndex: number;
  /** Whether currently in playback mode */
  isPlaying?: boolean;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 320;
const CELL_SIZE = 192;  // Source cell size in sprite sheet
const COLS = 5;         // Sprite sheet columns

export function AnimationPreviewCanvas({
  projectPath,
  animationName,
  animationHue,
  frame,
  frameIndex,
  isPlaying,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load sprite sheet when animation name changes
  useEffect(() => {
    if (!animationName) {
      setSpriteSheet(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadError(null);

    (async () => {
      try {
        const path = await getAssetPath(projectPath, "animation", animationName);
        const img = await loadImage(path);
        if (!cancelled) {
          setSpriteSheet(img);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(`Failed to load: ${animationName}`);
          setSpriteSheet(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [projectPath, animationName]);

  // Render the frame
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background grid
    ctx.fillStyle = "#11111b";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw crosshair at center
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    ctx.strokeStyle = "#313244";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, CANVAS_HEIGHT);
    ctx.moveTo(0, cy);
    ctx.lineTo(CANVAS_WIDTH, cy);
    ctx.stroke();

    // Draw a faint circle to represent the target area
    ctx.strokeStyle = "#45475a";
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();

    if (!frame || !spriteSheet) {
      // Draw "no frame" text
      ctx.fillStyle = "#6c7086";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      if (!spriteSheet && animationName) {
        ctx.fillText(loadError || "Loading sprite sheet...", cx, cy);
      } else if (!frame) {
        ctx.fillText("No frame data", cx, cy);
      } else {
        ctx.fillText("No sprite sheet", cx, cy);
      }
      return;
    }

    // Extract cell data from the frame's cell_data Table
    const cellData = frame.cell_data?.data;
    if (!cellData || cellData.length === 0) {
      ctx.fillStyle = "#6c7086";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Frame ${frameIndex + 1}: ${frame.cell_max} cells (binary data)`, cx, cy);
      return;
    }

    const ySize = 8; // 8 properties per cell
    const scale = CANVAS_WIDTH / 384; // Scale from RMXP's 384px viewport to our canvas

    // Render each cell
    for (let cell = 0; cell < frame.cell_max; cell++) {
      // Read cell properties from Table data
      // Table is Table(cell_max, 8) → data[cell * 8 + property] (x-major indexing)
      // Actually RMXP Tables use: data[y * x_size + x] for 2D
      // For cell_data Table(cell_max, 8): data[prop * cell_max + cell]
      const xSize = frame.cell_data?.x_size ?? frame.cell_max;
      const getCell = (prop: number) => {
        const idx = prop * xSize + cell;
        return cellData[idx] ?? 0;
      };

      const pattern = getCell(0);
      const xOff = getCell(1);
      const yOff = getCell(2);
      const zoom = getCell(3);
      const rotation = getCell(4);
      const mirror = getCell(5);
      const opacity = getCell(6);
      const blendType = getCell(7);

      // Skip if pattern is -1 (invisible/unused cell)
      if (pattern < 0) continue;

      // Calculate source rectangle in sprite sheet
      const srcCol = pattern % COLS;
      const srcRow = Math.floor(pattern / COLS);
      const srcX = srcCol * CELL_SIZE;
      const srcY = srcRow * CELL_SIZE;

      // Check bounds
      if (srcX + CELL_SIZE > spriteSheet.width || srcY + CELL_SIZE > spriteSheet.height) continue;

      // Calculate destination
      const drawSize = (CELL_SIZE * zoom / 100) * scale;
      const destX = cx + xOff * scale;
      const destY = cy + yOff * scale;

      ctx.save();

      // Apply opacity
      ctx.globalAlpha = opacity / 255;

      // Apply blend mode
      if (blendType === 1) {
        ctx.globalCompositeOperation = "lighter"; // Additive
      } else if (blendType === 2) {
        ctx.globalCompositeOperation = "difference"; // Subtractive approximation
      }

      // Move to cell center, apply transforms
      ctx.translate(destX, destY);
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }
      if (mirror) {
        ctx.scale(-1, 1);
      }

      // Draw the cell sprite
      ctx.drawImage(
        spriteSheet,
        srcX, srcY, CELL_SIZE, CELL_SIZE,
        -drawSize / 2, -drawSize / 2, drawSize, drawSize
      );

      ctx.restore();
    }

    // Frame label
    ctx.fillStyle = "#6c7086";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Frame ${frameIndex + 1} — ${frame.cell_max} cell(s)`, 4, CANVAS_HEIGHT - 4);
  }, [frame, spriteSheet, animationName, frameIndex, loadError]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          border: "1px solid #313244",
          borderRadius: 3,
          background: "#11111b",
        }}
      />
      {!animationName && (
        <div style={{ fontSize: 10, color: "#6c7086", marginTop: 2 }}>
          Select an animation graphic to preview frames
        </div>
      )}
    </div>
  );
}
