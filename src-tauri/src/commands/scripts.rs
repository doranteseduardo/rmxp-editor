use crate::marshal;
use crate::marshal::types::{RubyString, RubyValue};
use flate2::read::ZlibDecoder;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::PathBuf;

/// Lightweight script entry for the list (no source).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptEntry {
    pub id: i64,
    pub title: String,
}

/// Full script data for saving.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptData {
    pub id: i64,
    pub title: String,
    pub source: String,
}

// ── Helpers ──────────────────────────────────────────────────────────

fn load_scripts_raw(project_path: &str) -> Result<Vec<RubyValue>, String> {
    let path = PathBuf::from(project_path)
        .join("Data")
        .join("Scripts.rxdata");
    let value = marshal::load_file(&path)
        .map_err(|e| format!("Failed to parse Scripts.rxdata: {}", e))?;
    value
        .as_array()
        .cloned()
        .ok_or_else(|| "Scripts.rxdata is not an array".to_string())
}

fn decompress_zlib(data: &[u8]) -> Result<String, String> {
    if data.is_empty() {
        return Ok(String::new());
    }
    let mut decoder = ZlibDecoder::new(data);
    let mut output = Vec::new();
    decoder
        .read_to_end(&mut output)
        .map_err(|e| format!("Zlib decompression failed: {}", e))?;
    Ok(String::from_utf8_lossy(&output).into_owned())
}

fn compress_zlib(source: &str) -> Result<Vec<u8>, String> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(source.as_bytes())
        .map_err(|e| format!("Zlib compression failed: {}", e))?;
    encoder
        .finish()
        .map_err(|e| format!("Zlib compression finish failed: {}", e))
}

/// Extract (id, title) from a script entry RubyValue (a 3-element array).
fn parse_script_entry(entry: &RubyValue) -> Option<(i64, String, &[u8])> {
    let arr = entry.as_array()?;
    if arr.len() < 3 {
        return None;
    }
    let id = match &arr[0] {
        RubyValue::Integer(n) => *n,
        _ => return None,
    };
    let title = match &arr[1] {
        RubyValue::String(s) => s.to_string_lossy(),
        _ => return None,
    };
    let data = match &arr[2] {
        RubyValue::String(s) => s.bytes.as_slice(),
        _ => return None,
    };
    Some((id, title, data))
}

// ── Commands ─────────────────────────────────────────────────────────

/// Load the script list (id + title only, no decompression).
#[tauri::command]
pub async fn load_script_list(project_path: String) -> Result<Vec<ScriptEntry>, String> {
    let arr = load_scripts_raw(&project_path)?;
    let mut result = Vec::new();

    for entry in &arr {
        if let RubyValue::Nil = entry {
            continue;
        }
        if let Some((id, title, _)) = parse_script_entry(entry) {
            result.push(ScriptEntry { id, title });
        }
    }

    eprintln!("[scripts] Loaded {} script entries", result.len());
    Ok(result)
}

/// Load the decompressed source of a single script by ID.
#[tauri::command]
pub async fn load_script_source(
    project_path: String,
    script_id: i64,
) -> Result<String, String> {
    let arr = load_scripts_raw(&project_path)?;

    for entry in &arr {
        if let RubyValue::Nil = entry {
            continue;
        }
        if let Some((id, _, data)) = parse_script_entry(entry) {
            if id == script_id {
                let source = decompress_zlib(data)?;
                eprintln!(
                    "[scripts] Loaded script {} ({} bytes decompressed)",
                    script_id,
                    source.len()
                );
                return Ok(source);
            }
        }
    }

    Err(format!("Script with id {} not found", script_id))
}

/// Save all scripts back to Scripts.rxdata.
/// Receives the full list with sources — rebuilds the entire file.
#[tauri::command]
pub async fn save_all_scripts(
    project_path: String,
    scripts: Vec<ScriptData>,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path)
        .join("Data")
        .join("Scripts.rxdata");

    // Build the array: first element is nil (RMXP convention)
    let mut arr = Vec::with_capacity(scripts.len() + 1);
    arr.push(RubyValue::Nil);

    for script in &scripts {
        let compressed = compress_zlib(&script.source)?;
        let entry = RubyValue::Array(vec![
            RubyValue::Integer(script.id),
            RubyValue::String(RubyString::new(script.title.as_bytes().to_vec())),
            RubyValue::String(RubyString::new(compressed)),
        ]);
        arr.push(entry);
    }

    let value = RubyValue::Array(arr);
    marshal::dump_file(&path, &value)
        .map_err(|e| format!("Failed to save Scripts.rxdata: {}", e))?;

    eprintln!("[scripts] Saved {} scripts to {:?}", scripts.len(), path);
    Ok(())
}

/// Create a new script, inserting it after the given script ID.
/// Returns the updated script list.
#[tauri::command]
pub async fn create_script(
    project_path: String,
    title: String,
    after_id: i64,
) -> Result<Vec<ScriptEntry>, String> {
    let path = PathBuf::from(&project_path)
        .join("Data")
        .join("Scripts.rxdata");
    let mut arr = load_scripts_raw(&project_path)?;

    // Generate a unique magic number
    let max_id = arr
        .iter()
        .filter_map(|e| parse_script_entry(e).map(|(id, _, _)| id))
        .max()
        .unwrap_or(0);
    let new_id = max_id + 1;

    // Build the new entry (empty source)
    let compressed = compress_zlib("")?;
    let new_entry = RubyValue::Array(vec![
        RubyValue::Integer(new_id),
        RubyValue::String(RubyString::new(title.as_bytes().to_vec())),
        RubyValue::String(RubyString::new(compressed)),
    ]);

    // Find insertion point (after the entry with after_id)
    let mut insert_idx = arr.len(); // default: append at end
    for (i, entry) in arr.iter().enumerate() {
        if let Some((id, _, _)) = parse_script_entry(entry) {
            if id == after_id {
                insert_idx = i + 1;
                break;
            }
        }
    }
    arr.insert(insert_idx, new_entry);

    // Save
    let value = RubyValue::Array(arr.clone());
    marshal::dump_file(&path, &value)
        .map_err(|e| format!("Failed to save Scripts.rxdata: {}", e))?;

    // Return updated list
    let mut result = Vec::new();
    for entry in &arr {
        if let RubyValue::Nil = entry {
            continue;
        }
        if let Some((id, t, _)) = parse_script_entry(entry) {
            result.push(ScriptEntry { id, title: t });
        }
    }

    eprintln!("[scripts] Created script '{}' (id={})", title, new_id);
    Ok(result)
}

/// Delete a script by ID. Returns the updated script list.
#[tauri::command]
pub async fn delete_script(
    project_path: String,
    script_id: i64,
) -> Result<Vec<ScriptEntry>, String> {
    let path = PathBuf::from(&project_path)
        .join("Data")
        .join("Scripts.rxdata");
    let mut arr = load_scripts_raw(&project_path)?;

    // Find and remove the script
    let original_len = arr.len();
    arr.retain(|entry| {
        if let Some((id, _, _)) = parse_script_entry(entry) {
            id != script_id
        } else {
            true // keep nil entries
        }
    });

    if arr.len() == original_len {
        return Err(format!("Script with id {} not found", script_id));
    }

    // Save
    let value = RubyValue::Array(arr.clone());
    marshal::dump_file(&path, &value)
        .map_err(|e| format!("Failed to save Scripts.rxdata: {}", e))?;

    // Return updated list
    let mut result = Vec::new();
    for entry in &arr {
        if let RubyValue::Nil = entry {
            continue;
        }
        if let Some((id, t, _)) = parse_script_entry(entry) {
            result.push(ScriptEntry { id, title: t });
        }
    }

    eprintln!("[scripts] Deleted script id={}", script_id);
    Ok(result)
}
