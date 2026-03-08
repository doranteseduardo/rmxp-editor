/**
 * AnimationFrameEditor — visual timeline + cell property editor for animation frames.
 *
 * Each frame has cell_max cells, each with 8 properties stored in cell_data Table:
 *   0: pattern (sprite index), 1: x, 2: y, 3: zoom%, 4: rotation°,
 *   5: mirror (0/1), 6: opacity, 7: blend_type
 *
 * Provides:
 * - Timeline bar showing frame thumbnails
 * - Selected frame's cell list
 * - Cell property editor
 */
import { useState } from "react";
import type { RpgAnimationFrame } from "../../../types/rpgTypes";

const CELL_PROPS = [
  { idx: 0, label: "Pattern", desc: "Sprite index" },
  { idx: 1, label: "X", desc: "X offset" },
  { idx: 2, label: "Y", desc: "Y offset" },
  { idx: 3, label: "Zoom %", desc: "Scale percentage" },
  { idx: 4, label: "Rotation", desc: "Degrees" },
  { idx: 5, label: "Mirror", desc: "0=normal, 1=flipped" },
  { idx: 6, label: "Opacity", desc: "0-255" },
  { idx: 7, label: "Blend", desc: "0=normal, 1=add, 2=sub" },
];

interface Props {
  frames: RpgAnimationFrame[];
  onChange: (frames: RpgAnimationFrame[]) => void;
}

export function AnimationFrameEditor({ frames, onChange }: Props) {
  const [selFrame, setSelFrame] = useState(0);
  const [selCell, setSelCell] = useState(0);

  const frame = frames[selFrame] ?? null;

  // Extract cell data from the frame's cell_data (which may be a raw array or Table metadata)
  // In our JSON representation, cell_data is an object with __class: "Table"
  // The actual data isn't available through JSON (binary only), so we show what we can
  const cellDataAvailable = frame && Array.isArray((frame.cell_data as unknown as { data?: number[] })?.data);

  return (
    <div>
      {/* Frame timeline */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8, flexWrap: "wrap" }}>
        {frames.map((_, i) => (
          <button
            key={i}
            onClick={() => { setSelFrame(i); setSelCell(0); }}
            style={{
              width: 28,
              height: 22,
              fontSize: 9,
              background: selFrame === i ? "#89b4fa" : "#313244",
              color: selFrame === i ? "#1e1e2e" : "#a6adc8",
              border: "1px solid " + (selFrame === i ? "#89b4fa" : "#45475a"),
              borderRadius: 2,
              cursor: "pointer",
              fontWeight: selFrame === i ? 600 : 400,
            }}
          >
            {i + 1}
          </button>
        ))}
        {frames.length === 0 && (
          <span style={{ fontSize: 11, color: "#6c7086" }}>No frames</span>
        )}
      </div>

      {frame && (
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
              A visual cell editor for drag-and-drop positioning is planned.
            </div>
          )}
        </>
      )}

      {/* Frame management */}
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
    </div>
  );
}
