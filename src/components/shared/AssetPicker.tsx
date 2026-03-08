import { useEffect, useState } from "react";
import { listAssetFiles } from "../../services/tauriApi";

interface Props {
  projectPath: string;
  assetType: string;
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
}

/**
 * Dropdown selector for project assets (graphics, audio, etc.).
 * Loads the list of available files from the project directory.
 */
export function AssetPicker({
  projectPath,
  assetType,
  value,
  onChange,
  allowNone = true,
  noneLabel = "(None)",
  className,
}: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAssetFiles(projectPath, assetType)
      .then((names) => {
        if (!cancelled) {
          setFiles(names);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFiles([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [projectPath, assetType]);

  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      {allowNone && <option value="">{noneLabel}</option>}
      {files.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      {/* If the current value isn't in the list (e.g. file was deleted), still show it */}
      {value && !files.includes(value) && (
        <option value={value}>{value} (missing)</option>
      )}
    </select>
  );
}
