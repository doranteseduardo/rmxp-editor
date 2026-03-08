// --- Project types ---

export interface ProjectInfo {
  name: string;
  path: string;
  map_infos: Record<number, MapInfo>;
  tileset_count: number;
  edit_map_id: number;
}

export interface MapInfo {
  name: string;
  parent_id: number;
  order: number;
  expanded: boolean;
  scroll_x: number;
  scroll_y: number;
}

// --- Map types ---

export interface MapRenderData {
  id: number;
  width: number;
  height: number;
  tileset_id: number;
  /** Flattened tile data: layer0[w*h] + layer1[w*h] + layer2[w*h] */
  tiles: number[];
  events: EventInfo[];
}

export interface EventInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  page_count: number;
  graphic_name: string;
  graphic_direction: number;
  graphic_pattern: number;
}

// --- Tileset types ---

export interface TilesetRenderInfo {
  id: number;
  name: string;
  tileset_name: string;
  autotile_names: string[];
  passages: number[];
  priorities: number[];
  terrain_tags: number[];
}

// --- Map properties (for properties dialog) ---

export interface MapProperties {
  id: number;
  name: string;
  tileset_id: number;
  width: number;
  height: number;
  autoplay_bgm: boolean;
  bgm_name: string;
  bgm_volume: number;
  bgm_pitch: number;
  autoplay_bgs: boolean;
  bgs_name: string;
  bgs_volume: number;
  bgs_pitch: number;
  encounter_step: number;
  scroll_type: number;
  disable_dashing: boolean;
  parallax_name: string;
  parallax_loop_x: boolean;
  parallax_loop_y: boolean;
  parallax_sx: number;
  parallax_sy: number;
  parallax_show: boolean;
}

// --- Map tree node (derived from MapInfo) ---

export interface MapTreeNode {
  id: number;
  name: string;
  parent_id: number;
  order: number;
  children: MapTreeNode[];
  expanded: boolean;
}

// --- Full event types (for event editor) ---

export interface RpgEvent {
  id: number;
  name: string;
  x: number;
  y: number;
  pages: EventPage[];
}

export interface EventPage {
  condition: EventCondition;
  graphic: EventGraphic;
  move_type: number;
  move_speed: number;
  move_frequency: number;
  move_route: MoveRoute;
  walk_anime: boolean;
  step_anime: boolean;
  direction_fix: boolean;
  through: boolean;
  always_on_top: boolean;
  trigger: number;
  list: EventCommand[];
}

export interface EventCondition {
  switch1_valid: boolean;
  switch2_valid: boolean;
  variable_valid: boolean;
  self_switch_valid: boolean;
  switch1_id: number;
  switch2_id: number;
  variable_id: number;
  variable_value: number;
  self_switch_ch: string;
}

export interface EventGraphic {
  tile_id: number;
  character_name: string;
  character_hue: number;
  direction: number;
  pattern: number;
  opacity: number;
  blend_type: number;
}

export interface MoveRoute {
  repeat: boolean;
  skippable: boolean;
  list: MoveCommand[];
}

export interface MoveCommand {
  code: number;
  parameters: unknown[];
}

export interface EventCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

/** Trigger type constants */
export const EVENT_TRIGGERS: Record<number, string> = {
  0: "Action Button",
  1: "Player Touch",
  2: "Event Touch",
  3: "Autorun",
  4: "Parallel Process",
};

/** Move type constants */
export const MOVE_TYPES: Record<number, string> = {
  0: "Fixed",
  1: "Random",
  2: "Approach",
  3: "Custom",
};

/** Direction constants */
export const DIRECTIONS: Record<number, string> = {
  2: "Down",
  4: "Left",
  6: "Right",
  8: "Up",
};

// --- Editor state ---

export type PaintTool = "pencil" | "rectangle" | "bucket" | "eraser" | "event";

export interface EditorState {
  project: ProjectInfo | null;
  currentMapId: number | null;
  mapData: MapRenderData | null;
  tilesetInfo: TilesetRenderInfo | null;
  selectedTileId: number;
  selectedLayer: number;
  paintTool: PaintTool;
  zoom: number;
  showGrid: boolean;
  showEvents: boolean;
}

// --- Tile ID helpers ---

export const TILE_SIZE = 32;
export const AUTOTILE_COUNT = 7;
export const AUTOTILE_PATTERNS = 48;
export const FIRST_REGULAR_TILE = 384; // 48 * 8

/**
 * Check if a tile ID is an autotile.
 */
export function isAutotile(tileId: number): boolean {
  return tileId >= 48 && tileId < FIRST_REGULAR_TILE;
}

/**
 * Check if a tile ID is a regular tileset tile.
 */
export function isRegularTile(tileId: number): boolean {
  return tileId >= FIRST_REGULAR_TILE;
}

/**
 * Get the autotile index (0-6) for an autotile tile ID.
 */
export function getAutotileIndex(tileId: number): number {
  return Math.floor(tileId / 48) - 1;
}

/**
 * Get the pattern index (0-47) for an autotile tile ID.
 */
export function getAutotilePattern(tileId: number): number {
  return tileId % 48;
}

/**
 * Get the tileset (x, y) position for a regular tile ID.
 * The tileset is 8 tiles wide.
 */
export function getRegularTilePos(tileId: number): { x: number; y: number } {
  const index = tileId - FIRST_REGULAR_TILE;
  return {
    x: index % 8,
    y: Math.floor(index / 8),
  };
}

/**
 * Get a tile from the flat tile array.
 * tiles layout: [layer0_tiles..., layer1_tiles..., layer2_tiles...]
 */
export function getTile(
  tiles: number[],
  x: number,
  y: number,
  layer: number,
  width: number,
  height: number
): number {
  const offset = layer * width * height + y * width + x;
  return tiles[offset] ?? 0;
}
