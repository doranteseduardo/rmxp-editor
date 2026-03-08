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

/// List all asset filenames in a given asset directory (without extensions).
/// Returns sorted Vec of asset names.
#[tauri::command]
pub async fn list_asset_files(
    project_path: String,
    asset_type: String,
) -> Result<Vec<String>, String> {
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

    let dir_path = base.join(dir);
    if !dir_path.exists() {
        return Ok(Vec::new());
    }

    let mut names: Vec<String> = Vec::new();
    let entries = std::fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if ["png", "jpg", "jpeg", "bmp", "gif"].contains(&ext.to_lowercase().as_str()) {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        names.push(stem.to_string());
                    }
                }
            }
        }
    }

    names.sort();
    Ok(names)
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

/// Save a modified event back to its map file.
///
/// Receives the full RpgEvent from the frontend and writes it back
/// into the original .rxdata file, replacing the event in the events hash.
#[tauri::command]
pub async fn save_event(
    project_path: String,
    map_id: i64,
    event: RpgEvent,
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

    // Find the @events ivar (a Hash of Integer → RPG::Event) and replace the target event
    if let marshal::types::RubyValue::Object(ref mut obj) = value {
        for (name, val) in obj.instance_vars.iter_mut() {
            if name == "@events" {
                if let marshal::types::RubyValue::Hash(ref mut pairs) = val {
                    // Find the matching event by ID key
                    for (key, event_val) in pairs.iter_mut() {
                        if let Some(id) = key.as_int() {
                            if id == event.id {
                                *event_val = event.to_ruby_value();
                                eprintln!("[save_event] Updated event {} on map {}", event.id, map_id);
                                break;
                            }
                        }
                    }
                }
                break;
            }
        }
    }

    // Write back to file
    marshal::dump_file(&map_file, &value)
        .map_err(|e| format!("Failed to save map: {}", e))?;

    Ok(())
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

/// Map properties data for the properties dialog.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapProperties {
    pub id: i64,
    pub name: String,
    pub tileset_id: i64,
    pub width: i64,
    pub height: i64,
    pub autoplay_bgm: bool,
    pub bgm_name: String,
    pub bgm_volume: i64,
    pub bgm_pitch: i64,
    pub autoplay_bgs: bool,
    pub bgs_name: String,
    pub bgs_volume: i64,
    pub bgs_pitch: i64,
    pub encounter_step: i64,
    pub scroll_type: i64,
    pub disable_dashing: bool,
    pub parallax_name: String,
    pub parallax_loop_x: bool,
    pub parallax_loop_y: bool,
    pub parallax_sx: i64,
    pub parallax_sy: i64,
    pub parallax_show: bool,
}

/// Get full map properties for the properties dialog.
#[tauri::command]
pub async fn get_map_properties(
    project_path: String,
    map_id: i64,
) -> Result<MapProperties, String> {
    let path = PathBuf::from(&project_path);
    let map_file = path.join("Data").join(format!("Map{:03}.rxdata", map_id));

    let value = marshal::load_file(&map_file)
        .map_err(|e| format!("Failed to parse map: {}", e))?;
    let map = RpgMap::from_ruby_value(&value)
        .ok_or_else(|| "Failed to interpret map data".to_string())?;

    // Get map name from MapInfos
    let map_infos_path = path.join("Data").join("MapInfos.rxdata");
    let map_infos = load_map_infos(&map_infos_path)?;
    let name = map_infos.get(&map_id).map(|i| i.name.clone()).unwrap_or_default();

    Ok(MapProperties {
        id: map_id,
        name,
        tileset_id: map.tileset_id,
        width: map.width,
        height: map.height,
        autoplay_bgm: map.autoplay_bgm,
        bgm_name: map.bgm.name.clone(),
        bgm_volume: map.bgm.volume,
        bgm_pitch: map.bgm.pitch,
        autoplay_bgs: map.autoplay_bgs,
        bgs_name: map.bgs.name.clone(),
        bgs_volume: map.bgs.volume,
        bgs_pitch: map.bgs.pitch,
        encounter_step: map.encounter_step,
        scroll_type: map.scroll_type,
        disable_dashing: map.disable_dashing,
        parallax_name: map.parallax_name,
        parallax_loop_x: map.parallax_loop_x,
        parallax_loop_y: map.parallax_loop_y,
        parallax_sx: map.parallax_sx,
        parallax_sy: map.parallax_sy,
        parallax_show: map.parallax_show,
    })
}

/// Save map properties back to .rxdata files.
/// Updates both the map file and MapInfos.rxdata (for name).
#[tauri::command]
pub async fn save_map_properties(
    project_path: String,
    props: MapProperties,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let map_file = path.join("Data").join(format!("Map{:03}.rxdata", props.id));

    // Update map file — modify instance variables on the raw RubyValue
    let mut value = marshal::load_file(&map_file)
        .map_err(|e| format!("Failed to read map: {}", e))?;

    if let marshal::types::RubyValue::Object(ref mut obj) = value {
        for (name, val) in obj.instance_vars.iter_mut() {
            match name.as_str() {
                "@tileset_id" => *val = marshal::types::RubyValue::Integer(props.tileset_id),
                "@width" => *val = marshal::types::RubyValue::Integer(props.width),
                "@height" => *val = marshal::types::RubyValue::Integer(props.height),
                "@autoplay_bgm" => *val = if props.autoplay_bgm { marshal::types::RubyValue::True } else { marshal::types::RubyValue::False },
                "@bgm" => {
                    let bgm = AudioFile { name: props.bgm_name.clone(), volume: props.bgm_volume, pitch: props.bgm_pitch };
                    *val = bgm.to_ruby_value();
                }
                "@autoplay_bgs" => *val = if props.autoplay_bgs { marshal::types::RubyValue::True } else { marshal::types::RubyValue::False },
                "@bgs" => {
                    let bgs = AudioFile { name: props.bgs_name.clone(), volume: props.bgs_volume, pitch: props.bgs_pitch };
                    *val = bgs.to_ruby_value();
                }
                "@encounter_step" => *val = marshal::types::RubyValue::Integer(props.encounter_step),
                "@scroll_type" => *val = marshal::types::RubyValue::Integer(props.scroll_type),
                "@disable_dashing" => *val = if props.disable_dashing { marshal::types::RubyValue::True } else { marshal::types::RubyValue::False },
                "@parallax_name" => *val = marshal::types::RubyValue::String(marshal::types::RubyString::with_encoding(props.parallax_name.as_bytes().to_vec(), "UTF-8".to_string())),
                "@parallax_loop_x" => *val = if props.parallax_loop_x { marshal::types::RubyValue::True } else { marshal::types::RubyValue::False },
                "@parallax_loop_y" => *val = if props.parallax_loop_y { marshal::types::RubyValue::True } else { marshal::types::RubyValue::False },
                "@parallax_sx" => *val = marshal::types::RubyValue::Integer(props.parallax_sx),
                "@parallax_sy" => *val = marshal::types::RubyValue::Integer(props.parallax_sy),
                "@parallax_show" => *val = if props.parallax_show { marshal::types::RubyValue::True } else { marshal::types::RubyValue::False },
                _ => {}
            }
        }

        // Handle resize — rebuild the Table if dimensions changed
        let old_width = obj.instance_vars.iter()
            .find(|(n, _)| n == "@width")
            .and_then(|(_, v)| v.as_int())
            .unwrap_or(props.width);
        let old_height = obj.instance_vars.iter()
            .find(|(n, _)| n == "@height")
            .and_then(|(_, v)| v.as_int())
            .unwrap_or(props.height);

        // Note: width/height were already updated above. Check if they differ from original loaded data.
        // We need to read the current table and resize it if needed.
        if old_width != props.width || old_height != props.height {
            // Find the @data ivar and resize the table
            for (name, val) in obj.instance_vars.iter_mut() {
                if name == "@data" {
                    if let marshal::types::RubyValue::UserDefined { class_name, data } = val {
                        if class_name == "Table" {
                            if let Some(mut table) = Table::from_bytes(data) {
                                table.resize(props.width as u32, props.height as u32, 3);
                                *data = table.to_bytes();
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    marshal::dump_file(&map_file, &value)
        .map_err(|e| format!("Failed to save map: {}", e))?;

    // Update MapInfos.rxdata with the new name
    let map_infos_path = path.join("Data").join("MapInfos.rxdata");
    let mut infos_value = marshal::load_file(&map_infos_path)
        .map_err(|e| format!("Failed to read MapInfos: {}", e))?;

    if let marshal::types::RubyValue::Hash(ref mut pairs) = infos_value {
        for (key, val) in pairs.iter_mut() {
            if let Some(id) = key.as_int() {
                if id == props.id {
                    if let marshal::types::RubyValue::Object(ref mut obj) = val {
                        for (name, v) in obj.instance_vars.iter_mut() {
                            if name == "@name" {
                                *v = marshal::types::RubyValue::String(
                                    marshal::types::RubyString::with_encoding(
                                        props.name.as_bytes().to_vec(),
                                        "UTF-8".to_string(),
                                    ),
                                );
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    marshal::dump_file(&map_infos_path, &infos_value)
        .map_err(|e| format!("Failed to save MapInfos: {}", e))?;

    eprintln!("[save_map_properties] Saved map {} properties", props.id);
    Ok(())
}

/// Create a new blank map. Returns the new map ID and updated map_infos.
#[tauri::command]
pub async fn create_map(
    project_path: String,
    name: String,
    parent_id: i64,
    width: i64,
    height: i64,
    tileset_id: i64,
) -> Result<(i64, HashMap<i64, MapInfo>), String> {
    let path = PathBuf::from(&project_path);
    let map_infos_path = path.join("Data").join("MapInfos.rxdata");

    // Load current map infos to find next available ID
    let mut infos_value = marshal::load_file(&map_infos_path)
        .map_err(|e| format!("Failed to read MapInfos: {}", e))?;

    let current_infos = load_map_infos(&map_infos_path)?;
    let new_id = current_infos.keys().max().copied().unwrap_or(0) + 1;
    let max_order = current_infos.values().map(|i| i.order).max().unwrap_or(0) + 1;

    // Create blank map .rxdata
    let blank_map = RpgMap::new_blank(width, height, tileset_id);
    let map_file = path.join("Data").join(format!("Map{:03}.rxdata", new_id));
    marshal::dump_file(&map_file, &blank_map.to_ruby_value())
        .map_err(|e| format!("Failed to create map file: {}", e))?;

    // Add to MapInfos
    let new_info = MapInfo {
        name: name.clone(),
        parent_id,
        order: max_order,
        expanded: false,
        scroll_x: 0,
        scroll_y: 0,
    };

    if let marshal::types::RubyValue::Hash(ref mut pairs) = infos_value {
        pairs.push((
            marshal::types::RubyValue::Integer(new_id),
            new_info.to_ruby_value(),
        ));
    }

    marshal::dump_file(&map_infos_path, &infos_value)
        .map_err(|e| format!("Failed to save MapInfos: {}", e))?;

    // Return updated map infos
    let updated_infos = load_map_infos(&map_infos_path)?;

    eprintln!("[create_map] Created Map{:03} '{}' ({}x{}, tileset={})",
        new_id, name, width, height, tileset_id);

    Ok((new_id, updated_infos))
}

/// Delete a map — removes the .rxdata file and its MapInfos entry.
/// Also reparents any children to the deleted map's parent.
#[tauri::command]
pub async fn delete_map(
    project_path: String,
    map_id: i64,
) -> Result<HashMap<i64, MapInfo>, String> {
    let path = PathBuf::from(&project_path);
    let map_infos_path = path.join("Data").join("MapInfos.rxdata");

    // Load current infos to find the parent of the deleted map
    let current_infos = load_map_infos(&map_infos_path)?;
    let parent_of_deleted = current_infos.get(&map_id).map(|i| i.parent_id).unwrap_or(0);

    // Remove map file
    let map_file = path.join("Data").join(format!("Map{:03}.rxdata", map_id));
    if map_file.exists() {
        std::fs::remove_file(&map_file)
            .map_err(|e| format!("Failed to delete map file: {}", e))?;
    }

    // Update MapInfos: remove the entry and reparent children
    let mut infos_value = marshal::load_file(&map_infos_path)
        .map_err(|e| format!("Failed to read MapInfos: {}", e))?;

    if let marshal::types::RubyValue::Hash(ref mut pairs) = infos_value {
        // Remove the entry
        pairs.retain(|(key, _)| key.as_int() != Some(map_id));

        // Reparent children
        for (_, val) in pairs.iter_mut() {
            if let marshal::types::RubyValue::Object(ref mut obj) = val {
                for (name, v) in obj.instance_vars.iter_mut() {
                    if name == "@parent_id" {
                        if let marshal::types::RubyValue::Integer(pid) = v {
                            if *pid == map_id {
                                *pid = parent_of_deleted;
                            }
                        }
                    }
                }
            }
        }
    }

    marshal::dump_file(&map_infos_path, &infos_value)
        .map_err(|e| format!("Failed to save MapInfos: {}", e))?;

    let updated_infos = load_map_infos(&map_infos_path)?;
    eprintln!("[delete_map] Deleted Map{:03}", map_id);
    Ok(updated_infos)
}

/// Rename a map in MapInfos.rxdata.
#[tauri::command]
pub async fn rename_map(
    project_path: String,
    map_id: i64,
    new_name: String,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let map_infos_path = path.join("Data").join("MapInfos.rxdata");

    let mut infos_value = marshal::load_file(&map_infos_path)
        .map_err(|e| format!("Failed to read MapInfos: {}", e))?;

    if let marshal::types::RubyValue::Hash(ref mut pairs) = infos_value {
        for (key, val) in pairs.iter_mut() {
            if key.as_int() == Some(map_id) {
                if let marshal::types::RubyValue::Object(ref mut obj) = val {
                    for (name, v) in obj.instance_vars.iter_mut() {
                        if name == "@name" {
                            *v = marshal::types::RubyValue::String(
                                marshal::types::RubyString::with_encoding(
                                    new_name.as_bytes().to_vec(),
                                    "UTF-8".to_string(),
                                ),
                            );
                        }
                    }
                }
                break;
            }
        }
    }

    marshal::dump_file(&map_infos_path, &infos_value)
        .map_err(|e| format!("Failed to save MapInfos: {}", e))?;

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
