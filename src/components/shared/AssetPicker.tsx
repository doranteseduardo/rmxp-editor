import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listAssetFiles, previewAudio, stopAudio, isAudioPlaying } from "../../services/tauriApi";
import { graphicAssetUrl } from "../../services/assetUrl";

/**
 * Maps frontend-friendly asset directory names (e.g. "Characters") to the backend
 * command keys (e.g. "character"). Backend keys passed directly (e.g. "bgm") pass
 * through unchanged, so callers may use either convention.
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

const AUDIO_TYPES = new Set(["bgm", "bgs", "me", "se"]);

/** Resolve the backend asset type key from a frontend-friendly name (or pass through). */
function resolveAssetType(frontendType: string): string {
  return ASSET_TYPE_MAP[frontendType] ?? frontendType;
}

/** Resolve the Graphics subfolder name from a frontend-friendly asset type. */
function resolveGraphicsDir(frontendType: string): string {
  // Already a capitalized directory name → use as-is
  if (frontendType.charAt(0) === frontendType.charAt(0).toUpperCase() && frontendType.length > 2) {
    return frontendType;
  }
  // Otherwise reverse-lookup from the map
  for (const [dir, key] of Object.entries(ASSET_TYPE_MAP)) {
    if (key === frontendType) return dir;
  }
  return frontendType;
}

interface Props {
  projectPath: string;
  /** Backend key ("tileset", "bgm") or frontend dir name ("Characters", "BGM"). */
  assetType: string;
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
  /** Show a 40px image thumbnail for graphic assets (ignored for audio). */
  showPreview?: boolean;
  /** Show a native play/stop preview button for audio assets. */
  audioPreview?: boolean;
  /** Extra inline style applied to the <select> (e.g. the database editor's look). */
  selectStyle?: React.CSSProperties;
}

/**
 * Dropdown selector for project assets (graphics, audio, etc.). Loads the list of
 * available files from the project. Optionally shows an image thumbnail for graphic
 * assets, and a native play/stop preview (rodio backend) for audio assets.
 */
export function AssetPicker({
  projectPath,
  assetType,
  value,
  onChange,
  allowNone = true,
  noneLabel = "(None)",
  className,
  showPreview = false,
  audioPreview = true,
  selectStyle,
}: Props) {
  const backendType = resolveAssetType(assetType);
  const graphicsDir = resolveGraphicsDir(assetType);
  const isAudio = AUDIO_TYPES.has(backendType);

  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAssetFiles(projectPath, backendType)
      .then((names) => {
        if (!cancelled) { setFiles(names); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setFiles([]); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [projectPath, backendType]);

  // Stop audio + polling on unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopAudio().catch(() => {});
    };
  }, []);

  // Stop playback when the selected value changes.
  useEffect(() => {
    if (playing) {
      stopAudio().catch(() => {});
      setPlaying(false);
      setError(null);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        if (!(await isAudioPlaying())) {
          setPlaying(false);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch { /* ignore polling errors */ }
    }, 500);
  }, []);

  const handlePlayStop = useCallback(async () => {
    setError(null);
    if (playing) {
      try { await stopAudio(); } catch { /* ignore */ }
      setPlaying(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (!value) return;
    try {
      await previewAudio(projectPath, backendType, value);
      setPlaying(true);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPlaying(false);
    }
  }, [projectPath, backendType, value, playing, startPolling]);

  const previewUrl = useMemo(() => {
    if (!value || !showPreview || isAudio) return null;
    return graphicAssetUrl(projectPath, graphicsDir, value);
  }, [projectPath, graphicsDir, isAudio, value, showPreview]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
      <select
        className={className}
        style={{ flex: 1, minWidth: 0, ...selectStyle }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {allowNone && <option value="">{noneLabel}</option>}
        {files.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
        {/* If the current value isn't in the list (e.g. file deleted), still show it. */}
        {value && !files.includes(value) && !loading && (
          <option value={value}>{value} (missing)</option>
        )}
      </select>

      {isAudio && audioPreview && (
        <button
          type="button"
          onClick={handlePlayStop}
          disabled={!value}
          title={error || (playing ? "Stop preview" : "Preview sound")}
          style={{
            padding: "2px 6px",
            fontSize: 13,
            lineHeight: 1,
            background: error ? "#df8e1d" : playing ? "#d20f39" : "#bcc0cc",
            color: error ? "#eff1f5" : playing ? "#eff1f5" : "#4c4f69",
            border: "1px solid #acb0be",
            borderRadius: 4,
            cursor: value ? "pointer" : "default",
            opacity: value ? 1 : 0.4,
            minWidth: 26,
          }}
        >
          {error ? "!" : playing ? "■" : "▶"}
        </button>
      )}

      {previewUrl && (
        <div
          style={{
            width: 40, height: 40,
            border: "1px solid #ccd0da", borderRadius: 3, background: "#dce0e8",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
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
