/**
 * Map editing operations: painting, flood fill, undo/redo.
 *
 * Operates on the flat tile array from MapRenderData.
 * All operations return TileChange arrays that can be used for undo.
 *
 * Autotile-aware: when painting/erasing autotiles, the correct pattern
 * (0-47) is computed based on neighboring tiles, and neighbors are updated.
 */

import type { MapRenderData } from "../types";
import { getTile, isAutotile, getAutotileIndex } from "../types";
import { BITMASK_TO_PATTERN, getNeighborBitmask } from "./autotileData";

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

// ─── Autotile helpers ──────────────────────────────────────────────────

/** 8 neighbor offsets: [dx, dy] */
const NEIGHBOR_OFFSETS: [number, number][] = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/**
 * Resolve the correct autotile tile ID for a cell, based on its neighbors.
 * Sets the tile and returns a TileChange (or null if unchanged).
 */
function resolveAutotile(
  mapData: MapRenderData,
  x: number,
  y: number,
  layer: number,
  atSlot: number,
): TileChange | null {
  const { tiles, width, height } = mapData;
  const mask = getNeighborBitmask(tiles, width, height, x, y, layer, atSlot);
  const pattern = BITMASK_TO_PATTERN[mask];
  const newTileId = (atSlot + 1) * 48 + pattern;

  const offset = layer * width * height + y * width + x;
  const oldTileId = tiles[offset];
  if (oldTileId === newTileId) return null;

  tiles[offset] = newTileId;
  return { x, y, layer, oldTileId, newTileId };
}

/**
 * Update the 8 neighbors of (cx, cy) that share the same autotile slot.
 * Recalculates their patterns and returns any changes.
 */
function updateAutotileNeighbors(
  mapData: MapRenderData,
  cx: number,
  cy: number,
  layer: number,
  atSlot: number,
): TileChange[] {
  const changes: TileChange[] = [];
  const { tiles, width, height } = mapData;

  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

    const offset = layer * width * height + ny * width + nx;
    const neighborTile = tiles[offset];

    // Only update neighbors that are the same autotile slot
    if (isAutotile(neighborTile) && getAutotileIndex(neighborTile) === atSlot) {
      const change = resolveAutotile(mapData, nx, ny, layer, atSlot);
      if (change) changes.push(change);
    }
  }

  return changes;
}

// ─── Public painting operations ────────────────────────────────────────

/**
 * Paint a single tile (raw, no autotile logic). Returns the change for undo.
 */
function paintTileRaw(
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
 * Paint a single tile. If painting an autotile, automatically resolves the
 * correct pattern and updates neighboring autotile cells.
 *
 * Returns all changes (placed tile + neighbor updates) for undo.
 */
export function paintTile(
  mapData: MapRenderData,
  x: number,
  y: number,
  layer: number,
  tileId: number
): TileChange[] {
  if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) {
    return [];
  }

  const changes: TileChange[] = [];

  // Check if old tile was an autotile (need to update its neighbors after removal)
  const oldTileId = getTile(mapData.tiles, x, y, layer, mapData.width, mapData.height);
  const oldWasAutotile = isAutotile(oldTileId);
  const oldAtSlot = oldWasAutotile ? getAutotileIndex(oldTileId) : -1;

  if (isAutotile(tileId)) {
    const atSlot = getAutotileIndex(tileId);

    // Place the autotile with a temporary ID (will be resolved immediately)
    const tempId = (atSlot + 1) * 48; // pattern 0 as placeholder
    const placeChange = paintTileRaw(mapData, x, y, layer, tempId);
    // Don't push placeChange yet — resolveAutotile will set the correct ID

    // Resolve correct pattern based on neighbors
    const resolveChange = resolveAutotile(mapData, x, y, layer, atSlot);

    // Build the final change from original oldTileId to resolved newTileId
    const finalNewId = mapData.tiles[layer * mapData.width * mapData.height + y * mapData.width + x];
    if (oldTileId !== finalNewId) {
      changes.push({ x, y, layer, oldTileId, newTileId: finalNewId });
    }

    // Update neighbors of the same autotile slot
    const neighborChanges = updateAutotileNeighbors(mapData, x, y, layer, atSlot);
    changes.push(...neighborChanges);

    // If old tile was a DIFFERENT autotile slot, update those neighbors too
    if (oldWasAutotile && oldAtSlot !== atSlot) {
      const oldNeighborChanges = updateAutotileNeighbors(mapData, x, y, layer, oldAtSlot);
      changes.push(...oldNeighborChanges);
    }
  } else {
    // Non-autotile (regular tile or erase)
    const change = paintTileRaw(mapData, x, y, layer, tileId);
    if (change) changes.push(change);

    // If old tile was an autotile, update its former neighbors
    if (oldWasAutotile) {
      const neighborChanges = updateAutotileNeighbors(mapData, x, y, layer, oldAtSlot);
      changes.push(...neighborChanges);
    }
  }

  return changes;
}

/**
 * Paint a rectangular area. Returns all changes.
 * For autotiles, resolves all patterns after placing all tiles.
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

  if (!isAutotile(tileId)) {
    // Non-autotile: simple placement
    const changes: TileChange[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const oldTileId = getTile(mapData.tiles, x, y, layer, mapData.width, mapData.height);
        const oldWasAutotile = isAutotile(oldTileId);
        const oldAtSlot = oldWasAutotile ? getAutotileIndex(oldTileId) : -1;

        const change = paintTileRaw(mapData, x, y, layer, tileId);
        if (change) changes.push(change);

        // Update old autotile neighbors
        if (oldWasAutotile) {
          changes.push(...updateAutotileNeighbors(mapData, x, y, layer, oldAtSlot));
        }
      }
    }
    return changes;
  }

  // Autotile: place all tiles first with temporary IDs, then resolve all patterns
  const atSlot = getAutotileIndex(tileId);
  const tempId = (atSlot + 1) * 48;

  // Collect old tile IDs and autotile slots that will need neighbor updates
  const oldSlots = new Set<number>();
  const oldTileIds = new Map<string, number>();

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const old = getTile(mapData.tiles, x, y, layer, mapData.width, mapData.height);
      oldTileIds.set(`${x},${y}`, old);
      if (isAutotile(old)) {
        const s = getAutotileIndex(old);
        if (s !== atSlot) oldSlots.add(s);
      }
      // Place temporary ID
      setTile(mapData.tiles, x, y, layer, mapData.width, mapData.height, tempId);
    }
  }

  const changes: TileChange[] = [];

  // Resolve patterns for all placed cells
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      resolveAutotile(mapData, x, y, layer, atSlot);
      const newId = mapData.tiles[layer * mapData.width * mapData.height + y * mapData.width + x];
      const oldId = oldTileIds.get(`${x},${y}`)!;
      if (oldId !== newId) {
        changes.push({ x, y, layer, oldTileId: oldId, newTileId: newId });
      }
    }
  }

  // Update neighbors along the border of the rectangle (same autotile slot)
  const borderNeighbors = new Set<string>();
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const nx = x + dx;
        const ny = y + dy;
        // Only external neighbors (not inside the rectangle)
        if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) continue;
        if (nx < 0 || nx >= mapData.width || ny < 0 || ny >= mapData.height) continue;
        borderNeighbors.add(`${nx},${ny}`);
      }
    }
  }

  for (const key of borderNeighbors) {
    const [nx, ny] = key.split(",").map(Number);
    const neighborTile = getTile(mapData.tiles, nx, ny, layer, mapData.width, mapData.height);
    if (isAutotile(neighborTile) && getAutotileIndex(neighborTile) === atSlot) {
      const change = resolveAutotile(mapData, nx, ny, layer, atSlot);
      if (change) changes.push(change);
    }
    // Also update neighbors of different old autotile slots
    for (const oldSlot of oldSlots) {
      if (isAutotile(neighborTile) && getAutotileIndex(neighborTile) === oldSlot) {
        const change = resolveAutotile(mapData, nx, ny, layer, oldSlot);
        if (change) changes.push(change);
      }
    }
  }

  return changes;
}

/**
 * Flood fill from a starting position. Returns all changes.
 * For autotiles, fills with the correct pattern for each cell.
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

  // For autotiles, match by slot rather than exact ID
  const targetIsAutotile = isAutotile(targetId);
  const targetSlot = targetIsAutotile ? getAutotileIndex(targetId) : -1;

  // Check if we'd be filling with the same thing
  if (isAutotile(tileId)) {
    const fillSlot = getAutotileIndex(tileId);
    if (targetIsAutotile && targetSlot === fillSlot) return [];
  } else {
    if (targetId === tileId) return [];
  }

  // Phase 1: BFS to find all cells to fill (match by same tile ID or same autotile slot)
  const filled: [number, number][] = [];
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) continue;

    const currentId = getTile(mapData.tiles, x, y, layer, mapData.width, mapData.height);

    // Match: for autotiles match by slot, for regular tiles match by exact ID
    let matches: boolean;
    if (targetIsAutotile) {
      matches = isAutotile(currentId) && getAutotileIndex(currentId) === targetSlot;
    } else {
      matches = currentId === targetId;
    }
    if (!matches) continue;

    visited.add(key);
    filled.push([x, y]);

    // Add 4-directional neighbors
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }

  if (filled.length === 0) return [];

  // Collect old tile IDs
  const oldTileIds = new Map<string, number>();
  for (const [x, y] of filled) {
    oldTileIds.set(`${x},${y}`, getTile(mapData.tiles, x, y, layer, mapData.width, mapData.height));
  }

  if (!isAutotile(tileId)) {
    // Non-autotile fill: simple placement
    const changes: TileChange[] = [];
    const affectedOldSlots = new Set<number>();

    for (const [x, y] of filled) {
      const old = oldTileIds.get(`${x},${y}`)!;
      if (isAutotile(old)) affectedOldSlots.add(getAutotileIndex(old));
      paintTileRaw(mapData, x, y, layer, tileId);
      if (old !== tileId) {
        changes.push({ x, y, layer, oldTileId: old, newTileId: tileId });
      }
    }

    // Update old autotile neighbors along the border
    for (const [x, y] of filled) {
      for (const slot of affectedOldSlots) {
        changes.push(...updateAutotileNeighbors(mapData, x, y, layer, slot));
      }
    }

    return changes;
  }

  // Autotile fill
  const atSlot = getAutotileIndex(tileId);
  const tempId = (atSlot + 1) * 48;

  // Phase 2: Place all tiles with temporary IDs
  for (const [x, y] of filled) {
    setTile(mapData.tiles, x, y, layer, mapData.width, mapData.height, tempId);
  }

  const changes: TileChange[] = [];

  // Phase 3: Resolve all patterns
  for (const [x, y] of filled) {
    resolveAutotile(mapData, x, y, layer, atSlot);
    const newId = mapData.tiles[layer * mapData.width * mapData.height + y * mapData.width + x];
    const oldId = oldTileIds.get(`${x},${y}`)!;
    if (oldId !== newId) {
      changes.push({ x, y, layer, oldTileId: oldId, newTileId: newId });
    }
  }

  // Phase 4: Update border neighbors
  const filledSet = new Set(filled.map(([x, y]) => `${x},${y}`));
  const borderNeighbors = new Set<string>();
  const oldSlots = new Set<number>();
  for (const [x, y] of filled) {
    const old = oldTileIds.get(`${x},${y}`)!;
    if (isAutotile(old) && getAutotileIndex(old) !== atSlot) {
      oldSlots.add(getAutotileIndex(old));
    }
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = `${nx},${ny}`;
      if (filledSet.has(nk)) continue;
      if (nx < 0 || nx >= mapData.width || ny < 0 || ny >= mapData.height) continue;
      borderNeighbors.add(nk);
    }
  }

  for (const key of borderNeighbors) {
    const [nx, ny] = key.split(",").map(Number);
    const neighborTile = getTile(mapData.tiles, nx, ny, layer, mapData.width, mapData.height);
    if (isAutotile(neighborTile)) {
      const ns = getAutotileIndex(neighborTile);
      if (ns === atSlot || oldSlots.has(ns)) {
        const change = resolveAutotile(mapData, nx, ny, layer, ns);
        if (change) changes.push(change);
      }
    }
  }

  return changes;
}

/**
 * Erase a tile (set to 0). Returns changes including neighbor updates.
 */
export function eraseTile(
  mapData: MapRenderData,
  x: number,
  y: number,
  layer: number
): TileChange[] {
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
