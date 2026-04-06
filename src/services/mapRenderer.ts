/**
 * Map tile renderer using HTML Canvas 2D.
 *
 * Handles rendering of 3 tile layers, autotile patterns,
 * grid overlay, event markers, and viewport management.
 */

import {
  TILE_SIZE,
  isAutotile,
  isRegularTile,
  getAutotileIndex,
  getAutotilePattern,
  getRegularTilePos,
  getTile,
} from "../types";
import { AUTOTILE_RECTS } from "./autotileData";

export interface RenderOptions {
  showGrid: boolean;
  showEvents: boolean;
  showLayer: [boolean, boolean, boolean];
  activeLayer: number;
  zoom: number;
  viewportX: number;
  viewportY: number;
  /** Tile coordinates of the starting position marker, if on this map */
  startMarker?: { x: number; y: number };
  /** Tile selection rectangle to draw as a dashed overlay */
  selectionRect?: { x1: number; y1: number; x2: number; y2: number } | null;
}

export interface EventMarker {
  id: number;
  name: string;
  x: number;
  y: number;
  /** Character sprite sheet name (e.g., "trainer_POKEMONTRAINER_Red") */
  graphicName: string;
  /** Direction: 2=down, 4=left, 6=right, 8=up */
  graphicDirection: number;
  /** Pattern/frame (0-3) */
  graphicPattern: number;
  /** Pre-loaded character sprite image, if available */
  graphicImage?: HTMLImageElement | null;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Cached tileset and autotile images
  private tilesetImage: HTMLImageElement | null = null;
  private autotileImages: (HTMLImageElement | null)[] = [
    null, null, null, null, null, null, null,
  ];

  // Map data
  private tiles: number[] = [];
  private mapWidth = 0;
  private mapHeight = 0;
  public priorities: number[] = [];

  // Animation
  private autotileFrame = 0;
  private lastFrameTime = 0;
  private readonly FRAME_DURATION = 250;
  private frameCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    console.log("[MapRenderer] Created renderer for canvas");
  }

  setMapData(tiles: number[], width: number, height: number) {
    this.tiles = tiles;
    this.mapWidth = width;
    this.mapHeight = height;
    // Log tile type distribution per layer
    const layerSize = width * height;
    for (let z = 0; z < 3; z++) {
      const start = z * layerSize;
      const end = start + layerSize;
      const layer = tiles.slice(start, end);
      const autotiles = layer.filter(t => t >= 48 && t < 384);
      const regular = layer.filter(t => t >= 384);
      console.log(`[MapRenderer] Layer ${z}: autotile=${autotiles.length}, regular=${regular.length}, empty=${layer.filter(t => t <= 0).length}${autotiles.length > 0 ? `, AT sample=[${autotiles.slice(0, 10).join(",")}]` : ""}`);
    }
  }

  setTilesetImage(img: HTMLImageElement) {
    this.tilesetImage = img;
    console.log(`[MapRenderer] setTilesetImage: ${img.width}x${img.height}`);
  }

  setAutotileImage(slot: number, img: HTMLImageElement | null) {
    if (slot >= 0 && slot < 7) {
      this.autotileImages[slot] = img;
      console.log(`[MapRenderer] setAutotileImage[${slot}]: ${img ? `${img.width}x${img.height}` : "null"}`);
    }
  }

  setPriorities(priorities: number[]) {
    this.priorities = priorities;
  }

  private getTileId(x: number, y: number, layer: number): number {
    return getTile(this.tiles, x, y, layer, this.mapWidth, this.mapHeight);
  }

  /** Render a full frame. */
  render(time: number, options: RenderOptions, events: EventMarker[]) {
    const { zoom, viewportX, viewportY, showGrid, showEvents, showLayer, activeLayer } = options;

    // Update autotile animation
    if (time - this.lastFrameTime > this.FRAME_DURATION) {
      this.autotileFrame = (this.autotileFrame + 1) % 8;
      this.lastFrameTime = time;
    }

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    // Skip if canvas has no size
    if (canvasW === 0 || canvasH === 0) return;

    // Reset context state each frame (canvas resize resets these)
    this.ctx.imageSmoothingEnabled = false;

    // DPR: canvas pixel buffer = CSS size * DPR (set by ResizeObserver)
    const dpr = window.devicePixelRatio || 1;
    const tileSize = TILE_SIZE * zoom * dpr;

    // Calculate visible tile range
    const startX = Math.max(0, Math.floor(viewportX));
    const startY = Math.max(0, Math.floor(viewportY));
    const endX = Math.min(this.mapWidth, Math.ceil(viewportX + canvasW / tileSize));
    const endY = Math.min(this.mapHeight, Math.ceil(viewportY + canvasH / tileSize));

    // Clear canvas
    this.ctx.fillStyle = "#e0e2ea";
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    // Render tiles — non-active layers are dimmed so the active layer stands out
    // activeLayer: 0-2 = tile layers, 3 = events layer, -1 = All
    let tilesDrawn = 0;
    for (let layer = 0; layer < 3; layer++) {
      if (!showLayer[layer]) continue;

      // Dim non-active layers (activeLayer === -1 means "All" — no dimming)
      // When Events layer (3) is active, dim all tile layers
      const isActive = activeLayer === -1 || layer === activeLayer;
      const dimForEvents = activeLayer === 3;
      if (!isActive || dimForEvents) {
        this.ctx.globalAlpha = dimForEvents ? 0.5 : 0.35;
      }

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tileId = this.getTileId(x, y, layer);
          if (tileId <= 0) continue;
          const screenX = (x - viewportX) * tileSize;
          const screenY = (y - viewportY) * tileSize;
          this.renderTile(screenX, screenY, tileId, tileSize);
          tilesDrawn++;
        }
      }

      // Restore full opacity after non-active/dimmed layer
      if (!isActive || dimForEvents) {
        this.ctx.globalAlpha = 1.0;
      }
    }

    // Render event markers — visible on Events layer (3), All (-1), or when showEvents is on
    // They are dimmed when a tile layer (0-2) is active
    const eventsVisible = activeLayer === -1 || activeLayer === 3 || showEvents;
    if (eventsVisible) {
      const eventsDimmed = activeLayer >= 0 && activeLayer <= 2;
      if (eventsDimmed) {
        this.ctx.globalAlpha = 0.25;
      }
      this.renderEvents(events, viewportX, viewportY, tileSize, activeLayer === 3);
      if (eventsDimmed) {
        this.ctx.globalAlpha = 1.0;
      }
    }

    // Render start position marker
    if (options.startMarker) {
      this.renderStartMarker(options.startMarker.x, options.startMarker.y, viewportX, viewportY, tileSize);
    }

    // Render grid
    if (showGrid) {
      this.renderGrid(startX, startY, endX, endY, viewportX, viewportY, tileSize);
    }

    // Render tile selection rectangle
    if (options.selectionRect) {
      this.renderSelectionRect(options.selectionRect, viewportX, viewportY, tileSize);
    }

    // Debug overlay — always visible for first 5 seconds, scaled for DPR
    this.frameCount++;
    if (this.frameCount < 300) {
      this.ctx.save();
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Draw in CSS pixels
      this.ctx.fillStyle = "rgba(0,0,0,0.85)";
      this.ctx.fillRect(4, 4, 380, 130);
      this.ctx.fillStyle = "#ff0";
      this.ctx.font = "bold 13px monospace";
      const lines = [
        `Canvas: ${canvasW}x${canvasH} (DPR=${dpr.toFixed(1)})`,
        `Map: ${this.mapWidth}x${this.mapHeight}, Tiles: ${this.tiles.length}`,
        `Visible: (${startX},${startY})-(${endX},${endY})`,
        `TileSize: ${tileSize.toFixed(0)}px  Zoom: ${zoom}`,
        `Tileset: ${this.tilesetImage ? `${this.tilesetImage.width}x${this.tilesetImage.height} OK` : "*** NULL ***"}`,
        `Autotiles: [${this.autotileImages.map(a => a ? "OK" : "--").join(",")}]`,
        `Drawn: ${tilesDrawn} tiles | Frame: ${this.frameCount}`,
      ];
      lines.forEach((line, i) => {
        this.ctx.fillText(line, 10, 22 + i * 16);
      });
      this.ctx.restore();
    }

    // Console log once per second
    if (this.frameCount % 60 === 1) {
      console.log(`[MapRenderer] f=${this.frameCount} canvas=${canvasW}x${canvasH} drawn=${tilesDrawn} tileset=${this.tilesetImage ? "OK" : "null"} map=${this.mapWidth}x${this.mapHeight}`);
    }
  }

  /** Render a single tile. Falls back to colored placeholder if image missing. */
  private renderTile(screenX: number, screenY: number, tileId: number, tileSize: number) {
    if (isAutotile(tileId)) {
      this.renderAutotile(screenX, screenY, tileId, tileSize);
    } else if (isRegularTile(tileId)) {
      if (this.tilesetImage) {
        this.renderRegularTile(screenX, screenY, tileId, tileSize);
      } else {
        // Fallback: colored placeholder
        const { x: tileX, y: tileY } = getRegularTilePos(tileId);
        const hue = (tileX * 30 + tileY * 50) % 360;
        this.ctx.fillStyle = `hsl(${hue}, 40%, 30%)`;
        this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
      }
    }
  }

  private renderRegularTile(screenX: number, screenY: number, tileId: number, tileSize: number) {
    const { x: tileX, y: tileY } = getRegularTilePos(tileId);
    this.ctx.drawImage(
      this.tilesetImage!,
      tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE,
      screenX, screenY, tileSize, tileSize
    );
  }

  private renderAutotile(screenX: number, screenY: number, tileId: number, tileSize: number) {
    const atIndex = getAutotileIndex(tileId);
    const pattern = getAutotilePattern(tileId);
    const img = this.autotileImages[atIndex];

    if (!img) {
      // No image for this autotile slot — render as transparent (matches RMXP behavior)
      return;
    }

    // Standard RMXP autotile: each frame is 96×128.
    // Animated = 96*N × 128 horizontal strip.
    const frameCount = Math.max(1, Math.floor(img.width / 96));
    const frame = frameCount > 1 ? this.autotileFrame % frameCount : 0;
    const frameOffsetX = frame * 96;

    // For non-standard autotile images (< 96×128), e.g. 160×32 (5 frames
    // of 32×32 each), draw a single animated tile — no sub-tile patterns.
    if (img.width < 96 || img.height < 128) {
      const tileW = Math.min(TILE_SIZE, img.height > 0 ? img.height : TILE_SIZE);
      const tileH = tileW; // assume square frames
      const simpleFrameCount = Math.max(1, Math.floor(img.width / tileW));
      const simpleFrame = simpleFrameCount > 1 ? this.autotileFrame % simpleFrameCount : 0;
      this.ctx.drawImage(
        img,
        simpleFrame * tileW, 0, tileW, tileH,
        screenX, screenY, tileSize, tileSize
      );
      return;
    }

    const rectBase = pattern * 4;
    const halfSize = tileSize / 2;

    for (let corner = 0; corner < 4; corner++) {
      const rect = AUTOTILE_RECTS[rectBase + corner];
      if (!rect) continue;
      const destX = screenX + (corner % 2) * halfSize;
      const destY = screenY + Math.floor(corner / 2) * halfSize;
      this.ctx.drawImage(
        img,
        frameOffsetX + rect.x, rect.y, rect.w, rect.h,
        destX, destY, halfSize, halfSize
      );
    }
  }

  private renderEvents(events: EventMarker[], viewportX: number, viewportY: number, tileSize: number, highlight: boolean) {
    for (const event of events) {
      const screenX = (event.x - viewportX) * tileSize;
      const screenY = (event.y - viewportY) * tileSize;

      // Try to render character sprite if available
      if (event.graphicImage && event.graphicName) {
        this.renderCharacterSprite(
          event.graphicImage,
          event.graphicDirection,
          event.graphicPattern,
          screenX,
          screenY,
          tileSize
        );
      } else if (event.graphicName) {
        // Has a graphic name but image not loaded yet — show placeholder with name
        this.ctx.fillStyle = "rgba(66, 135, 245, 0.3)";
        this.ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        this.ctx.strokeStyle = "rgba(66, 135, 245, 0.8)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        if (tileSize >= 24) {
          this.ctx.fillStyle = "#fff";
          this.ctx.font = `${Math.max(8, tileSize * 0.25)}px monospace`;
          this.ctx.textAlign = "center";
          this.ctx.fillText(event.name.substring(0, 8), screenX + tileSize / 2, screenY + tileSize / 2 + 4);
          this.ctx.textAlign = "start";
        }
      } else {
        // No graphic — draw the blue event marker box
        this.ctx.fillStyle = "rgba(66, 135, 245, 0.4)";
        this.ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        this.ctx.strokeStyle = "rgba(66, 135, 245, 0.9)";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);

        if (tileSize >= 24) {
          this.ctx.fillStyle = "#fff";
          this.ctx.font = `${Math.max(9, tileSize * 0.3)}px monospace`;
          this.ctx.textAlign = "center";
          this.ctx.fillText(event.name.substring(0, 8), screenX + tileSize / 2, screenY + tileSize / 2 + 4);
          this.ctx.textAlign = "start";
        }
      }

      // Always draw a bounding rectangle around events so they're distinguishable from map tiles
      // Stronger highlight when the Events layer is active
      if (highlight) {
        // Active events layer — solid outline with subtle fill
        this.ctx.strokeStyle = "rgba(250, 179, 135, 0.9)";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        this.ctx.fillStyle = "rgba(250, 179, 135, 0.08)";
        this.ctx.fillRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        // Event ID badge in corner
        if (tileSize >= 20) {
          const badge = `E${event.id}`;
          this.ctx.font = `bold ${Math.max(7, tileSize * 0.2)}px monospace`;
          this.ctx.textAlign = "left";
          const textW = this.ctx.measureText(badge).width;
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          this.ctx.fillRect(screenX + 1, screenY + 1, textW + 4, Math.max(10, tileSize * 0.25) + 2);
          this.ctx.fillStyle = "rgba(250, 179, 135, 1)";
          this.ctx.fillText(badge, screenX + 3, screenY + Math.max(10, tileSize * 0.25));
          this.ctx.textAlign = "start";
        }
      } else {
        // Not on events layer — subtle dashed border
        this.ctx.strokeStyle = "rgba(250, 179, 135, 0.45)";
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.strokeRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
        this.ctx.setLineDash([]);
      }
    }
  }

  /**
   * Render a character sprite from an RMXP character sheet.
   *
   * Character sheets come in various sizes but always use a 4-column × 4-row layout:
   *   - 128×192 → 32×48 per frame (standard: 1 tile wide, 1.5 tiles tall)
   *   - 128×128 → 32×32 per frame (1 tile square)
   *   - 128×256 → 32×64 per frame (1 tile wide, 2 tiles tall)
   *   - 192×192 → 48×48 per frame (1.5 tiles square)
   *   - 256×256 → 64×64 per frame (2 tiles square)
   *   - 32×32   → single frame, no sheet
   *
   * We scale each frame proportionally: 1 source pixel = 1 game pixel (32px = 1 tile),
   * then apply the current zoom + DPR factor so the sprite matches the map scale.
   *
   * Direction mapping: row 0 = down (2), row 1 = left (4), row 2 = right (6), row 3 = up (8).
   */
  private renderCharacterSprite(
    img: HTMLImageElement,
    direction: number,
    pattern: number,
    screenX: number,
    screenY: number,
    tileSize: number          // already equals TILE_SIZE * zoom * dpr
  ) {
    // Detect whether this is a single-frame image or a 4×4 sheet
    const isSingleFrame = img.width <= TILE_SIZE && img.height <= TILE_SIZE;
    const cols = isSingleFrame ? 1 : 4;
    const rows = isSingleFrame ? 1 : 4;

    const frameW = img.width / cols;
    const frameH = img.height / rows;

    // Direction → row mapping
    let row = 0;
    if (!isSingleFrame) {
      switch (direction) {
        case 2: row = 0; break; // Down
        case 4: row = 1; break; // Left
        case 6: row = 2; break; // Right
        case 8: row = 3; break; // Up
        default: row = 0; break;
      }
    }

    const col = isSingleFrame ? 0 : Math.max(0, Math.min(3, pattern));

    // Source rectangle from the sprite sheet
    const srcX = col * frameW;
    const srcY = row * frameH;

    // Scale factor: how many screen-pixels per source-pixel.
    // tileSize is the on-screen size of one 32×32 tile, so the
    // ratio tileSize / TILE_SIZE gives us the current zoom+DPR scale.
    const scale = tileSize / TILE_SIZE;

    const destW = frameW * scale;
    const destH = frameH * scale;

    // Centre horizontally on the tile, anchor at the bottom of the tile cell.
    const destX = screenX + (tileSize - destW) / 2;
    const destY = screenY + tileSize - destH;

    this.ctx.drawImage(
      img,
      srcX, srcY, frameW, frameH,
      destX, destY, destW, destH
    );
  }

  private renderStartMarker(tileX: number, tileY: number, viewportX: number, viewportY: number, tileSize: number) {
    const screenX = (tileX - viewportX) * tileSize;
    const screenY = (tileY - viewportY) * tileSize;
    const cx = screenX + tileSize / 2;
    const cy = screenY + tileSize / 2;
    const r = tileSize * 0.36;

    this.ctx.save();

    // Green filled circle with glow
    this.ctx.shadowColor = "rgba(64, 160, 43, 0.75)";
    this.ctx.shadowBlur = tileSize * 0.2;
    this.ctx.fillStyle = "rgba(64, 160, 43, 0.88)";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();

    // White border
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    this.ctx.lineWidth = Math.max(1, tileSize * 0.04);
    this.ctx.stroke();

    // House icon
    if (tileSize >= 16) {
      this.ctx.fillStyle = "#fff";
      this.ctx.font = `bold ${Math.max(10, Math.round(tileSize * 0.38))}px sans-serif`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("⌂", cx, cy + tileSize * 0.03);
    }

    this.ctx.restore();
  }

  private renderGrid(startX: number, startY: number, endX: number, endY: number, viewportX: number, viewportY: number, tileSize: number) {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    this.ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x++) {
      const screenX = Math.round((x - viewportX) * tileSize);
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = startY; y <= endY; y++) {
      const screenY = Math.round((y - viewportY) * tileSize);
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }

  screenToTile(screenX: number, screenY: number, viewportX: number, viewportY: number, zoom: number): { x: number; y: number } {
    const tileSize = TILE_SIZE * zoom;
    return {
      x: Math.floor(screenX / tileSize + viewportX),
      y: Math.floor(screenY / tileSize + viewportY),
    };
  }

  private renderSelectionRect(
    rect: { x1: number; y1: number; x2: number; y2: number },
    viewportX: number,
    viewportY: number,
    tileSize: number
  ) {
    const minX = Math.min(rect.x1, rect.x2);
    const minY = Math.min(rect.y1, rect.y2);
    const maxX = Math.max(rect.x1, rect.x2);
    const maxY = Math.max(rect.y1, rect.y2);

    const screenX = (minX - viewportX) * tileSize;
    const screenY = (minY - viewportY) * tileSize;
    const screenW = (maxX - minX + 1) * tileSize;
    const screenH = (maxY - minY + 1) * tileSize;

    this.ctx.save();
    // Outer white stroke
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeRect(screenX, screenY, screenW, screenH);
    // Inner blue stroke offset by dash phase
    this.ctx.strokeStyle = "#1e66f5";
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineDashOffset = 4;
    this.ctx.strokeRect(screenX, screenY, screenW, screenH);
    // Semi-transparent fill
    this.ctx.fillStyle = "rgba(30, 102, 245, 0.1)";
    this.ctx.fillRect(screenX, screenY, screenW, screenH);
    this.ctx.restore();
  }
}
