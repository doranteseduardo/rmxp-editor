//! Generic database commands for loading/saving any .rxdata array file.
//!
//! RMXP stores database tables as Ruby Marshal arrays in files like:
//!   Actors.rxdata, Armors.rxdata, Classes.rxdata, CommonEvents.rxdata,
//!   Enemies.rxdata, Items.rxdata, Skills.rxdata, States.rxdata,
//!   Tilesets.rxdata, Troops.rxdata, Weapons.rxdata, Animations.rxdata
//!
//! Rather than creating dedicated Rust structs for each of the 20+ RPG classes,
//! we use a generic approach: load the Marshal data, convert to JSON via
//! RubyValue::to_json_value(), and let the TypeScript frontend handle the typing.
//! On save, we convert back via RubyValue::from_json_value().

use crate::marshal;
use crate::marshal::types::RubyValue;
use crate::models::RpgSystem;
use std::path::PathBuf;

/// Load a database file (.rxdata) as a JSON array.
///
/// The file should be a Ruby Marshal array (e.g., Actors.rxdata).
/// Index 0 is typically nil, actual data starts at index 1.
/// Returns the entire array as serde_json::Value for the frontend.
#[tauri::command]
pub async fn load_database(
    project_path: String,
    filename: String,
) -> Result<serde_json::Value, String> {
    // Validate filename to prevent path traversal
    if filename.contains('/') || filename.contains('\\') || !filename.ends_with(".rxdata") {
        return Err("Invalid database filename".to_string());
    }

    let path = PathBuf::from(&project_path).join("Data").join(&filename);
    if !path.exists() {
        return Err(format!("Database file not found: {}", filename));
    }

    eprintln!("[load_database] Loading {}...", filename);
    let value = marshal::load_file(&path)
        .map_err(|e| format!("Failed to parse {}: {}", filename, e))?;

    let json = value.to_json_value();
    eprintln!("[load_database] Loaded {} → {} top-level entries",
        filename,
        json.as_array().map(|a| a.len()).unwrap_or(0));

    Ok(json)
}

/// Save a database file (.rxdata) from a JSON array.
///
/// Converts the JSON back to RubyValue and writes to the Marshal file.
/// The JSON must have the same structure as what load_database returns.
#[tauri::command]
pub async fn save_database(
    project_path: String,
    filename: String,
    data: serde_json::Value,
) -> Result<(), String> {
    if filename.contains('/') || filename.contains('\\') || !filename.ends_with(".rxdata") {
        return Err("Invalid database filename".to_string());
    }

    let path = PathBuf::from(&project_path).join("Data").join(&filename);

    // For database files that are arrays, we need to be careful about the conversion.
    // We load the original file first and do a smart merge to preserve binary data
    // (Tables, etc.) that can't round-trip through JSON cleanly.
    let original = if path.exists() {
        marshal::load_file(&path).ok()
    } else {
        None
    };

    let ruby_value = if let Some(orig) = original {
        // Smart merge: for each array entry, if the original has a matching entry,
        // merge changed fields while preserving binary UserDefined fields (Table, etc.)
        merge_database_value(&orig, &data)
    } else {
        RubyValue::from_json_value(&data)
    };

    marshal::dump_file(&path, &ruby_value)
        .map_err(|e| format!("Failed to save {}: {}", filename, e))?;

    eprintln!("[save_database] Saved {}", filename);
    Ok(())
}

/// Load the full System.rxdata with proper typed parsing.
#[tauri::command]
pub async fn load_system(
    project_path: String,
) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path).join("Data").join("System.rxdata");
    if !path.exists() {
        return Err("System.rxdata not found".to_string());
    }

    let value = marshal::load_file(&path)
        .map_err(|e| format!("Failed to parse System.rxdata: {}", e))?;

    let system = RpgSystem::from_ruby_value(&value)
        .ok_or_else(|| "Failed to interpret System data".to_string())?;

    serde_json::to_value(&system)
        .map_err(|e| format!("Failed to serialize system: {}", e))
}

/// Save the full System.rxdata from typed data.
#[tauri::command]
pub async fn save_system(
    project_path: String,
    data: serde_json::Value,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join("Data").join("System.rxdata");

    let system: RpgSystem = serde_json::from_value(data)
        .map_err(|e| format!("Failed to deserialize system data: {}", e))?;

    let ruby_value = system.to_ruby_value();

    marshal::dump_file(&path, &ruby_value)
        .map_err(|e| format!("Failed to save System.rxdata: {}", e))?;

    eprintln!("[save_system] Saved System.rxdata");
    Ok(())
}

/// Smart merge of JSON changes into an original RubyValue structure.
/// This preserves binary UserDefined fields (Table, Color, Tone) that
/// can't round-trip perfectly through JSON.
fn merge_database_value(original: &RubyValue, json: &serde_json::Value) -> RubyValue {
    match (original, json) {
        // Array: merge element-by-element
        (RubyValue::Array(orig_arr), serde_json::Value::Array(json_arr)) => {
            let merged: Vec<RubyValue> = json_arr.iter().enumerate().map(|(i, jv)| {
                if let Some(ov) = orig_arr.get(i) {
                    merge_database_value(ov, jv)
                } else {
                    RubyValue::from_json_value(jv)
                }
            }).collect();
            RubyValue::Array(merged)
        }
        // Object: merge instance variable by instance variable
        (RubyValue::Object(orig_obj), serde_json::Value::Object(json_map)) => {
            let mut new_obj = crate::marshal::types::RubyObject::new(orig_obj.class_name.clone());

            for (ivar_name, orig_val) in &orig_obj.instance_vars {
                let field_name = ivar_name.strip_prefix('@').unwrap_or(ivar_name);
                if let Some(json_val) = json_map.get(field_name) {
                    // For UserDefined fields that are Tables, preserve the original binary
                    // unless the JSON explicitly provides replacement data
                    match orig_val {
                        RubyValue::UserDefined { class_name, .. } if class_name == "Table" => {
                            // Tables can't round-trip through JSON, keep original
                            new_obj.instance_vars.push((ivar_name.clone(), orig_val.clone()));
                        }
                        _ => {
                            new_obj.instance_vars.push((
                                ivar_name.clone(),
                                merge_database_value(orig_val, json_val),
                            ));
                        }
                    }
                } else {
                    // Field not in JSON — keep original
                    new_obj.instance_vars.push((ivar_name.clone(), orig_val.clone()));
                }
            }

            // Add any new fields from JSON that weren't in original
            for (key, jv) in json_map {
                if key == "__class" { continue; }
                let ivar = format!("@{}", key);
                if !orig_obj.instance_vars.iter().any(|(n, _)| n == &ivar) {
                    new_obj.instance_vars.push((ivar, RubyValue::from_json_value(jv)));
                }
            }

            RubyValue::Object(new_obj)
        }
        // Nil in original, non-null in JSON — create new
        (RubyValue::Nil, json_val) if !json_val.is_null() => {
            RubyValue::from_json_value(json_val)
        }
        // Default: convert JSON to RubyValue directly
        (_, json_val) => RubyValue::from_json_value(json_val),
    }
}
