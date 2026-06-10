import { useRef, useEffect } from "react";
import type { BaseStats } from "../../../../types/pbsEntityTypes";

export function RadarChart({ stats }: { stats: BaseStats }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 160;
  const CENTER = SIZE / 2;
  const RADIUS = 64;
  const labels = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
  const values = [stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe];
  const MAX = 255;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const angle = (i: number) => (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const point = (i: number, r: number) => ({
      x: CENTER + Math.cos(angle(i)) * r,
      y: CENTER + Math.sin(angle(i)) * r,
    });

    // Draw grid rings
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const p = point(i, (RADIUS * ring) / 5);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#ccd0da";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw spokes
    for (let i = 0; i < 6; i++) {
      const p = point(i, RADIUS);
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "#ccd0da";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw stat polygon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const r = (values[i] / MAX) * RADIUS;
      const p = point(i, r);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(30, 102, 245, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#1e66f5";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#4c4f69";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 6; i++) {
      const p = point(i, RADIUS + 14);
      ctx.fillText(`${labels[i]} ${values[i]}`, p.x, p.y);
    }
  }, [stats]);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: "block" }} />;
}
