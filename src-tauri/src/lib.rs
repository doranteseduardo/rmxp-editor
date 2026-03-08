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
            load_event,
            save_map,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
