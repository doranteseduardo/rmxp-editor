import { useRef, useEffect } from "react";
import type { PokemonEntry } from "../../../../types/pbsEntityTypes";
import { buildAssetUrl } from "../../../../services/assetUrl";

export type Metrics = NonNullable<PokemonEntry["metrics"]>;

export const DEFAULT_METRICS: Metrics = { frontSpriteOffset: [0, 0], backSpriteOffset: [0, 0], shadowX: 0, shadowSize: 2 };

export function MetricsVisualEditor({
  pokemonId,
  projectPath,
  metrics,
  onChange,
}: {
  pokemonId: string;
  projectPath: string;
  metrics: Metrics;
  onChange: (m: Metrics) => void;
}) {
  const CANVAS_W = 220;
  const CANVAS_H = 180;
  const SHADOW_SIZES = ["XS", "S", "M", "L", "XL"];

  // Two canvases: front and back
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);

  // Load sprites into Image objects
  const frontImg = useRef<HTMLImageElement | null>(null);
  const backImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    const loadSprite = (src: string, ref: React.MutableRefObject<HTMLImageElement | null>, redraw: () => void) => {
      const img = new Image();
      imgs.push(img);
      img.onload = () => { if (!cancelled) { ref.current = img; redraw(); } };
      img.onerror = () => { if (!cancelled) { ref.current = null; redraw(); } };
      img.src = src;
    };
    loadSprite(buildAssetUrl(`${projectPath}/Graphics/Pokemon/Front/${pokemonId}.png`), frontImg, () => drawCanvas("front"));
    loadSprite(buildAssetUrl(`${projectPath}/Graphics/Pokemon/Back/${pokemonId}.png`), backImg, () => drawCanvas("back"));
    return () => { cancelled = true; imgs.forEach((i) => { i.onload = null; i.onerror = null; }); };
  }, [pokemonId, projectPath]);

  const drawCanvas = (side: "front" | "back") => {
    const canvas = side === "front" ? frontRef.current : backRef.current;
    const img = side === "front" ? frontImg.current : backImg.current;
    const offset = side === "front" ? metrics.frontSpriteOffset : metrics.backSpriteOffset;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background grid
    ctx.fillStyle = "#dce0e8";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = "#bcc0cc";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < CANVAS_W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
    for (let y = 0; y < CANVAS_H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }

    // Baseline: horizontal center guide
    const baseX = CANVAS_W / 2;
    const baseY = CANVAS_H - 20;
    ctx.strokeStyle = "#8c8fa1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(CANVAS_W, baseY); ctx.stroke();
    ctx.setLineDash([]);

    // Shadow ellipse
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    const shadowW = [8, 14, 20, 28, 36][metrics.shadowSize ?? 2] ?? 20;
    ctx.ellipse(baseX + (metrics.shadowX ?? 0), baseY + 4, shadowW, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sprite
    if (img) {
      const sx = baseX - img.width / 2 + offset[0];
      const sy = baseY - img.height + offset[1];
      ctx.drawImage(img, sx, sy);
    } else {
      ctx.fillStyle = "#bcc0cc";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("no sprite", baseX, baseY - 30);
    }

    // Cross-hair at base point
    ctx.strokeStyle = "#d20f39";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(baseX - 6, baseY); ctx.lineTo(baseX + 6, baseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(baseX, baseY - 6); ctx.lineTo(baseX, baseY + 6); ctx.stroke();
  };

  // Redraw whenever metrics change
  useEffect(() => { drawCanvas("front"); }, [metrics, pokemonId]);
  useEffect(() => { drawCanvas("back"); }, [metrics, pokemonId]);

  // Drag state
  const dragging = useRef<{ side: "front" | "back"; startX: number; startY: number; origOffset: [number, number] } | null>(null);

  const handleMouseDown = (side: "front" | "back") => (e: React.MouseEvent<HTMLCanvasElement>) => {
    const orig = side === "front" ? metrics.frontSpriteOffset : metrics.backSpriteOffset;
    dragging.current = { side, startX: e.clientX, startY: e.clientY, origOffset: [...orig] as [number, number] };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { side, startX, startY, origOffset } = dragging.current;
      const dx = Math.round(e.clientX - startX);
      const dy = Math.round(e.clientY - startY);
      const newOffset: [number, number] = [origOffset[0] + dx, origOffset[1] + dy];
      onChange({ ...metrics, [side === "front" ? "frontSpriteOffset" : "backSpriteOffset"]: newOffset });
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [metrics, onChange]);

  const inp: React.CSSProperties = {
    width: 60, padding: "2px 4px", fontSize: 11,
    border: "1px solid var(--color-surface1)", borderRadius: 3,
    background: "var(--color-crust)", color: "var(--color-text)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ color: "var(--color-subtext0)", fontSize: 11 }}>
        Drag sprites to adjust display offset. The red crosshair marks the base point.
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {(["front", "back"] as const).map((side) => {
          const offset = side === "front" ? metrics.frontSpriteOffset : metrics.backSpriteOffset;
          const key = side === "front" ? "frontSpriteOffset" : "backSpriteOffset";
          return (
            <div key={side} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-subtext0)", textTransform: "capitalize" }}>{side} Sprite</div>
              <canvas
                ref={side === "front" ? frontRef : backRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ border: "1px solid var(--color-surface1)", borderRadius: 4, cursor: "grab", display: "block" }}
                onMouseDown={handleMouseDown(side)}
              />
              <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}>
                <span style={{ color: "var(--color-subtext0)", minWidth: 14 }}>X</span>
                <input type="number" value={offset[0]} style={inp}
                  onChange={(e) => onChange({ ...metrics, [key]: [parseInt(e.target.value, 10) || 0, offset[1]] as [number,number] })} />
                <span style={{ color: "var(--color-subtext0)", minWidth: 14 }}>Y</span>
                <input type="number" value={offset[1]} style={inp}
                  onChange={(e) => onChange({ ...metrics, [key]: [offset[0], parseInt(e.target.value, 10) || 0] as [number,number] })} />
                <button style={{ fontSize: 10, padding: "1px 6px", background: "var(--color-surface0)", border: "1px solid var(--color-surface1)", borderRadius: 3, cursor: "pointer", color: "var(--color-text)" }}
                  onClick={() => onChange({ ...metrics, [key]: [0, 0] as [number,number] })}>Reset</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-subtext0)" }}>Shadow X</label>
          <input type="number" value={metrics.shadowX ?? 0} style={inp}
            onChange={(e) => onChange({ ...metrics, shadowX: parseInt(e.target.value, 10) || 0 })} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-subtext0)" }}>Shadow Size</label>
          <select value={metrics.shadowSize ?? 2} style={{ ...inp, width: 80 }}
            onChange={(e) => onChange({ ...metrics, shadowSize: parseInt(e.target.value, 10) })}>
            {SHADOW_SIZES.map((s, i) => <option key={i} value={i}>{i} — {s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
