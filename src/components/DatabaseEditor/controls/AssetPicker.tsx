/**
 * AssetPicker — dropdown + thumbnail preview for graphic/audio asset fields.
 *
 * Loads the list of available assets from the project folder via listAssetFiles(),
 * shows a dropdown with all options, and previews the selected graphic via
 * the Tauri asset protocol URL.
 */
import { useState, useEffect, useMemo } from "react";
import { listAssetFiles } from "../../../services/tauriApi";

interface Props {
  projectPath: string;
  /** Asset directory type: "Characters", "Battlers", "Icons", "Animations", etc. */
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

  useEffect(() => {
    if (!projectPath || !assetType) return;
    setLoading(true);
    listAssetFiles(projectPath, assetType)
      .then((list) => setFiles(list.sort()))
      .catch((err) => console.warn(`[AssetPicker] Failed to list ${assetType}:`, err))
      .finally(() => setLoading(false));
  }, [projectPath, assetType]);

  // Build Tauri asset protocol URL for preview
  const previewUrl = useMemo(() => {
    if (!value || !showPreview) return null;
    try {
      // Tauri v2 asset protocol: asset://localhost/ + encoded path
      const fullPath = `${projectPath}/Graphics/${assetType}/${value}.png`;
      return `asset://localhost/${encodeURIComponent(fullPath)}`;
    } catch {
      return null;
    }
  }, [projectPath, assetType, value, showPreview]);

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
          background: "#11111b",
          border: "1px solid #45475a",
          borderRadius: 3,
          color: "#cdd6f4",
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
      {loading && <span style={{ fontSize: 10, color: "#6c7086" }}>...</span>}
      {previewUrl && value && (
        <div
          style={{
            width: 40,
            height: 40,
            border: "1px solid #313244",
            borderRadius: 3,
            background: "#11111b",
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
