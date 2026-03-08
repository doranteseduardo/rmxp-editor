/**
 * Tauri IPC command wrappers.
 *
 * These functions call the Rust backend via Tauri's invoke mechanism.
 * During development without Tauri, they fall back to mock data.
 */

import type {
  ProjectInfo,
  MapRenderData,
  TilesetRenderInfo,
  RpgEvent,
} from "../types";

// Lazy-loaded Tauri invoke — resolved on first call
type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
let _invoke: InvokeFn | null = null;
let _resolving: Promise<InvokeFn> | null = null;

async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  if (!_invoke) {
    if (!_resolving) {
      _resolving = (async () => {
        try {
          const mod = await import("@tauri-apps/api/core");
          _invoke = mod.invoke;
          console.log("[tauriApi] Using real Tauri invoke");
        } catch {
          _invoke = mockInvoke;
          console.log("[tauriApi] Tauri not available, using mock data");
        }
        return _invoke!;
      })();
    }
    _invoke = await _resolving;
  }
  return _invoke(cmd, args);
}

/**
 * Open an RMXP project directory.
 */
export async function openProject(path: string): Promise<ProjectInfo> {
  return (await invoke("open_project", { path })) as ProjectInfo;
}

/**
 * Load map data for rendering.
 */
export async function loadMap(
  projectPath: string,
  mapId: number
): Promise<MapRenderData> {
  return (await invoke("load_map", {
    projectPath,
    mapId,
  })) as MapRenderData;
}

/**
 * Save modified map tile data back to .rxdata.
 */
export async function saveMap(
  projectPath: string,
  mapId: number,
  tiles: number[],
  width: number,
  height: number
): Promise<void> {
  await invoke("save_map", {
    projectPath,
    mapId,
    tiles,
    width,
    height,
  });
}

/**
 * Load tileset information for the palette.
 */
export async function loadTileset(
  projectPath: string,
  tilesetId: number
): Promise<TilesetRenderInfo> {
  return (await invoke("load_tileset", {
    projectPath,
    tilesetId,
  })) as TilesetRenderInfo;
}

/**
 * Load full event data (all pages, commands) for the event editor.
 */
export async function loadEvent(
  projectPath: string,
  mapId: number,
  eventId: number
): Promise<RpgEvent> {
  return (await invoke("load_event", {
    projectPath,
    mapId,
    eventId,
  })) as RpgEvent;
}

/**
 * Get the filesystem path for a game asset.
 */
export async function getAssetPath(
  projectPath: string,
  assetType: string,
  assetName: string
): Promise<string> {
  return (await invoke("get_asset_path", {
    projectPath,
    assetType,
    assetName,
  })) as string;
}

/**
 * Mock invoke for development without Tauri runtime.
 */
async function mockInvoke(
  cmd: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  console.log(`[mock] invoke: ${cmd}`, args);

  switch (cmd) {
    case "open_project":
      return {
        name: "Pokemon Essentials v21.1 (Mock)",
        path: (args?.path as string) ?? "/mock/path",
        map_infos: {
          1: { name: "Intro", parent_id: 0, order: 0, expanded: true, scroll_x: 0, scroll_y: 0 },
          2: { name: "Lappet Town", parent_id: 0, order: 1, expanded: true, scroll_x: 0, scroll_y: 0 },
          3: { name: "Player's House 1F", parent_id: 2, order: 2, expanded: false, scroll_x: 0, scroll_y: 0 },
          4: { name: "Player's House 2F", parent_id: 2, order: 3, expanded: false, scroll_x: 0, scroll_y: 0 },
          5: { name: "Route 1", parent_id: 0, order: 4, expanded: false, scroll_x: 0, scroll_y: 0 },
        },
        tileset_count: 8,
        edit_map_id: 2,
      } satisfies ProjectInfo;

    case "load_map": {
      const w = 20;
      const h = 15;
      const tiles: number[] = [];
      for (let z = 0; z < 3; z++) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (z === 0) {
              tiles.push(384 + Math.floor(Math.random() * 3));
            } else {
              tiles.push(0);
            }
          }
        }
      }
      return {
        id: (args?.mapId as number) ?? 1,
        width: w,
        height: h,
        tileset_id: 1,
        tiles,
        events: [
          { id: 1, name: "Player Start", x: 10, y: 8, page_count: 1, graphic_name: "trainer_POKEMONTRAINER_Red", graphic_direction: 2, graphic_pattern: 0 },
          { id: 2, name: "Sign", x: 5, y: 5, page_count: 1, graphic_name: "", graphic_direction: 2, graphic_pattern: 0 },
        ],
      } satisfies MapRenderData;
    }

    case "load_tileset":
      return {
        id: (args?.tilesetId as number) ?? 1,
        name: "Mock Tileset",
        tileset_name: "Outside",
        autotile_names: ["Water", "Grass", "Path", "", "", "", ""],
        passages: new Array(384).fill(0),
        priorities: new Array(384).fill(0),
        terrain_tags: new Array(384).fill(0),
      } satisfies TilesetRenderInfo;

    case "load_event":
      return {
        id: (args?.eventId as number) ?? 1,
        name: (args?.eventId as number) === 1 ? "Player Start" : "Sign",
        x: (args?.eventId as number) === 1 ? 10 : 5,
        y: (args?.eventId as number) === 1 ? 8 : 5,
        pages: [
          {
            condition: {
              switch1_valid: false, switch2_valid: false,
              variable_valid: false, self_switch_valid: false,
              switch1_id: 1, switch2_id: 1,
              variable_id: 1, variable_value: 0,
              self_switch_ch: "A",
            },
            graphic: {
              tile_id: 0,
              character_name: (args?.eventId as number) === 1 ? "trainer_POKEMONTRAINER_Red" : "",
              character_hue: 0,
              direction: 2,
              pattern: 0,
              opacity: 255,
              blend_type: 0,
            },
            move_type: 0,
            move_speed: 3,
            move_frequency: 3,
            move_route: { repeat: true, skippable: false, list: [{ code: 0, parameters: [] }] },
            walk_anime: true,
            step_anime: false,
            direction_fix: false,
            through: false,
            always_on_top: false,
            trigger: (args?.eventId as number) === 1 ? 3 : 0,
            list: [
              { code: 108, indent: 0, parameters: ["This is a mock event for development"] },
              { code: 101, indent: 0, parameters: ["Hello! Welcome to the mock project."] },
              { code: 401, indent: 0, parameters: ["This is a continuation line."] },
              { code: 111, indent: 0, parameters: [0, 1, 0] },
              { code: 101, indent: 1, parameters: ["The switch is ON!"] },
              { code: 411, indent: 0, parameters: [] },
              { code: 101, indent: 1, parameters: ["The switch is OFF."] },
              { code: 412, indent: 0, parameters: [] },
              { code: 355, indent: 0, parameters: ["pbMessage(\"Hello from script!\")"] },
              { code: 0, indent: 0, parameters: [] },
            ],
          },
        ],
      } satisfies RpgEvent;

    case "get_asset_path":
      return `/mock/Graphics/${args?.assetType}/${args?.assetName}.png`;

    default:
      throw new Error(`Unknown mock command: ${cmd}`);
  }
}
