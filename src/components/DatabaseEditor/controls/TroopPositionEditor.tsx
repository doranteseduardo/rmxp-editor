/**
 * TroopPositionEditor — visual drag-and-drop placement of enemies on a battleback.
 *
 * Shows a 640×320 canvas representing the battle screen.
 * Enemy positions are shown as labeled markers that can be dragged.
 */
import { useState, useCallback, useRef, useMemo } from "react";
import type { RpgTroopMember } from "../../../types/rpgTypes";
import type { NameEntry } from "../DatabaseContext";

const CANVAS_W = 480;
const CANVAS_H = 240;
// RMXP battle screen is 640×320, we scale down
const SCALE_X = CANVAS_W / 640;
const SCALE_Y = CANVAS_H / 320;

interface Props {
  members: RpgTroopMember[];
  enemyNames: NameEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMove: (index: number, x: number, y: number) => void;
}

export function TroopPositionEditor({ members, enemyNames, selectedIndex, onSelect, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const nameMap = useMemo(() => {
    const m = new Map<number, string>();
    enemyNames.forEach((e) => m.set(e.id, e.name));
    return m;
  }, [enemyNames]);

  const handleMouseDown = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    onSelect(idx);
    setDragging(idx);
  }, [onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(640, (e.clientX - rect.left) / SCALE_X)));
    const y = Math.round(Math.max(0, Math.min(320, (e.clientY - rect.top) / SCALE_Y)));
    onMove(dragging, x, y);
  }, [dragging, onMove]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        background: "linear-gradient(180deg, #eff1f5 0%, #ccd0da 60%, #bcc0cc 100%)",
        border: "1px solid #bcc0cc",
        borderRadius: 4,
        position: "relative",
        cursor: dragging !== null ? "grabbing" : "default",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Grid lines for reference */}
      <svg width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", pointerEvents: "none" }}>
        {[160, 320, 480].map((x) => (
          <line key={`v${x}`} x1={x * SCALE_X} y1={0} x2={x * SCALE_X} y2={CANVAS_H} stroke="#bcc0cc" strokeWidth={0.5} strokeDasharray="4,4" />
        ))}
        {[160].map((y) => (
          <line key={`h${y}`} x1={0} y1={y * SCALE_Y} x2={CANVAS_W} y2={y * SCALE_Y} stroke="#bcc0cc" strokeWidth={0.5} strokeDasharray="4,4" />
        ))}
      </svg>

      {/* Enemy markers */}
      {members.map((m, i) => {
        const px = m.x * SCALE_X;
        const py = m.y * SCALE_Y;
        const isSelected = i === selectedIndex;
        const name = nameMap.get(m.enemy_id) ?? `Enemy #${m.enemy_id}`;
        return (
          <div
            key={i}
            onMouseDown={(e) => handleMouseDown(i, e)}
            style={{
              position: "absolute",
              left: px - 14,
              top: py - 14,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: isSelected ? "#1e66f5" : (m.hidden ? "#8c8fa1" : "#d20f39"),
              border: `2px solid ${isSelected ? "#209fb5" : "#eff1f5"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              zIndex: isSelected ? 10 : 1,
              boxShadow: isSelected ? "0 0 8px rgba(137,180,250,0.5)" : "0 1px 3px rgba(0,0,0,0.5)",
            }}
            title={`${name} (${m.x}, ${m.y})${m.hidden ? " [Hidden]" : ""}${m.immortal ? " [Immortal]" : ""}`}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: "#eff1f5" }}>{i + 1}</span>
          </div>
        );
      })}

      {/* Label */}
      <div style={{ position: "absolute", bottom: 4, right: 6, fontSize: 9, color: "#8c8fa1" }}>
        640 × 320 battle area
      </div>
    </div>
  );
}
