use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PbsSection {
    pub header: String,
    pub fields: Vec<PbsField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PbsField {
    pub key: String,
    pub value: String,
}

fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Invalid PBS filename: path separators not allowed".to_string());
    }
    if !filename.ends_with(".txt") {
        return Err("PBS filename must end with .txt".to_string());
    }
    let stem = &filename[..filename.len() - 4];
    if stem.is_empty() || !stem.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("PBS filename must contain only alphanumeric characters and underscores".to_string());
    }
    Ok(())
}

fn pbs_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join("PBS")
}

/// List all *.txt files present in {project}/PBS/.
#[tauri::command]
pub async fn list_pbs_files(project_path: String) -> Result<Vec<String>, String> {
    let dir = pbs_dir(&project_path);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut files: Vec<String> = std::fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read PBS directory: {e}"))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().into_string().ok()?;
            if name.ends_with(".txt") { Some(name) } else { None }
        })
        .collect();
    files.sort();
    Ok(files)
}

/// Parse a PBS file into sections.
/// - Lines matching `^\[(.+)\]$` → new section header
/// - Lines matching `^(\S[^=]*?)\s*=\s*(.*)$` → key/value field
/// - `#` comment lines and blank lines → skipped
/// - Indented lines in trainers.txt Pokémon sub-entries → key is preserved as-is
#[tauri::command]
pub async fn load_pbs_file(
    project_path: String,
    filename: String,
) -> Result<Vec<PbsSection>, String> {
    validate_filename(&filename)?;
    let path = pbs_dir(&project_path).join(&filename);
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {filename}: {e}"))?;

    let mut sections: Vec<PbsSection> = Vec::new();
    let mut current: Option<PbsSection> = None;

    for line in content.lines() {
        let trimmed = line.trim_end();

        // Skip blank lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Section header: [IDENTIFIER] optionally followed by whitespace / inline comment
        if trimmed.starts_with('[') {
            if let Some(close_pos) = trimmed.find(']') {
                let header = trimmed[1..close_pos].trim().to_string();
                let rest = trimmed[close_pos + 1..].trim();
                if rest.is_empty() || rest.starts_with('#') {
                    if let Some(sec) = current.take() {
                        sections.push(sec);
                    }
                    current = Some(PbsSection { header, fields: Vec::new() });
                    continue;
                }
            }
        }

        // Key = value (may be indented for trainers.txt sub-entries)
        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim().to_string();
            let value = trimmed[eq_pos + 1..].trim().to_string();
            if !key.is_empty() {
                if let Some(sec) = current.as_mut() {
                    sec.fields.push(PbsField { key, value });
                }
            }
        }
    }

    if let Some(sec) = current.take() {
        sections.push(sec);
    }

    Ok(sections)
}

/// Serialize sections back and write atomically.
#[tauri::command]
pub async fn save_pbs_file(
    project_path: String,
    filename: String,
    sections: Vec<PbsSection>,
) -> Result<(), String> {
    validate_filename(&filename)?;
    let dir = pbs_dir(&project_path);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create PBS directory: {e}"))?;

    let path = dir.join(&filename);
    let tmp_path = dir.join(format!("{filename}.tmp"));

    let mut out = String::new();
    for (i, section) in sections.iter().enumerate() {
        if i > 0 {
            out.push('\n');
        }
        out.push('[');
        out.push_str(&section.header);
        out.push_str("]\n");
        for field in &section.fields {
            out.push_str(&field.key);
            out.push_str(" = ");
            out.push_str(&field.value);
            out.push('\n');
        }
    }

    std::fs::write(&tmp_path, &out)
        .map_err(|e| format!("Failed to write {filename}: {e}"))?;
    std::fs::rename(&tmp_path, &path)
        .map_err(|e| format!("Failed to finalize {filename}: {e}"))?;

    eprintln!("[pbs] Saved {filename} ({} sections)", sections.len());
    Ok(())
}

/// Check if an asset file exists at the given absolute path.
#[tauri::command]
pub async fn asset_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

/// Read a PBS file as raw text (for files with non-standard formats like encounters.txt).
#[tauri::command]
pub async fn read_raw_pbs_file(
    project_path: String,
    filename: String,
) -> Result<String, String> {
    validate_filename(&filename)?;
    let path = pbs_dir(&project_path).join(&filename);
    if !path.exists() {
        return Ok(String::new());
    }
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {filename}: {e}"))
}

/// Write raw text to a PBS file (for files with non-standard formats like encounters.txt).
#[tauri::command]
pub async fn write_raw_pbs_file(
    project_path: String,
    filename: String,
    content: String,
) -> Result<(), String> {
    validate_filename(&filename)?;
    let dir = pbs_dir(&project_path);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create PBS directory: {e}"))?;
    let path = dir.join(&filename);
    let tmp_path = dir.join(format!("{filename}.tmp"));
    std::fs::write(&tmp_path, &content)
        .map_err(|e| format!("Failed to write {filename}: {e}"))?;
    std::fs::rename(&tmp_path, &path)
        .map_err(|e| format!("Failed to finalize {filename}: {e}"))?;
    eprintln!("[pbs] Wrote raw {filename} ({} bytes)", content.len());
    Ok(())
}
