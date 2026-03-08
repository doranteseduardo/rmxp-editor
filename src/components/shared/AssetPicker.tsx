import { useCallback, useEffect, useRef, useState } from "react";
import { listAssetFiles, previewAudio, stopAudio, isAudioPlaying } from "../../services/tauriApi";

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
 * Dropdown selector for project assets (graphics, audio, etc.).
 * Loads the list of available files from the project directory.
 * For audio types (bgm, bgs, me, se) shows a play/stop preview button
 * that uses the native audio backend (rodio).
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
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Cleanup: stop audio and polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      // Fire-and-forget stop on unmount
      stopAudio().catch(() => {});
    };
  }, []);

  // Stop playback when selected value changes
  useEffect(() => {
    if (playing) {
      stopAudio().catch(() => {});
      setPlaying(false);
      setError(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Poll to detect when playback finishes naturally
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const stillPlaying = await isAudioPlaying();
        if (!stillPlaying) {
          setPlaying(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 500);
  }, []);

  const handlePlayStop = useCallback(async () => {
    setError(null);

    if (playing) {
      try {
        await stopAudio();
      } catch { /* ignore */ }
      setPlaying(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (!value) return;

    try {
      await previewAudio(projectPath, assetType, value);
      setPlaying(true);
      startPolling();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPlaying(false);
    }
  }, [projectPath, assetType, value, playing, startPolling]);

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
          {error ? "!" : playing ? "\u25A0" : "\u25B6"}
        </button>
      )}
    </div>
  );
}
