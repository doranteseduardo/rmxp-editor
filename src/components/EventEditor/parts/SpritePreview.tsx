import { useEffect, useRef, useState } from "react";
import { loadCharacterImage } from "../../../services/imageLoader";

/** Renders a character sprite preview in a small canvas */
export function SpritePreview({
  projectPath,
  characterName,
  direction,
  tileId,
}: {
  projectPath: string;
  characterName: string;
  direction: number;
  tileId: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!characterName || !canvasRef.current) {
      setError(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const img = await loadCharacterImage(projectPath, characterName);
        if (cancelled || !img || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const displaySize = 46;
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;
        ctx.imageSmoothingEnabled = false;

        const isSingle = img.width <= 32 && img.height <= 32;
        const cols = isSingle ? 1 : 4;
        const rows = isSingle ? 1 : 4;
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        const dirRow: Record<number, number> = { 2: 0, 4: 1, 6: 2, 8: 3 };
        const row = isSingle ? 0 : (dirRow[direction] ?? 0);
        const col = isSingle ? 0 : 1;

        const srcX = col * frameW;
        const srcY = row * frameH;

        const scale = Math.min(
          (displaySize * dpr) / frameW,
          (displaySize * dpr) / frameH
        );
        const destW = frameW * scale;
        const destH = frameH * scale;
        const destX = (displaySize * dpr - destW) / 2;
        const destY = (displaySize * dpr - destH) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, srcX, srcY, frameW, frameH, destX, destY, destW, destH);
        setError(false);
      } catch {
        setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [projectPath, characterName, direction]);

  if (!characterName) {
    if (tileId > 0) {
      return <span>Tile {tileId}</span>;
    }
    return <span>(none)</span>;
  }

  if (error) {
    return (
      <span style={{ fontSize: 8, textAlign: "center", padding: 2 }}>
        {characterName.split("_").pop()}
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
