pub mod commands;
pub mod marshal;
pub mod models;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_project,
            load_map,
            load_tileset,
            get_asset_path,
            list_asset_files,
            load_event,
            save_event,
            create_event,
            delete_event,
            save_map,
            get_map_properties,
            save_map_properties,
            create_map,
            delete_map,
            rename_map,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
