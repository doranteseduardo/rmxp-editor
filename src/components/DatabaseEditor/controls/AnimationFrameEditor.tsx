/**
 * AnimationFrameEditor — visual timeline + cell property editor for animation frames.
 *
 * Each frame has cell_max cells, each with 8 properties stored in cell_data Table:
 *   0: pattern (sprite index), 1: x, 2: y, 3: zoom%, 4: rotation°,
 *   5: mirror (0/1), 6: opacity, 7: blend_type
 *
 * Provides:
 * - Timeline bar showing frame thumbnails (derived from frameMax or frames array)
 * - Play/Pause playback cycling through frames
 * - Timing markers showing when SEs fire
 * - Selected frame's cell list
 * - Cell property editor
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { RpgAnimationFrame, RpgAnimationTiming } from "../../../types/rpgTypes";

interface Props {
  frames: RpgAnimationFrame[];
  /** Total frame count from the animation's frame_max field */
  frameMax?: number;
  /** Optional timing data to show SE markers on the timeline */
  timings?: RpgAnimationTiming[];
  onChange: (frames: RpgAnimationFrame[]) => void;
}

export function AnimationFrameEditor({ frames, frameMax = 0, timings, onChange }: Props) {
  const [selFrame, setSelFrame] = useState(0);
  const [selCell, setSelCell] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive actual frame count: prefer frames array length, fall back to frameMax
  const totalFrames = Math.max(frames.length, frameMax, 0);

  const frame = frames[selFrame] ?? null;

  // Build a set of frames that have timing events for marker display
  const timingFrameSet = useMemo(() => {
    const set = new Set<number>();
    if (timings) {
      for (const t of timings) {
        set.add(t.frame);
      }
    }
    return set;
  }, [timings]);

  // Build tooltip text for timing frames
  const timingTooltip = useCallback((frameIdx: number) => {
    if (!timings) return undefined;
    const entries = timings.filter(t => t.frame === frameIdx);
    if (entries.length === 0) return undefined;
    return entries.map(t => `SE: ${t.se?.name || "(none)"}`).join(", ");
  }, [timings]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && totalFrames > 0) {
      intervalRef.current = setInterval(() => {
        setSelFrame(prev => (prev + 1) % totalFrames);
        setSelCell(0);
      }, 67); // ~15fps, matching RMXP animation speed
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, totalFrames]);

  // Stop playback on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (totalFrames === 0) return;
    setIsPlaying(prev => !prev);
  };

  // Cell data availability
  const cellDataAvailable = frame && Array.isArray((frame.cell_data as unknown as { data?: number[] })?.data);

  return (
    <div>
      {/* Playback controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <button
          onClick={togglePlay}
          disabled={totalFrames === 0}
          style={{
            padding: "3px 12px",
            fontSize: 11,
            fontWeight: 600,
            background: isPlaying ? "#f38ba8" : "#a6e3a1",
            color: "#1e1e2e",
            border: "none",
            borderRadius: 3,
            cursor: totalFrames > 0 ? "pointer" : "not-allowed",
          }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <span style={{ fontSize: 10, color: "#a6adc8" }}>
          {isPlaying ? `Playing ${selFrame + 1} / ${totalFrames}` : `${totalFrames} frame(s)`}
        </span>
      </div>

      {/* Frame timeline */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8, flexWrap: "wrap" }}>
        {Array.from({ length: totalFrames }, (_, i) => {
          const isSelected = selFrame === i;
          const isPlayHead = isPlaying && isSelected;
          const hasTiming = timingFrameSet.has(i);
          return (
            <button
              key={i}
              onClick={() => { if (!isPlaying) { setSelFrame(i); setSelCell(0); } }}
              title={timingTooltip(i)}
              style={{
                width: 28,
                height: 22,
                fontSize: 9,
                position: "relative",
                background: isPlayHead ? "#f38ba8" : isSelected ? "#89b4fa" : "#313244",
                color: isSelected || isPlayHead ? "#1e1e2e" : "#a6adc8",
                border: "1px solid " + (isPlayHead ? "#f38ba8" : isSelected ? "#89b4fa" : "#45475a"),
                borderRadius: 2,
                cursor: isPlaying ? "default" : "pointer",
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              {i + 1}
              {hasTiming && (
                <span style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#f9e2af",
                  border: "1px solid #1e1e2e",
                }} />
              )}
            </button>
          );
        })}
        {totalFrames === 0 && (
          <span style={{ fontSize: 11, color: "#6c7086" }}>No frames (frame_max = 0)</span>
        )}
      </div>

      {frame && !isPlaying && (
        <>
          <div style={{ fontSize: 11, color: "#a6adc8", marginBottom: 4 }}>
            Frame {selFrame + 1} — {frame.cell_max} cell(s)
          </div>

          {/* Cell list */}
          <div className="db-sublist" style={{ maxHeight: 120 }}>
            {Array.from({ length: frame.cell_max }, (_, i) => (
              <div
                key={i}
                className={`db-sublist-item${selCell === i ? " selected" : ""}`}
                onClick={() => setSelCell(i)}
              >
                Cell {i + 1}
              </div>
            ))}
          </div>

          {!cellDataAvailable && (
            <div style={{ fontSize: 10, color: "#6c7086", marginTop: 6 }}>
              Cell data is stored in binary Table format and is preserved on save.
            </div>
          )}
        </>
      )}

      {/* Show frame index info when frames array is empty but frameMax > 0 */}
      {!frame && totalFrames > 0 && !isPlaying && (
        <div style={{ fontSize: 10, color: "#6c7086", marginTop: 4 }}>
          Frame {selFrame + 1} — data stored in binary format, preserved on save.
        </div>
      )}

      {/* Frame management */}
      {!isPlaying && (
        <div className="db-sublist-toolbar" style={{ marginTop: 6 }}>
          <button onClick={() => {
            const newFrame: RpgAnimationFrame = {
              __class: "RPG::Animation::Frame",
              cell_max: 1,
              cell_data: { __class: "Table", dims: 2, x_size: 1, y_size: 8, z_size: 1 },
            };
            onChange([...frames, newFrame]);
          }}>+ Frame</button>
          <button
            disabled={frames.length === 0}
            onClick={() => {
              if (selFrame < frames.length) {
                onChange(frames.filter((_, i) => i !== selFrame));
                setSelFrame(Math.max(0, selFrame - 1));
              }
            }}
          >- Frame</button>
          <button
            disabled={!frame}
            onClick={() => {
              if (!frame) return;
              const copy = [...frames];
              copy[selFrame] = { ...frame, cell_max: frame.cell_max + 1 };
              onChange(copy);
            }}
          >+ Cell</button>
          <button
            disabled={!frame || frame.cell_max <= 1}
            onClick={() => {
              if (!frame || frame.cell_max <= 1) return;
              const copy = [...frames];
              copy[selFrame] = { ...frame, cell_max: frame.cell_max - 1 };
              onChange(copy);
              if (selCell >= frame.cell_max - 1) setSelCell(frame.cell_max - 2);
            }}
          >- Cell</button>
        </div>
      )}
    </div>
  );
}
