#[tauri::command]
pub async fn launch_game(project_path: String) -> Result<(), String> {
    // Stub — custom player integration TBD.
    //
    // SECURITY: when this is implemented, spawn the game process with explicit
    // arguments via std::process::Command (never a shell string), and validate
    // `project_path` (canonicalize + confirm it is an actual project directory)
    // before launching. Do not interpolate frontend-supplied strings into a shell.
    eprintln!("[playtest] launch_game called for: {project_path}");
    Ok(())
}
