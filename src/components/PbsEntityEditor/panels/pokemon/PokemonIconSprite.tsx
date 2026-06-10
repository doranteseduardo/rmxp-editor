import { useRef, useEffect } from "react";
import { buildAssetUrl } from "../../../../services/assetUrl";

export function PokemonIconSprite({ projectPath, id, size = 32 }: { projectPath: string; id: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    const img = new Image();
    img.src = buildAssetUrl(`${projectPath}/Graphics/Pokemon/Icons/${id}.png`);

    const draw = (frame: number) => {
      if (!imgRef.current) return;
      const nat = imgRef.current;
      const frameH = nat.naturalHeight;
      const frameW = frameH; // icons are always square frames
      const numFrames = Math.max(1, Math.round(nat.naturalWidth / frameW));
      const f = frame % numFrames;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(nat, f * frameW, 0, frameW, frameH, 0, 0, size, size);
    };

    img.onload = () => {
      // The effect may have been torn down (deps changed) before this fired —
      // bail so we don't start an interval the stale cleanup won't clear.
      if (cancelled) return;
      imgRef.current = img;
      canvas.style.opacity = "1";
      draw(0);
      // Animate if multi-frame
      const numFrames = Math.max(1, Math.round(img.naturalWidth / img.naturalHeight));
      if (numFrames > 1) {
        timerRef.current = setInterval(() => {
          frameRef.current = (frameRef.current + 1) % numFrames;
          draw(frameRef.current);
        }, 250);
      }
    };
    img.onerror = () => { if (!cancelled) canvas.style.opacity = "0.15"; };

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [projectPath, id, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated", opacity: 0.15, flexShrink: 0 }}
    />
  );
}
