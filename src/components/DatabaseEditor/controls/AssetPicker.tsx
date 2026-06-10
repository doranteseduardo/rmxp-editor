/**
 * Database-editor asset pickers — thin wrappers over the shared AssetPicker that
 * supply the database editor's presentation defaults (styled select, image
 * thumbnail for graphics, no inline audio preview button).
 *
 * The actual logic lives in ../../shared/AssetPicker; this file only sets defaults
 * so the database tabs keep their existing look without changing their call sites.
 */
import { AssetPicker as SharedAssetPicker } from "../../shared/AssetPicker";

/** The database editor's select styling. */
const DB_SELECT_STYLE: React.CSSProperties = {
  padding: "3px 6px",
  fontSize: 12,
  background: "#dce0e8",
  border: "1px solid #bcc0cc",
  borderRadius: 3,
  color: "#4c4f69",
};

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
  return (
    <SharedAssetPicker
      projectPath={projectPath}
      assetType={assetType}
      value={value}
      onChange={onChange}
      showPreview={showPreview}
      allowNone={allowNone}
      audioPreview={false}
      selectStyle={DB_SELECT_STYLE}
    />
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
    <SharedAssetPicker
      projectPath={projectPath}
      assetType={assetType}
      value={value}
      onChange={onChange}
      showPreview={false}
      allowNone={true}
      audioPreview={false}
      selectStyle={DB_SELECT_STYLE}
    />
  );
}
