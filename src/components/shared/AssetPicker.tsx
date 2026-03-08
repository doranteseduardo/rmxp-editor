import { useCallback, useEffect, useRef, useState } from "react";
import { listAssetFiles, getAssetPath } from "../../services/tauriApi";

const AUDIO_TYPES = new Set(["bgm", "bgs", "me", "se"]);

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
 * Convert a filesystem path to a Tauri asset-protocol URL.
 * Uses convertFileSrc when available, falls back to manual encoding.
 */
let _convertFileSrc: ((path: string) => string) | null = null;
let _convertResolving: Promise<((path: string) => string) | null> | null = null;

async function toAssetUrl(filePath: string): Promise<string> {
  if (!_convertResolving) {
    _convertResolving = (async () => {
      try {
        const mod = await import("@tauri-apps/api/core");
        _convertFileSrc = mod.convertFileSrc;
        return _convertFileSrc;
      } catch {
        return null;
      }
    })();
  }
  const convert = await _convertResolving;
  if (convert) return convert(filePath);
  // Fallback: Tauri v2 asset protocol
  const encoded = filePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://asset.localhost/${encoded}`;
}

/**
 * Dropdown selector for project assets (graphics, audio, etc.).
 * Loads the list of available files from the project directory.
 * For audio types (bgm, bgs, me, se) shows a play/stop preview button.
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
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAudio = AUDIO_TYPES.has(assetType);

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

  // Cleanup audio on unmount or when value changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop playback when selected value changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    }
  }, [value]);

  const handlePlayStop = useCallback(async () => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    if (!value) return;

    try {
      const filePath = await getAssetPath(projectPath, assetType, value);
      const url = await toAssetUrl(filePath);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        audioRef.current = null;
        setPlaying(false);
      });
      audio.addEventListener("error", () => {
        console.warn(`[AssetPicker] Failed to play audio: ${value}`);
        audioRef.current = null;
        setPlaying(false);
      });

      await audio.play();
      setPlaying(true);
    } catch (err) {
      console.warn(`[AssetPicker] Error playing audio:`, err);
      setPlaying(false);
    }
  }, [projectPath, assetType, value]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
      <select
        className={className}
        style={{ flex: 1 }}
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
      {isAudio && (
        <button
          type="button"
          onClick={handlePlayStop}
          disabled={!value}
          title={playing ? "Stop preview" : "Preview sound"}
          style={{
            padding: "2px 6px",
            fontSize: 13,
            lineHeight: 1,
            background: playing ? "#f38ba8" : "#45475a",
            color: playing ? "#1e1e2e" : "#cdd6f4",
            border: "1px solid #585b70",
            borderRadius: 4,
            cursor: value ? "pointer" : "default",
            opacity: value ? 1 : 0.4,
            minWidth: 26,
          }}
        >
          {playing ? "\u25A0" : "\u25B6"}
        </button>
      )}
    </div>
  );
}
