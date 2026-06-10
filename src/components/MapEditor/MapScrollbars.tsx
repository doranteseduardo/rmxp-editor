import { useCallback, useRef } from "react";
import { TILE_SIZE } from "../../types";

// --- Scrollbar overlay component ---

export function MapScrollbars({
  mapWidth,
  mapHeight,
  viewportX,
  viewportY,
  zoom,
  canvasRef,
  onViewportChange,
}: {
  mapWidth: number;
  mapHeight: number;
  viewportX: number;
  viewportY: number;
  zoom: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onViewportChange: (x: number, y: number) => void;
}) {
  const hDragRef = useRef(false);
  const vDragRef = useRef(false);
  const dragStartRef = useRef({ mouse: 0, viewport: 0 });

  // Calculate visible tiles based on canvas size
  const canvas = canvasRef.current;
  const containerWidth = canvas ? canvas.clientWidth : 800;
  const containerHeight = canvas ? canvas.clientHeight : 600;
  const tilePixels = TILE_SIZE * zoom;
  const visibleTilesX = containerWidth / tilePixels;
  const visibleTilesY = containerHeight / tilePixels;

  // Scrollbar thumb proportions
  const hThumbRatio = Math.min(1, visibleTilesX / mapWidth);
  const vThumbRatio = Math.min(1, visibleTilesY / mapHeight);

  // Thumb positions (0-1 range)
  const hThumbPos = mapWidth > visibleTilesX ? viewportX / (mapWidth - visibleTilesX) : 0;
  const vThumbPos = mapHeight > visibleTilesY ? viewportY / (mapHeight - visibleTilesY) : 0;

  // Clamp positions
  const hPos = Math.max(0, Math.min(1 - hThumbRatio, hThumbPos * (1 - hThumbRatio)));
  const vPos = Math.max(0, Math.min(1 - vThumbRatio, vThumbPos * (1 - vThumbRatio)));

  const SCROLLBAR_SIZE = 10;
  const TRACK_MARGIN = 2;

  // Don't show if the whole map fits
  const showH = hThumbRatio < 1;
  const showV = vThumbRatio < 1;

  const handleHMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      hDragRef.current = true;
      dragStartRef.current = { mouse: e.clientX, viewport: viewportX };

      const onMove = (me: MouseEvent) => {
        if (!hDragRef.current) return;
        const trackElem = (e.target as HTMLElement).parentElement;
        if (!trackElem) return;
        const trackWidth = trackElem.clientWidth - TRACK_MARGIN * 2;
        const thumbWidth = trackWidth * hThumbRatio;
        const availableTrack = trackWidth - thumbWidth;
        if (availableTrack <= 0) return;
        const delta = me.clientX - dragStartRef.current.mouse;
        const posRatio = delta / availableTrack;
        const maxScroll = mapWidth - visibleTilesX;
        const newX = dragStartRef.current.viewport + posRatio * maxScroll;
        onViewportChange(Math.max(0, Math.min(maxScroll, newX)), viewportY);
      };

      const onUp = () => {
        hDragRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [viewportX, viewportY, mapWidth, visibleTilesX, hThumbRatio, onViewportChange]
  );

  const handleVMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      vDragRef.current = true;
      dragStartRef.current = { mouse: e.clientY, viewport: viewportY };

      const onMove = (me: MouseEvent) => {
        if (!vDragRef.current) return;
        const trackElem = (e.target as HTMLElement).parentElement;
        if (!trackElem) return;
        const trackHeight = trackElem.clientHeight - TRACK_MARGIN * 2;
        const thumbHeight = trackHeight * vThumbRatio;
        const availableTrack = trackHeight - thumbHeight;
        if (availableTrack <= 0) return;
        const delta = me.clientY - dragStartRef.current.mouse;
        const posRatio = delta / availableTrack;
        const maxScroll = mapHeight - visibleTilesY;
        const newY = dragStartRef.current.viewport + posRatio * maxScroll;
        onViewportChange(viewportX, Math.max(0, Math.min(maxScroll, newY)));
      };

      const onUp = () => {
        vDragRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [viewportX, viewportY, mapHeight, visibleTilesY, vThumbRatio, onViewportChange]
  );

  return (
    <>
      {/* Horizontal scrollbar */}
      {showH && (
        <div
          className="map-scrollbar map-scrollbar-h"
          style={{
            height: SCROLLBAR_SIZE,
            bottom: showV ? SCROLLBAR_SIZE : 0,
            right: showV ? SCROLLBAR_SIZE : 0,
          }}
        >
          <div
            className="map-scrollbar-thumb"
            style={{
              left: `${hPos * 100}%`,
              width: `${hThumbRatio * 100}%`,
            }}
            onMouseDown={handleHMouseDown}
          />
        </div>
      )}
      {/* Vertical scrollbar */}
      {showV && (
        <div
          className="map-scrollbar map-scrollbar-v"
          style={{
            width: SCROLLBAR_SIZE,
            bottom: showH ? SCROLLBAR_SIZE : 0,
          }}
        >
          <div
            className="map-scrollbar-thumb"
            style={{
              top: `${vPos * 100}%`,
              height: `${vThumbRatio * 100}%`,
            }}
            onMouseDown={handleVMouseDown}
          />
        </div>
      )}
    </>
  );
}
