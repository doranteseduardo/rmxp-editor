use crate::marshal;
use crate::models::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Project metadata returned when opening a project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub map_infos: HashMap<i64, MapInfo>,
    pub tileset_count: usize,
    pub edit_map_id: i64,
}

/// Map data sent to the frontend for rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapRenderData {
    pub id: i64,
    pub width: i64,
    pub height: i64,
    pub tileset_id: i64,
    /// Flattened tile data: [layer0_tiles..., layer1_tiles..., layer2_tiles...]
    /// Each layer is width*height i16 values in row-major order.
    pub tiles: Vec<i16>,
    pub events: Vec<EventInfo>,
}

/// Lightweight event info for the map editor overlay.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventInfo {
    pub id: i64,
    pub name: String,
    pub x: i64,
    pub y: i64,
    pub page_count: usize,
    pub graphic_name: String,
    pub graphic_direction: i64,
    pub graphic_pattern: i64,
}

/// Tileset info sent to the frontend for the palette.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TilesetRenderInfo {
    pub id: i64,
    pub name: String,
    pub tileset_name: String,
    pub autotile_names: Vec<String>,
    pub passages: Vec<i16>,
    pub priorities: Vec<i16>,
    pub terrain_tags: Vec<i16>,
}

/// Open an RMXP project directory.
///
/// Validates the directory structure, loads MapInfos, System, and Tilesets.
#[tauri::command]
pub async fn open_project(path: String) -> Result<ProjectInfo, String> {
    let project_path = PathBuf::from(&path);

    // Validate project structure
    let rxproj = project_path.join("Game.rxproj");
    if !rxproj.exists() {
        return Err("Not a valid RMXP project: Game.rxproj not found".to_string());
    }

    // Read Game.ini for project name
    let ini_path = project_path.join("Game.ini");
    let name = if ini_path.exists() {
        let ini_content = std::fs::read_to_string(&ini_path)
            .map_err(|e| format!("Failed to read Game.ini: {}", e))?;
        parse_ini_title(&ini_content).unwrap_or_else(|| "Untitled Project".to_string())
    } else {
        "Untitled Project".to_string()
    };

    // Load MapInfos.rxdata
    let map_infos_path = project_path.join("Data").join("MapInfos.rxdata");
    let map_infos = load_map_infos(&map_infos_path)?;

    // Load System.rxdata for edit_map_id
    let system_path = project_path.join("Data").join("System.rxdata");
    let system = load_system(&system_path)?;

    // Count tilesets
    let tilesets_path = project_path.join("Data").join("Tilesets.rxdata");
    let tileset_count = count_tilesets(&tilesets_path).unwrap_or(0);

    eprintln!("[open_project] Loaded: '{}', {} maps, {} tilesets, edit_map_id={}",
        name, map_infos.len(), tileset_count, system.edit_map_id);

    Ok(ProjectInfo {
        name,
        path,
        map_infos,
        tileset_count,
        edit_map_id: system.edit_map_id,
    })
}

/// Load a specific map by ID.
#[tauri::command]
pub async fn load_map(project_path: String, map_id: i64) -> Result<MapRenderData, String> {
    let path = PathBuf::from(&project_path);
    let map_file = path
        .join("Data")
        .join(format!("Map{:03}.rxdata", map_id));

    if !map_file.exists() {
        return Err(format!("Map file not found: Map{:03}.rxdata", map_id));
    }

    eprintln!("[load_map] Loading Map{:03}...", map_id);
    let value = marshal::load_file(&map_file)
        .map_err(|e| {
            eprintln!("[load_map] Marshal parse error for Map{:03}: {}", map_id, e);
            format!("Failed to parse map: {}", e)
        })?;

    eprintln!("[load_map] Parsed Map{:03} OK: {}", map_id, value);

    let map = RpgMap::from_ruby_value(&value)
        .ok_or_else(|| {
            eprintln!("[load_map] Failed to interpret Map{:03} as RPG::Map", map_id);
            "Failed to interpret map data".to_string()
        })?;

    eprintln!("[load_map] Map{:03}: {}x{}, tileset={}, events={}",
        map_id, map.width, map.height, map.tileset_id, map.events.len());

    // Debug: print raw Table info
    eprintln!("[load_map] Table dims: {}x{}x{}, data_len={}, sample={:?}",
        map.data.x_size, map.data.y_size, map.data.z_size,
        map.data.data.len(),
        &map.data.data[..std::cmp::min(20, map.data.data.len())]);

    // Flatten tile data for frontend: 3 layers × width × height
    let mut tiles = Vec::with_capacity((map.width * map.height * 3) as usize);
    for z in 0..3u32 {
        for y in 0..map.height as u32 {
            for x in 0..map.width as u32 {
                tiles.push(map.data.get(x, y, z));
            }
        }
    }

    // Debug: count non-zero tiles per layer
    let layer_size = (map.width * map.height) as usize;
    for z in 0..3 {
        let start = z * layer_size;
        let end = start + layer_size;
        let nonzero = tiles[start..end].iter().filter(|&&t| t > 0).count();
        eprintln!("[load_map] Layer {}: {}/{} non-zero tiles, sample={:?}",
            z, nonzero, layer_size, &tiles[start..std::cmp::min(start + 10, end)]);
    }

    // Extract event info
    let events: Vec<EventInfo> = map
        .events
        .values()
        .map(|e| {
            let (graphic_name, graphic_dir, graphic_pattern) =
                if let Some(page) = e.pages.first() {
                    (
                        page.graphic.character_name.clone(),
                        page.graphic.direction,
                        page.graphic.pattern,
                    )
                } else {
                    (String::new(), 2, 0)
                };

            EventInfo {
                id: e.id,
                name: e.name.clone(),
                x: e.x,
                y: e.y,
                page_count: e.pages.len(),
                graphic_name,
                graphic_direction: graphic_dir,
                graphic_pattern: graphic_pattern,
            }
        })
        .collect();

    Ok(MapRenderData {
        id: map_id,
        width: map.width,
        height: map.height,
        tileset_id: map.tileset_id,
        tiles,
        events,
    })
}

/// Load tileset information for the palette.
#[tauri::command]
pub async fn load_tileset(
    project_path: String,
    tileset_id: i64,
) -> Result<TilesetRenderInfo, String> {
    let path = PathBuf::from(&project_path);
    let tilesets_path = path.join("Data").join("Tilesets.rxdata");

    eprintln!("[load_tileset] Loading tileset {}...", tileset_id);
    let value = marshal::load_file(&tilesets_path)
        .map_err(|e| {
            eprintln!("[load_tileset] Marshal parse error: {}", e);
            format!("Failed to parse Tilesets.rxdata: {}", e)
        })?;

    let arr = value
        .as_array()
        .ok_or_else(|| {
            eprintln!("[load_tileset] Tilesets.rxdata top-level is {}, not array", value);
            "Tilesets.rxdata is not an array".to_string()
        })?;

    // Tilesets array is 1-indexed (index 0 is nil)
    let tileset_value = arr
        .get(tileset_id as usize)
        .ok_or_else(|| format!("Tileset {} not found", tileset_id))?;

    eprintln!("[load_tileset] Tileset {} value: {}", tileset_id, tileset_value);
    let tileset = RpgTileset::from_ruby_value(tileset_value)
        .ok_or_else(|| {
            eprintln!("[load_tileset] Failed to interpret tileset {} as RPG::Tileset", tileset_id);
            "Failed to interpret tileset data".to_string()
        })?;
    eprintln!("[load_tileset] Tileset {}: name='{}', tileset_name='{}', autotiles={:?}",
        tileset_id, tileset.name, tileset.tileset_name, tileset.autotile_names);

    // Convert Table data to flat Vec<i16> for frontend
    let passages: Vec<i16> = (0..tileset.passages.x_size)
        .map(|i| tileset.passages.get(i, 0, 0))
        .collect();
    let priorities: Vec<i16> = (0..tileset.priorities.x_size)
        .map(|i| tileset.priorities.get(i, 0, 0))
        .collect();
    let terrain_tags: Vec<i16> = (0..tileset.terrain_tags.x_size)
        .map(|i| tileset.terrain_tags.get(i, 0, 0))
        .collect();

    Ok(TilesetRenderInfo {
        id: tileset.id,
        name: tileset.name,
        tileset_name: tileset.tileset_name,
        autotile_names: tileset.autotile_names,
        passages,
        priorities,
        terrain_tags,
    })
}

/// Get the file path for a tileset or autotile image.
#[tauri::command]
pub async fn get_asset_path(
    project_path: String,
    asset_type: String,
    asset_name: String,
) -> Result<String, String> {
    let base = PathBuf::from(&project_path).join("Graphics");

    let dir = match asset_type.as_str() {
        "tileset" => "Tilesets",
        "autotile" => "Autotiles",
        "character" => "Characters",
        "panorama" => "Panoramas",
        "fog" => "Fogs",
        "battleback" => "Battlebacks",
        "picture" => "Pictures",
        "animation" => "Animations",
        "icon" => "Icons",
        _ => return Err(format!("Unknown asset type: {}", asset_type)),
    };

    // Try common image extensions
    let base_path = base.join(dir).join(&asset_name);
    eprintln!("[get_asset_path] Looking for {}/{} at base: {:?}", asset_type, asset_name, base_path);
    for ext in &["png", "jpg", "jpeg", "bmp", "gif"] {
        let path = base_path.with_extension(ext);
        let exists = path.exists();
        eprintln!("[get_asset_path]   Try {:?} → exists={}", path, exists);
        if exists {
            eprintln!("[get_asset_path] ✓ Found: {:?}", path);
            return Ok(path.to_string_lossy().into_owned());
        }
    }

    // Try without extension (file might already have one)
    if base_path.exists() {
        eprintln!("[get_asset_path] ✓ Found (no ext): {:?}", base_path);
        return Ok(base_path.to_string_lossy().into_owned());
    }

    eprintln!("[get_asset_path] ✗ Not found: {}/{}", asset_type, asset_name);
    Err(format!(
        "Asset not found: {}/{}",
        asset_type, asset_name
    ))
}

/// Load the full event data for a specific event on a map.
/// Returns the complete RPG::Event with all pages and commands.
#[tauri::command]
pub async fn load_event(
    project_path: String,
    map_id: i64,
    event_id: i64,
) -> Result<RpgEvent, String> {
    let path = PathBuf::from(&project_path);
    let map_file = path
        .join("Data")
        .join(format!("Map{:03}.rxdata", map_id));

    let value = marshal::load_file(&map_file)
        .map_err(|e| format!("Failed to parse map: {}", e))?;

    let map = RpgMap::from_ruby_value(&value)
        .ok_or_else(|| "Failed to interpret map data".to_string())?;

    map.events
        .get(&event_id)
        .cloned()
        .ok_or_else(|| format!("Event {} not found on map {}", event_id, map_id))
}

/// Save modified tile data back to a map file.
///
/// Takes the flat tile array from the frontend and writes it back
/// into the original .rxdata file, preserving all other map data.
#[tauri::command]
pub async fn save_map(
    project_path: String,
    map_id: i64,
    tiles: Vec<i16>,
    width: i64,
    height: i64,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let map_file = path
        .join("Data")
        .join(format!("Map{:03}.rxdata", map_id));

    if !map_file.exists() {
        return Err(format!("Map file not found: Map{:03}.rxdata", map_id));
    }

    // Read the original map data
    let mut value = marshal::load_file(&map_file)
        .map_err(|e| format!("Failed to read map: {}", e))?;

    // Update the Table's raw data
    // Find the @data instance variable and replace the UserDefined bytes
    if let marshal::types::RubyValue::Object(ref mut obj) = value {
        // Rebuild the Table binary data
        let table = Table::new_3d(width as u32, height as u32, 3);
        let mut table_data = table;

        // Copy tile IDs from flat array into Table
        // Layout: [layer0_tiles..., layer1_tiles..., layer2_tiles...]
        for z in 0..3u32 {
            for y in 0..height as u32 {
                for x in 0..width as u32 {
                    let idx = (z as usize) * (width as usize) * (height as usize)
                        + (y as usize) * (width as usize)
                        + (x as usize);
                    if idx < tiles.len() {
                        table_data.set(x, y, z, tiles[idx]);
                    }
                }
            }
        }

        // Serialize the Table to bytes
        let table_bytes = table_data.to_bytes();

        // Find and replace the @data ivar
        for (name, val) in obj.instance_vars.iter_mut() {
            if name == "@data" {
                *val = marshal::types::RubyValue::UserDefined {
                    class_name: "Table".to_string(),
                    data: table_bytes.clone(),
                };
                break;
            }
        }
    }

    // Write back to file
    marshal::dump_file(&map_file, &value)
        .map_err(|e| format!("Failed to save map: {}", e))?;

    Ok(())
}

// --- Internal helpers ---

fn parse_ini_title(content: &str) -> Option<String> {
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("Title=") {
            return Some(line[6..].to_string());
        }
    }
    None
}

fn load_map_infos(path: &Path) -> Result<HashMap<i64, MapInfo>, String> {
    let value = marshal::load_file(path)
        .map_err(|e| format!("Failed to parse MapInfos.rxdata: {}", e))?;

    let pairs = value
        .as_hash()
        .ok_or_else(|| "MapInfos.rxdata is not a hash".to_string())?;

    let mut infos = HashMap::new();
    for (key, val) in pairs {
        if let Some(id) = key.as_int() {
            if let Some(info) = MapInfo::from_ruby_value(val) {
                infos.insert(id, info);
            }
        }
    }

    Ok(infos)
}

fn load_system(path: &Path) -> Result<RpgSystem, String> {
    let value = marshal::load_file(path)
        .map_err(|e| format!("Failed to parse System.rxdata: {}", e))?;

    RpgSystem::from_ruby_value(&value)
        .ok_or_else(|| "Failed to interpret System data".to_string())
}

fn count_tilesets(path: &Path) -> Option<usize> {
    let value = marshal::load_file(path).ok()?;
    let arr = value.as_array()?;
    Some(arr.len().saturating_sub(1)) // First element is nil
}
