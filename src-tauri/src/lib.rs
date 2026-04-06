pub mod commands;
pub mod marshal;
pub mod models;

use commands::*;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(AudioHandle::new()))
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
            list_tileset_names,
            preview_audio,
            stop_audio,
            is_audio_playing,
            load_script_list,
            load_script_source,
            save_all_scripts,
            create_script,
            delete_script,
            load_database,
            save_database,
            load_system,
            save_system,
            launch_game,
            list_pbs_files,
            load_pbs_file,
            save_pbs_file,
            asset_exists,
            read_raw_pbs_file,
            write_raw_pbs_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
