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
import { loadCharacterImage } from "../../services/imageLoader";
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
  onCreateEvent?: (x: number, y: number) => void;
  onDeleteEvent?: (eventId: number, eventName: string) => void;
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
  onCreateEvent,
  onDeleteEvent,
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

  // Event context menu state
  const [eventContextMenu, setEventContextMenu] = useState<{
    x: number;
    y: number;
    eventId: number;
    eventName: string;
  } | null>(null);

  // Character sprite cache: graphicName → HTMLImageElement
  const [characterImages, setCharacterImages] = useState<Map<string, HTMLImageElement | null>>(new Map());

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

  // Load character sprite images for events
  useEffect(() => {
    if (!mapData || !_projectPath) return;

    // Collect unique character graphic names from events
    const names = new Set<string>();
    for (const evt of mapData.events) {
      if (evt.graphic_name) names.add(evt.graphic_name);
    }

    if (names.size === 0) return;

    // Load each character image (skip already-loaded ones)
    const toLoad = [...names].filter((n) => !characterImages.has(n));
    if (toLoad.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        toLoad.map(async (name) => {
          const img = await loadCharacterImage(_projectPath, name);
          return [name, img] as [string, HTMLImageElement | null];
        })
      );
      if (cancelled) return;
      setCharacterImages((prev) => {
        const next = new Map(prev);
        for (const [name, img] of results) {
          next.set(name, img);
        }
        return next;
      });
    })();

    return () => { cancelled = true; };
  }, [mapData, _projectPath]);

  // Animation loop — only runs when we have map data
  useEffect(() => {
    if (!rendererRef.current || !mapData) return;

    const events: EventMarker[] = mapData.events.map((e) => ({
      id: e.id,
      name: e.name,
      x: e.x,
      y: e.y,
      graphicName: e.graphic_name,
      graphicDirection: e.graphic_direction,
      graphicPattern: e.graphic_pattern,
      graphicImage: e.graphic_name ? characterImages.get(e.graphic_name) : null,
    }));

    const animate = (time: number) => {
      rendererRef.current?.render(
        time,
        {
          showGrid,
          showEvents: true,
          showLayer: showLayers,
          activeLayer: selectedLayer,
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
    showLayers,
    selectedLayer,
    zoom,
    viewportX,
    viewportY,
    renderTick,
    characterImages,
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
      if (selectedLayer < 0 || selectedLayer > 2) return; // Can't paint on Events or All layer

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

  // Mouse wheel: scroll to pan, Ctrl+scroll (pinch-to-zoom) to zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+scroll or pinch-to-zoom → zoom
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(0.25, Math.min(4, z * factor)));
      } else {
        // Regular scroll → pan the viewport (in tile units)
        const tilePixels = TILE_SIZE * zoom;
        const dx = e.deltaX / tilePixels;
        const dy = e.deltaY / tilePixels;
        setViewportX((v) => v + dx);
        setViewportY((v) => v + dy);
      }
    },
    [zoom]
  );

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

        // On Events layer, clicking is for event selection, not tile painting
        if (selectedLayer === 3) {
          return;
        }

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
            <button
              className={`toolbar-btn ${selectedLayer === 3 ? "active" : ""}`}
              onClick={() => setSelectedLayer(3)}
              title="Events layer — view and select events"
              style={selectedLayer === 3 ? { borderColor: "#fab387", color: "#fab387" } : {}}
            >
              Ev
            </button>
            <button
              className={`toolbar-btn ${selectedLayer === -1 ? "active" : ""}`}
              onClick={() => setSelectedLayer(-1)}
              title="Show all layers at full opacity"
            >
              All
            </button>
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
            if (!mapData) return;
            const pos = screenToTile(e.clientX, e.clientY);
            if (!pos) return;
            const evt = mapData.events.find(
              (ev) => ev.x === pos.x && ev.y === pos.y
            );
            if (evt) {
              // Double-click existing event → open editor
              if (onOpenEvent) onOpenEvent(evt.id, evt.name);
            } else if (selectedLayer === 3 && onCreateEvent) {
              // Double-click empty tile on Events layer → create new event
              onCreateEvent(pos.x, pos.y);
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
          onContextMenu={(e) => {
            e.preventDefault();
            if (!mapData) return;
            const pos = screenToTile(e.clientX, e.clientY);
            if (!pos) return;
            const evt = mapData.events.find(
              (ev) => ev.x === pos.x && ev.y === pos.y
            );
            if (evt) {
              setEventContextMenu({
                x: e.clientX,
                y: e.clientY,
                eventId: evt.id,
                eventName: evt.name,
              });
            } else {
              setEventContextMenu(null);
            }
          }}
        />
        {/* Scrollbar overlays */}
        {mapData && (
          <MapScrollbars
            mapWidth={mapData.width}
            mapHeight={mapData.height}
            viewportX={viewportX}
            viewportY={viewportY}
            zoom={zoom}
            canvasRef={canvasRef}
            onViewportChange={(x, y) => {
              setViewportX(x);
              setViewportY(y);
            }}
          />
        )}
        {/* Empty state overlay — shown ON TOP of the canvas */}
        {!mapData && (
          <div className="map-editor-empty-overlay">
            <p>Select a map from the tree to start editing</p>
          </div>
        )}
      </div>

      {/* Event context menu */}
      {eventContextMenu && (
        <div
          className="map-tree-context-overlay"
          onClick={() => setEventContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setEventContextMenu(null); }}
        >
          <div
            className="map-tree-context-menu"
            style={{ left: eventContextMenu.x, top: eventContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                if (onOpenEvent) onOpenEvent(eventContextMenu.eventId, eventContextMenu.eventName);
                setEventContextMenu(null);
              }}
            >
              Edit Event
            </button>
            <div className="map-tree-context-separator" />
            <button
              className="map-tree-context-danger"
              onClick={() => {
                if (onDeleteEvent) onDeleteEvent(eventContextMenu.eventId, eventContextMenu.eventName);
                setEventContextMenu(null);
              }}
            >
              Delete Event
            </button>
          </div>
        </div>
      )}

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
          <span>{selectedLayer === -1 ? "All Layers" : selectedLayer === 3 ? `Events (${mapData.events.length})` : `Layer ${selectedLayer + 1}/3`}</span>
          <span>Tile: {selectedTileId}</span>
          <span className="toolbar-right">
            {undoStackRef.current.canUndo() ? "Ctrl+Z: Undo" : ""}
            {undoStackRef.current.canRedo() ? " | Ctrl+Y: Redo" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// --- Scrollbar overlay component ---

function MapScrollbars({
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
