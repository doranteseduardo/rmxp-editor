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
  EventInfo,
  MapProperties,
  MapInfo,
  ScriptEntry,
  ScriptData,
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
 * Save modified event data back to the map's .rxdata file.
 */
export async function saveEvent(
  projectPath: string,
  mapId: number,
  event: RpgEvent
): Promise<void> {
  await invoke("save_event", {
    projectPath,
    mapId,
    event,
  });
}

/**
 * Create a new event on a map at position (x, y).
 * Returns [newEvent, updatedEventInfos].
 */
export async function createEvent(
  projectPath: string,
  mapId: number,
  x: number,
  y: number
): Promise<[RpgEvent, EventInfo[]]> {
  return (await invoke("create_event", {
    projectPath,
    mapId,
    x,
    y,
  })) as [RpgEvent, EventInfo[]];
}

/**
 * Delete an event from a map. Returns updated event infos.
 */
export async function deleteEvent(
  projectPath: string,
  mapId: number,
  eventId: number
): Promise<EventInfo[]> {
  return (await invoke("delete_event", {
    projectPath,
    mapId,
    eventId,
  })) as EventInfo[];
}

/**
 * List all asset file names (without extension) in a given asset directory.
 */
export async function listAssetFiles(
  projectPath: string,
  assetType: string
): Promise<string[]> {
  return (await invoke("list_asset_files", {
    projectPath,
    assetType,
  })) as string[];
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
 * Get full map properties for the properties dialog.
 */
export async function getMapProperties(
  projectPath: string,
  mapId: number
): Promise<MapProperties> {
  return (await invoke("get_map_properties", {
    projectPath,
    mapId,
  })) as MapProperties;
}

/**
 * Save map properties back to .rxdata files.
 */
export async function saveMapProperties(
  projectPath: string,
  props: MapProperties
): Promise<void> {
  await invoke("save_map_properties", {
    projectPath,
    props,
  });
}

/**
 * Create a new blank map. Returns [newMapId, updatedMapInfos].
 */
export async function createMap(
  projectPath: string,
  name: string,
  parentId: number,
  width: number,
  height: number,
  tilesetId: number
): Promise<[number, Record<number, MapInfo>]> {
  return (await invoke("create_map", {
    projectPath,
    name,
    parentId,
    width,
    height,
    tilesetId,
  })) as [number, Record<number, MapInfo>];
}

/**
 * Delete a map. Returns updated map infos.
 */
export async function deleteMap(
  projectPath: string,
  mapId: number
): Promise<Record<number, MapInfo>> {
  return (await invoke("delete_map", {
    projectPath,
    mapId,
  })) as Record<number, MapInfo>;
}

/**
 * Rename a map in MapInfos.
 */
export async function renameMap(
  projectPath: string,
  mapId: number,
  newName: string
): Promise<void> {
  await invoke("rename_map", {
    projectPath,
    mapId,
    newName,
  });
}

/** List all tileset names (id → name) from Tilesets.rxdata. */
export async function listTilesetNames(
  projectPath: string
): Promise<Array<[number, string]>> {
  return await invoke<Array<[number, string]>>("list_tileset_names", {
    projectPath,
  });
}

/** Preview an audio asset through the native audio backend. */
export async function previewAudio(
  projectPath: string,
  assetType: string,
  assetName: string,
  volume: number = 0.8
): Promise<void> {
  await invoke("preview_audio", { projectPath, assetType, assetName, volume });
}

/** Stop the currently playing audio preview. */
export async function stopAudio(): Promise<void> {
  await invoke("stop_audio", {});
}

/** Check if audio is currently playing. */
export async function isAudioPlaying(): Promise<boolean> {
  return await invoke<boolean>("is_audio_playing", {});
}

// ── Script commands ─────────────────────────────────────────────

/** Load the script list (id + title only). */
export async function loadScriptList(
  projectPath: string
): Promise<ScriptEntry[]> {
  return await invoke<ScriptEntry[]>("load_script_list", { projectPath });
}

/** Load the decompressed source of a single script. */
export async function loadScriptSource(
  projectPath: string,
  scriptId: number
): Promise<string> {
  return await invoke<string>("load_script_source", { projectPath, scriptId });
}

/** Save all scripts back to Scripts.rxdata. */
export async function saveAllScripts(
  projectPath: string,
  scripts: ScriptData[]
): Promise<void> {
  await invoke("save_all_scripts", { projectPath, scripts });
}

/** Create a new script after the given script ID. Returns updated list. */
export async function createScript(
  projectPath: string,
  title: string,
  afterId: number
): Promise<ScriptEntry[]> {
  return await invoke<ScriptEntry[]>("create_script", {
    projectPath,
    title,
    afterId,
  });
}

/** Delete a script by ID. Returns updated list. */
export async function deleteScript(
  projectPath: string,
  scriptId: number
): Promise<ScriptEntry[]> {
  return await invoke<ScriptEntry[]>("delete_script", {
    projectPath,
    scriptId,
  });
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

    case "get_map_properties":
      return {
        id: (args?.mapId as number) ?? 1,
        name: "Mock Map",
        tileset_id: 1,
        width: 20,
        height: 15,
        autoplay_bgm: false,
        bgm_name: "",
        bgm_volume: 100,
        bgm_pitch: 100,
        autoplay_bgs: false,
        bgs_name: "",
        bgs_volume: 80,
        bgs_pitch: 100,
        encounter_step: 30,
        scroll_type: 0,
        disable_dashing: false,
        parallax_name: "",
        parallax_loop_x: false,
        parallax_loop_y: false,
        parallax_sx: 0,
        parallax_sy: 0,
        parallax_show: false,
      } satisfies MapProperties;

    case "save_map_properties":
      return;

    case "create_map":
      return [6, {
        1: { name: "Intro", parent_id: 0, order: 0, expanded: true, scroll_x: 0, scroll_y: 0 },
        2: { name: "Lappet Town", parent_id: 0, order: 1, expanded: true, scroll_x: 0, scroll_y: 0 },
        3: { name: "Player's House 1F", parent_id: 2, order: 2, expanded: false, scroll_x: 0, scroll_y: 0 },
        4: { name: "Player's House 2F", parent_id: 2, order: 3, expanded: false, scroll_x: 0, scroll_y: 0 },
        5: { name: "Route 1", parent_id: 0, order: 4, expanded: false, scroll_x: 0, scroll_y: 0 },
        6: { name: (args?.name as string) ?? "New Map", parent_id: (args?.parentId as number) ?? 0, order: 5, expanded: false, scroll_x: 0, scroll_y: 0 },
      }];

    case "delete_map":
      return {
        1: { name: "Intro", parent_id: 0, order: 0, expanded: true, scroll_x: 0, scroll_y: 0 },
        2: { name: "Lappet Town", parent_id: 0, order: 1, expanded: true, scroll_x: 0, scroll_y: 0 },
      };

    case "rename_map":
      return;

    case "create_event":
      return [{
        id: 99,
        name: "EV099",
        x: (args?.x as number) ?? 0,
        y: (args?.y as number) ?? 0,
        pages: [{
          condition: { switch1_valid: false, switch2_valid: false, variable_valid: false, self_switch_valid: false, switch1_id: 1, switch2_id: 1, variable_id: 1, variable_value: 0, self_switch_ch: "A" },
          graphic: { tile_id: 0, character_name: "", character_hue: 0, direction: 2, pattern: 0, opacity: 255, blend_type: 0 },
          move_type: 0, move_speed: 3, move_frequency: 3,
          move_route: { repeat: true, skippable: false, list: [{ code: 0, parameters: [] }] },
          walk_anime: true, step_anime: false, direction_fix: false, through: false, always_on_top: false, trigger: 0,
          list: [{ code: 0, indent: 0, parameters: [] }],
        }],
      }, [
        { id: 1, name: "Player Start", x: 10, y: 8, page_count: 1, graphic_name: "trainer_POKEMONTRAINER_Red", graphic_direction: 2, graphic_pattern: 0 },
        { id: 2, name: "Sign", x: 5, y: 5, page_count: 1, graphic_name: "", graphic_direction: 2, graphic_pattern: 0 },
        { id: 99, name: "EV099", x: (args?.x as number) ?? 0, y: (args?.y as number) ?? 0, page_count: 1, graphic_name: "", graphic_direction: 2, graphic_pattern: 0 },
      ]];

    case "delete_event":
      return [
        { id: 1, name: "Player Start", x: 10, y: 8, page_count: 1, graphic_name: "trainer_POKEMONTRAINER_Red", graphic_direction: 2, graphic_pattern: 0 },
      ];

    case "list_asset_files":
      return ["boy_run", "girl_run", "trainer_POKEMONTRAINER_Red", "trainer_POKEMONTRAINER_Blue", "NPC 01", "NPC 02"];

    case "get_asset_path":
      return `/mock/Graphics/${args?.assetType}/${args?.assetName}.png`;

    case "list_tileset_names":
      return [[1, "Outside"], [2, "Inside"], [3, "Cave"], [4, "Water"], [5, "Forest"], [6, "Desert"], [7, "Snow"], [8, "Trainer"]];

    case "preview_audio":
      console.log(`[mock] Preview audio: ${args?.assetType}/${args?.assetName}`);
      return;
    case "stop_audio":
      console.log("[mock] Stop audio");
      return;
    case "is_audio_playing":
      return false;

    case "load_script_list":
      return [
        { id: 1, title: "Game_Temp" }, { id: 2, title: "Game_System" },
        { id: 3, title: "Game_Switches" }, { id: 4, title: "Game_Variables" },
        { id: 5, title: "Game_Map" }, { id: 6, title: "Scene_Title" },
        { id: 7, title: "Scene_Map" }, { id: 8, title: "Main" },
      ] satisfies ScriptEntry[];

    case "load_script_source": {
      const sid = args?.scriptId as number;
      const mockSrc: Record<number, string> = {
        1: "class Game_Temp\n  attr_accessor :map_bgm\n  attr_accessor :message_text\n  attr_accessor :common_event_id\n\n  def initialize\n    @map_bgm = nil\n    @message_text = nil\n    @common_event_id = 0\n  end\nend",
        8: "begin\n  Graphics.freeze\n  $scene = Scene_Title.new\n  while $scene != nil\n    $scene.main\n  end\n  Graphics.transition(20)\nrescue Errno::ENOENT\n  filename = $!\n  print(\"Unable to find file #{filename}.\")\nend",
      };
      return mockSrc[sid] ?? `# ${sid}\n# Empty script`;
    }

    case "save_all_scripts":
      console.log("[mock] Saved scripts");
      return;

    case "create_script":
      return [
        { id: 1, title: "Game_Temp" }, { id: 2, title: "Game_System" },
        { id: 99, title: args?.title as string ?? "New Script" },
        { id: 8, title: "Main" },
      ] satisfies ScriptEntry[];

    case "delete_script":
      return [
        { id: 1, title: "Game_Temp" }, { id: 8, title: "Main" },
      ] satisfies ScriptEntry[];

    default:
      throw new Error(`Unknown mock command: ${cmd}`);
  }
}
