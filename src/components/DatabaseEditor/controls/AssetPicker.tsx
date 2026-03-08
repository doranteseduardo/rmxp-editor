/**
 * AssetPicker — dropdown + thumbnail preview for graphic/audio asset fields.
 *
 * Loads the list of available assets from the project folder via listAssetFiles(),
 * shows a dropdown with all options, and previews the selected graphic via
 * the Tauri asset protocol URL.
 */
import { useState, useEffect, useMemo } from "react";
import { listAssetFiles } from "../../../services/tauriApi";

/**
 * Maps frontend-friendly asset type names to the backend command strings.
 * Frontend uses directory names (e.g. "Tilesets"), backend uses singular lowercase (e.g. "tileset").
 */
const ASSET_TYPE_MAP: Record<string, string> = {
  // Graphics
  "Tilesets": "tileset",
  "Autotiles": "autotile",
  "Characters": "character",
  "Panoramas": "panorama",
  "Fogs": "fog",
  "Battlebacks": "battleback",
  "Battlers": "battler",
  "Pictures": "picture",
  "Animations": "animation",
  "Icons": "icon",
  "Windowskins": "windowskin",
  "Titles": "title",
  "Gameovers": "gameover",
  "Transitions": "transition",
  // Audio
  "BGM": "bgm",
  "BGS": "bgs",
  "ME": "me",
  "SE": "se",
};

/** Resolve the backend asset type key from a frontend-friendly name */
function resolveAssetType(frontendType: string): string {
  return ASSET_TYPE_MAP[frontendType] ?? frontendType;
}

/** Resolve the Graphics subfolder name from a frontend-friendly asset type */
function resolveGraphicsDir(frontendType: string): string {
  // If it's already a capitalized directory name, use as-is
  if (frontendType.charAt(0) === frontendType.charAt(0).toUpperCase() && frontendType.length > 2) {
    return frontendType;
  }
  // Otherwise look up from the reverse map
  for (const [dir, key] of Object.entries(ASSET_TYPE_MAP)) {
    if (key === frontendType) return dir;
  }
  return frontendType;
}

interface Props {
  projectPath: string;
  /** Asset directory type: "Characters", "Battlers", "Icons", "Animations", or backend key like "tileset" */
  assetType: string;
  value: string;
  onChange: (name: string) => void;
  /** Show a preview thumbnail (only for image assets) */
  showPreview?: boolean;
  /** Allow empty/none selection */
  allowNone?: boolean;
}

export function AssetPicker({ projectPath, assetType, value, onChange, showPreview = true, allowNone = true }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const backendType = resolveAssetType(assetType);
  const graphicsDir = resolveGraphicsDir(assetType);

  useEffect(() => {
    if (!projectPath || !backendType) return;
    setLoading(true);
    listAssetFiles(projectPath, backendType)
      .then((list) => setFiles(list.sort()))
      .catch((err) => console.warn(`[AssetPicker] Failed to list ${backendType}:`, err))
      .finally(() => setLoading(false));
  }, [projectPath, backendType]);

  // Build Tauri asset protocol URL for preview
  const previewUrl = useMemo(() => {
    if (!value || !showPreview) return null;
    // Audio types don't have previews
    if (["bgm", "bgs", "me", "se"].includes(backendType)) return null;
    try {
      // Tauri v2 asset protocol: asset://localhost/ + encoded path
      const fullPath = `${projectPath}/Graphics/${graphicsDir}/${value}.png`;
      return `asset://localhost/${encodeURIComponent(fullPath)}`;
    } catch {
      return null;
    }
  }, [projectPath, graphicsDir, backendType, value, showPreview]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "3px 6px",
          fontSize: 12,
          background: "#dce0e8",
          border: "1px solid #bcc0cc",
          borderRadius: 3,
          color: "#4c4f69",
        }}
      >
        {allowNone && <option value="">(None)</option>}
        {files.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
        {/* If current value isn't in list (e.g. not loaded yet), show it anyway */}
        {value && !files.includes(value) && !loading && (
          <option value={value}>{value} (not found)</option>
        )}
      </select>
      {loading && <span style={{ fontSize: 10, color: "#8c8fa1" }}>...</span>}
      {previewUrl && value && (
        <div
          style={{
            width: 40,
            height: 40,
            border: "1px solid #ccd0da",
            borderRadius: 3,
            background: "#dce0e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <img
            src={previewUrl}
            alt={value}
            style={{ maxWidth: 38, maxHeight: 38, objectFit: "contain", imageRendering: "pixelated" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * AudioAssetPicker — same as AssetPicker but for audio folders (BGM, BGS, ME, SE).
 * No preview thumbnail, just the dropdown.
 */
export function AudioAssetPicker({ projectPath, assetType, value, onChange }: {
  projectPath: string;
  assetType: string;
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <AssetPicker
      projectPath={projectPath}
      assetType={assetType}
      value={value}
      onChange={onChange}
      showPreview={false}
      allowNone={true}
    />
  );
}
