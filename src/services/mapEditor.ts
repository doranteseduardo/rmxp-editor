/**
 * Map editing operations: painting, flood fill, undo/redo.
 *
 * Operates on the flat tile array from MapRenderData.
 * All operations return TileChange arrays that can be used for undo.
 */

import type { MapRenderData } from "../types";
import { getTile } from "../types";

/** A single tile change for undo/redo. */
export interface TileChange {
  x: number;
  y: number;
  layer: number;
  oldTileId: number;
  newTileId: number;
}

/** An undoable action (group of tile changes). */
export interface MapAction {
  type: "paint" | "fill" | "rectangle" | "erase";
  changes: TileChange[];
  timestamp: number;
}

/**
 * Undo/redo stack for map editing.
 */
export class UndoStack {
  private past: MapAction[] = [];
  private future: MapAction[] = [];
  private maxSize = 100;

  push(action: MapAction) {
    if (action.changes.length === 0) return;
    this.past.push(action);
    this.future = []; // Clear redo stack on new action
    if (this.past.length > this.maxSize) {
      this.past.shift();
    }
  }

  undo(): MapAction | null {
    const action = this.past.pop();
    if (action) {
      this.future.push(action);
    }
    return action ?? null;
  }

  redo(): MapAction | null {
    const action = this.future.pop();
    if (action) {
      this.past.push(action);
    }
    return action ?? null;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear() {
    this.past = [];
    this.future = [];
  }
}

/**
 * Set a tile in the flat tile array.
 */
function setTile(
  tiles: number[],
  x: number,
  y: number,
  layer: number,
  width: number,
  height: number,
  value: number
) {
  const offset = layer * width * height + y * width + x;
  if (offset >= 0 && offset < tiles.length) {
    tiles[offset] = value;
  }
}

/**
 * Paint a single tile. Returns the change for undo.
 */
export function paintTile(
  mapData: MapRenderData,
  x: number,
  y: number,
  layer: number,
  tileId: number
): TileChange | null {
  if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) {
    return null;
  }

  const oldTileId = getTile(
    mapData.tiles,
    x,
    y,
    layer,
    mapData.width,
    mapData.height
  );

  if (oldTileId === tileId) return null;

  setTile(mapData.tiles, x, y, layer, mapData.width, mapData.height, tileId);

  return { x, y, layer, oldTileId, newTileId: tileId };
}

/**
 * Paint a rectangular area. Returns all changes.
 */
export function paintRectangle(
  mapData: MapRenderData,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  layer: number,
  tileId: number
): TileChange[] {
  const minX = Math.max(0, Math.min(x1, x2));
  const maxX = Math.min(mapData.width - 1, Math.max(x1, x2));
  const minY = Math.max(0, Math.min(y1, y2));
  const maxY = Math.min(mapData.height - 1, Math.max(y1, y2));

  const changes: TileChange[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const change = paintTile(mapData, x, y, layer, tileId);
      if (change) changes.push(change);
    }
  }
  return changes;
}

/**
 * Flood fill from a starting position. Returns all changes.
 */
export function floodFill(
  mapData: MapRenderData,
  startX: number,
  startY: number,
  layer: number,
  tileId: number
): TileChange[] {
  if (
    startX < 0 ||
    startX >= mapData.width ||
    startY < 0 ||
    startY >= mapData.height
  ) {
    return [];
  }

  const targetId = getTile(
    mapData.tiles,
    startX,
    startY,
    layer,
    mapData.width,
    mapData.height
  );

  // Don't fill if target is already the desired tile
  if (targetId === tileId) return [];

  const changes: TileChange[] = [];
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) continue;

    const currentId = getTile(
      mapData.tiles,
      x,
      y,
      layer,
      mapData.width,
      mapData.height
    );
    if (currentId !== targetId) continue;

    visited.add(key);

    const change = paintTile(mapData, x, y, layer, tileId);
    if (change) changes.push(change);

    // Add 4-directional neighbors
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }

  return changes;
}

/**
 * Erase a tile (set to 0). Returns the change.
 */
export function eraseTile(
  mapData: MapRenderData,
  x: number,
  y: number,
  layer: number
): TileChange | null {
  return paintTile(mapData, x, y, layer, 0);
}

/**
 * Apply an action's changes (for redo).
 */
export function applyAction(mapData: MapRenderData, action: MapAction) {
  for (const change of action.changes) {
    setTile(
      mapData.tiles,
      change.x,
      change.y,
      change.layer,
      mapData.width,
      mapData.height,
      change.newTileId
    );
  }
}

/**
 * Revert an action's changes (for undo).
 */
export function revertAction(mapData: MapRenderData, action: MapAction) {
  // Apply in reverse order
  for (let i = action.changes.length - 1; i >= 0; i--) {
    const change = action.changes[i];
    setTile(
      mapData.tiles,
      change.x,
      change.y,
      change.layer,
      mapData.width,
      mapData.height,
      change.oldTileId
    );
  }
}
