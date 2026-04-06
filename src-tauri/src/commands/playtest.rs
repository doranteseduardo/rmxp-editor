#[tauri::command]
pub async fn launch_game(project_path: String) -> Result<(), String> {
    // Stub — custom player integration TBD
    eprintln!("[playtest] launch_game called for: {project_path}");
    Ok(())
}
