import { useCallback, useEffect, useRef, useState } from "react";
import type { MapRenderData, TilesetRenderInfo, PaintTool } from "../../types";
import { MapRenderer, type EventMarker } from "../../services/mapRenderer";
import { TILE_SIZE } from "../../types";
import {
  paintTile,
  paintRectangle,
  floodFill,
  eraseTile,
  UndoStack,
  applyAction,
  revertAction,
  type MapAction,
} from "../../services/mapEditor";
import "./MapEditor.css";

interface Props {
  mapData: MapRenderData | null;
  tilesetInfo: TilesetRenderInfo | null;
  tilesetImage: HTMLImageElement | null;
  autotileImages: (HTMLImageElement | null)[];
  projectPath?: string;
  selectedTileId: number;
  onMapDirty: () => void;
  onOpenEvent?: (eventId: number, eventName: string) => void;
}

export function MapEditor({
  mapData,
  tilesetInfo,
  tilesetImage,
  autotileImages,
  projectPath: _projectPath,
  selectedTileId,
  onMapDirty,
  onOpenEvent,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const undoStackRef = useRef(new UndoStack());

  // Viewport state
  const [viewportX, setViewportX] = useState(0);
  const [viewportY, setViewportY] = useState(0);
  const [zoom, setZoom] = useState(1.0);

  // Editor state
  const [showGrid, setShowGrid] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showLayers, _setShowLayers] = useState<[boolean, boolean, boolean]>([
    true,
    true,
    true,
  ]);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [paintTool, setPaintTool] = useState<PaintTool>("pencil");
  const [cursorTile, setCursorTile] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Painting state
  const isPainting = useRef(false);
  const paintChanges = useRef<MapAction["changes"]>([]);
  const rectStart = useRef<{ x: number; y: number } | null>(null);

  // Panning state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panViewport = useRef({ x: 0, y: 0 });

  // Force re-render trigger
  const [renderTick, setRenderTick] = useState(0);

  // Initialize renderer — canvas is ALWAYS in the DOM now
  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new MapRenderer(canvasRef.current);
  }, []);

  // Update renderer with map data
  useEffect(() => {
    if (!rendererRef.current || !mapData) return;
    rendererRef.current.setMapData(
      mapData.tiles,
      mapData.width,
      mapData.height
    );
    setViewportX(0);
    setViewportY(0);
    undoStackRef.current.clear();
  }, [mapData]);

  // Update renderer with tileset image
  useEffect(() => {
    if (!rendererRef.current) return;
    if (tilesetImage) {
      rendererRef.current.setTilesetImage(tilesetImage);
    }
  }, [tilesetImage]);

  // Update renderer with autotile images
  useEffect(() => {
    if (!rendererRef.current) return;
    autotileImages.forEach((img, i) => {
      rendererRef.current!.setAutotileImage(i, img);
    });
  }, [autotileImages]);

  // Update renderer with tileset priorities
  useEffect(() => {
    if (!rendererRef.current || !tilesetInfo) return;
    rendererRef.current.setPriorities(tilesetInfo.priorities);
  }, [tilesetInfo]);

  // Animation loop — only runs when we have map data
  useEffect(() => {
    if (!rendererRef.current || !mapData) return;

    const events: EventMarker[] = mapData.events.map((e) => ({
      id: e.id,
      name: e.name,
      x: e.x,
      y: e.y,
    }));

    const animate = (time: number) => {
      rendererRef.current?.render(
        time,
        {
          showGrid,
          showEvents,
          showLayer: showLayers,
          zoom,
          viewportX,
          viewportY,
        },
        events
      );
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    mapData,
    showGrid,
    showEvents,
    showLayers,
    zoom,
    viewportX,
    viewportY,
    renderTick,
  ]);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width * window.devicePixelRatio;
          canvas.height = height * window.devicePixelRatio;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
      }
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts (undo/redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mapData) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const action = undoStackRef.current.undo();
        if (action) {
          revertAction(mapData, action);
          rendererRef.current?.setMapData(
            mapData.tiles,
            mapData.width,
            mapData.height
          );
          setRenderTick((t) => t + 1);
        }
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        ((e.key === "z" && e.shiftKey) || e.key === "y")
      ) {
        e.preventDefault();
        const action = undoStackRef.current.redo();
        if (action) {
          applyAction(mapData, action);
          rendererRef.current?.setMapData(
            mapData.tiles,
            mapData.width,
            mapData.height
          );
          setRenderTick((t) => t + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mapData]);

  // Convert screen position to tile coordinates
  const screenToTile = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !rendererRef.current) return null;

      const rect = canvas.getBoundingClientRect();
      return rendererRef.current.screenToTile(
        clientX - rect.left,
        clientY - rect.top,
        viewportX,
        viewportY,
        zoom
      );
    },
    [viewportX, viewportY, zoom]
  );

  // Apply a paint operation at a position
  const doPaint = useCallback(
    (x: number, y: number) => {
      if (!mapData) return;

      if (paintTool === "pencil") {
        const change = paintTile(mapData, x, y, selectedLayer, selectedTileId);
        if (change) {
          paintChanges.current.push(change);
          rendererRef.current?.setMapData(
            mapData.tiles,
            mapData.width,
            mapData.height
          );
          setRenderTick((t) => t + 1);
        }
      } else if (paintTool === "eraser") {
        const change = eraseTile(mapData, x, y, selectedLayer);
        if (change) {
          paintChanges.current.push(change);
          rendererRef.current?.setMapData(
            mapData.tiles,
            mapData.width,
            mapData.height
          );
          setRenderTick((t) => t + 1);
        }
      }
    },
    [mapData, paintTool, selectedLayer, selectedTileId]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.25, Math.min(4, z * factor)));
  }, []);

  // Mouse down: start painting or panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panViewport.current = { x: viewportX, y: viewportY };
        return;
      }

      if (e.button === 0 && mapData) {
        const pos = screenToTile(e.clientX, e.clientY);
        if (!pos) return;

        if (paintTool === "bucket") {
          const changes = floodFill(
            mapData,
            pos.x,
            pos.y,
            selectedLayer,
            selectedTileId
          );
          if (changes.length > 0) {
            undoStackRef.current.push({
              type: "fill",
              changes,
              timestamp: Date.now(),
            });
            rendererRef.current?.setMapData(
              mapData.tiles,
              mapData.width,
              mapData.height
            );
            setRenderTick((t) => t + 1);
            onMapDirty();
          }
          return;
        }

        if (paintTool === "rectangle") {
          rectStart.current = pos;
          isPainting.current = true;
          return;
        }

        isPainting.current = true;
        paintChanges.current = [];
        doPaint(pos.x, pos.y);
      }
    },
    [
      mapData,
      viewportX,
      viewportY,
      paintTool,
      selectedLayer,
      selectedTileId,
      screenToTile,
      doPaint,
      onMapDirty,
    ]
  );

  // Mouse move: continue painting or panning
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        const dx = (e.clientX - panStart.current.x) / (TILE_SIZE * zoom);
        const dy = (e.clientY - panStart.current.y) / (TILE_SIZE * zoom);
        setViewportX(panViewport.current.x - dx);
        setViewportY(panViewport.current.y - dy);
        return;
      }

      const pos = screenToTile(e.clientX, e.clientY);
      if (pos && mapData) {
        if (
          pos.x >= 0 &&
          pos.x < mapData.width &&
          pos.y >= 0 &&
          pos.y < mapData.height
        ) {
          setCursorTile(pos);
        } else {
          setCursorTile(null);
        }

        if (
          isPainting.current &&
          (paintTool === "pencil" || paintTool === "eraser")
        ) {
          doPaint(pos.x, pos.y);
        }
      }
    },
    [mapData, zoom, screenToTile, paintTool, doPaint]
  );

  // Mouse up: finish painting
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        isPanning.current = false;
        return;
      }

      if (e.button === 0 && isPainting.current && mapData) {
        isPainting.current = false;

        if (paintTool === "rectangle" && rectStart.current) {
          const pos = screenToTile(e.clientX, e.clientY);
          if (pos) {
            const changes = paintRectangle(
              mapData,
              rectStart.current.x,
              rectStart.current.y,
              pos.x,
              pos.y,
              selectedLayer,
              selectedTileId
            );
            if (changes.length > 0) {
              undoStackRef.current.push({
                type: "rectangle",
                changes,
                timestamp: Date.now(),
              });
              rendererRef.current?.setMapData(
                mapData.tiles,
                mapData.width,
                mapData.height
              );
              setRenderTick((t) => t + 1);
              onMapDirty();
            }
          }
          rectStart.current = null;
        } else if (paintChanges.current.length > 0) {
          undoStackRef.current.push({
            type: paintTool === "eraser" ? "erase" : "paint",
            changes: [...paintChanges.current],
            timestamp: Date.now(),
          });
          paintChanges.current = [];
          onMapDirty();
        }
      }
    },
    [
      mapData,
      paintTool,
      selectedLayer,
      selectedTileId,
      screenToTile,
      onMapDirty,
    ]
  );

  // ALWAYS render the full layout — the canvas must exist at mount time
  // for the renderer creation and ResizeObserver effects to work.
  return (
    <div className="map-editor">
      {/* Toolbar — only show controls when a map is loaded */}
      {mapData && (
        <div className="map-editor-toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Tool:</span>
            {(["pencil", "rectangle", "bucket", "eraser"] as PaintTool[]).map(
              (tool) => (
                <button
                  key={tool}
                  className={`toolbar-btn ${paintTool === tool ? "active" : ""}`}
                  onClick={() => setPaintTool(tool)}
                  title={tool}
                >
                  {tool === "pencil"
                    ? "Pen"
                    : tool === "rectangle"
                    ? "Rect"
                    : tool === "bucket"
                    ? "Fill"
                    : "Erase"}
                </button>
              )
            )}
          </div>

          <div className="toolbar-separator" />

          <div className="toolbar-group">
            <span className="toolbar-label">Layer:</span>
            {[0, 1, 2].map((l) => (
              <button
                key={l}
                className={`toolbar-btn ${selectedLayer === l ? "active" : ""}`}
                onClick={() => setSelectedLayer(l)}
              >
                L{l + 1}
              </button>
            ))}
          </div>

          <div className="toolbar-separator" />

          <div className="toolbar-group">
            <label className="toolbar-check">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label className="toolbar-check">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(e) => setShowEvents(e.target.checked)}
              />
              Events
            </label>
          </div>

          <div className="toolbar-group toolbar-right">
            <span className="toolbar-label">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <button
              className="toolbar-btn toolbar-btn-sm"
              onClick={() => setZoom(1)}
              title="Reset zoom"
            >
              1:1
            </button>
          </div>
        </div>
      )}

      {/* Canvas container — ALWAYS rendered */}
      <div className="map-editor-canvas-container">
        <canvas
          ref={canvasRef}
          className="map-editor-canvas"
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={(e) => {
            if (!mapData || !onOpenEvent) return;
            const pos = screenToTile(e.clientX, e.clientY);
            if (!pos) return;
            const evt = mapData.events.find(
              (ev) => ev.x === pos.x && ev.y === pos.y
            );
            if (evt) {
              onOpenEvent(evt.id, evt.name);
            }
          }}
          onMouseLeave={() => {
            setCursorTile(null);
            isPanning.current = false;
            if (isPainting.current) {
              isPainting.current = false;
              if (paintChanges.current.length > 0) {
                undoStackRef.current.push({
                  type: "paint",
                  changes: [...paintChanges.current],
                  timestamp: Date.now(),
                });
                paintChanges.current = [];
                onMapDirty();
              }
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Empty state overlay — shown ON TOP of the canvas */}
        {!mapData && (
          <div className="map-editor-empty-overlay">
            <p>Select a map from the tree to start editing</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      {mapData && (
        <div className="map-editor-status">
          <span>
            Map [{String(mapData.id).padStart(3, "0")}] {mapData.width}x
            {mapData.height}
          </span>
          {cursorTile && (
            <span>
              ({cursorTile.x}, {cursorTile.y})
            </span>
          )}
          <span>Layer {selectedLayer + 1}/3</span>
          <span>Tile: {selectedTileId}</span>
          <span>Events: {mapData.events.length}</span>
          <span className="toolbar-right">
            {undoStackRef.current.canUndo() ? "Ctrl+Z: Undo" : ""}
            {undoStackRef.current.canRedo() ? " | Ctrl+Y: Redo" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
