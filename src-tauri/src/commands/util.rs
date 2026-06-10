//! Shared helpers for command handlers.

use std::path::Path;

/// Reject untrusted asset/file names that could escape their intended directory.
///
/// The webview is the trust boundary: command arguments originate from the
/// frontend and must be treated as untrusted. Asset names in RMXP/Essentials are
/// flat filenames, so a valid name is a single path component — no separators,
/// no `..`, and not absolute. This mirrors the validation already done for PBS
/// and database filenames.
pub fn validate_asset_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Asset name must not be empty".to_string());
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("Invalid asset name: path separators are not allowed".to_string());
    }
    if Path::new(name).is_absolute() {
        return Err("Invalid asset name: absolute paths are not allowed".to_string());
    }
    Ok(())
}

/// Map an asset type string to its `(base_dir, dir, extensions)` triple.
///
/// Returns `None` for unknown asset types. The extension lists and their order
/// are significant: callers probe extensions in this exact order, so the order
/// must be preserved to keep file resolution behavior identical.
pub fn asset_dirs(asset_type: &str) -> Option<(&'static str, &'static str, &'static [&'static str])> {
    let entry: (&'static str, &'static str, &'static [&'static str]) = match asset_type {
        // Graphics
        "tileset" => ("Graphics", "Tilesets", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "autotile" => ("Graphics", "Autotiles", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "character" => ("Graphics", "Characters", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "panorama" => ("Graphics", "Panoramas", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "fog" => ("Graphics", "Fogs", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "battleback" => ("Graphics", "Battlebacks", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "picture" => ("Graphics", "Pictures", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "animation" => ("Graphics", "Animations", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "icon" => ("Graphics", "Icons", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "battler" => ("Graphics", "Battlers", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "windowskin" => ("Graphics", "Windowskins", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "title" => ("Graphics", "Titles", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "gameover" => ("Graphics", "Gameovers", &["png", "jpg", "jpeg", "bmp", "gif"]),
        "transition" => ("Graphics", "Transitions", &["png", "jpg", "jpeg", "bmp", "gif"]),
        // Audio
        "bgm" => ("Audio", "BGM", &["mid", "midi", "ogg", "mp3", "wav", "wma"]),
        "bgs" => ("Audio", "BGS", &["mid", "midi", "ogg", "mp3", "wav", "wma"]),
        "me" => ("Audio", "ME", &["mid", "midi", "ogg", "mp3", "wav", "wma"]),
        "se" => ("Audio", "SE", &["mid", "midi", "ogg", "mp3", "wav", "wma"]),
        _ => return None,
    };
    Some(entry)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plain_names() {
        assert!(validate_asset_name("Hero").is_ok());
        assert!(validate_asset_name("001-Fighter01").is_ok());
        assert!(validate_asset_name("name with spaces").is_ok());
    }

    #[test]
    fn rejects_traversal() {
        assert!(validate_asset_name("../secret").is_err());
        assert!(validate_asset_name("..").is_err());
        assert!(validate_asset_name("a/b").is_err());
        assert!(validate_asset_name("a\\b").is_err());
        assert!(validate_asset_name("/etc/passwd").is_err());
        assert!(validate_asset_name("").is_err());
    }
}
