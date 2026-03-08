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
  zoom: number;
  viewportX: number;
  viewportY: number;
}

export interface EventMarker {
  id: number;
  name: string;
  x: number;
  y: number;
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
    console.log(`[MapRenderer] setMapData: ${width}x${height}, ${tiles.length} tiles, sample=[${tiles.slice(0, 5).join(",")}]`);
  }

  setTilesetImage(img: HTMLImageElement) {
    this.tilesetImage = img;
    console.log(`[MapRenderer] setTilesetImage: ${img.width}x${img.height}`);
  }

  setAutotileImage(slot: number, img: HTMLImageElement | null) {
    if (slot >= 0 && slot < 7) {
      this.autotileImages[slot] = img;
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
    const { zoom, viewportX, viewportY, showGrid, showEvents, showLayer } = options;

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
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    // Render tiles
    let tilesDrawn = 0;
    for (let layer = 0; layer < 3; layer++) {
      if (!showLayer[layer]) continue;
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
    }

    // Render event markers
    if (showEvents) {
      this.renderEvents(events, viewportX, viewportY, tileSize);
    }

    // Render grid
    if (showGrid) {
      this.renderGrid(startX, startY, endX, endY, viewportX, viewportY, tileSize);
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
      // Fallback for missing autotile images — bright colors to make them obvious
      const hue = (atIndex * 50 + 200) % 360;
      this.ctx.fillStyle = `hsl(${hue}, 60%, 35%)`;
      this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
      // Draw "AT#" label to show which autotile slot is missing
      this.ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(screenX + 1, screenY + 1, tileSize - 2, tileSize - 2);
      if (tileSize >= 16) {
        const dpr = window.devicePixelRatio || 1;
        this.ctx.fillStyle = `hsl(${hue}, 90%, 75%)`;
        this.ctx.font = `${Math.max(8, tileSize * 0.35)}px monospace`;
        this.ctx.textAlign = "center";
        this.ctx.fillText(`AT${atIndex}`, screenX + tileSize / 2, screenY + tileSize / 2 + 3);
        this.ctx.textAlign = "start";
      }
      return;
    }

    const frameCount = Math.floor(img.width / 96);
    const frame = frameCount > 1 ? this.autotileFrame % frameCount : 0;
    const frameOffsetX = frame * 96;

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

  private renderEvents(events: EventMarker[], viewportX: number, viewportY: number, tileSize: number) {
    for (const event of events) {
      const screenX = (event.x - viewportX) * tileSize;
      const screenY = (event.y - viewportY) * tileSize;

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
}
