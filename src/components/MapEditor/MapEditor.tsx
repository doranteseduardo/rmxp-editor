import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapRenderData, TilesetRenderInfo, PaintTool } from "../../types";
import { MapRenderer, type EventMarker, type RenderOptions } from "../../services/mapRenderer";
import { TILE_SIZE } from "../../types";
import {
  paintTile,
  paintRectangle,
  floodFill,
  eraseTile,
  copyTileRegion,
  pasteTileRegion,
  UndoStack,
  applyAction,
  revertAction,
  type MapAction,
  type TileClipboard,
} from "../../services/mapEditor";
import { loadCharacterImage } from "../../services/imageLoader";
import { MapScrollbars } from "./MapScrollbars";
import { MapToolbar } from "./MapToolbar";
import { MapContextMenu } from "./MapContextMenu";
import "./MapEditor.css";

interface Props {
  mapData: MapRenderData | null;
  tilesetInfo: TilesetRenderInfo | null;
  tilesetImage: HTMLImageElement | null;
  autotileImages: (HTMLImageElement | null)[];
  projectPath?: string;
  selectedTileId: number;
  currentMapId?: number;
  startPosition?: { mapId: number; x: number; y: number };
  hasClipboardEvent?: boolean;
  onMapDirty: () => void;
  onOpenEvent?: (eventId: number, eventName: string) => void;
  onCreateEvent?: (x: number, y: number) => void;
  onDeleteEvent?: (eventId: number, eventName: string) => void;
  onSetStartPosition?: (x: number, y: number) => Promise<void>;
  onCopyEvent?: (eventId: number) => Promise<void>;
  onPasteEvent?: (x: number, y: number) => Promise<void>;
}

export function MapEditor({
  mapData,
  tilesetInfo,
  tilesetImage,
  autotileImages,
  projectPath: _projectPath,
  selectedTileId,
  currentMapId,
  startPosition,
  hasClipboardEvent,
  onMapDirty,
  onOpenEvent,
  onCreateEvent,
  onDeleteEvent,
  onSetStartPosition,
  onCopyEvent,
  onPasteEvent,
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

  // Selection state (tile select tool)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const isSelecting = useRef(false);
  const [tileClipboard, setTileClipboard] = useState<TileClipboard | null>(null);

  // Force re-render trigger (the value is unused; setting it re-runs the
  // component so the render-params ref and derived UI refresh).
  const [, setRenderTick] = useState(0);

  // Tile context menu state (right-click on any tile)
  const [contextMenu, setContextMenu] = useState<{
    x: number;           // screen x
    y: number;           // screen y
    tileX: number;       // tile col
    tileY: number;       // tile row
    event: { id: number; name: string } | null;
  } | null>(null);

  // Character sprite cache: graphicName → HTMLImageElement
  const [characterImages, setCharacterImages] = useState<Map<string, HTMLImageElement | null>>(new Map());

  // Initialize renderer — canvas is ALWAYS in the DOM now
  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new MapRenderer(canvasRef.current);
  }, []);

  // Clear selection when switching away from select tool
  useEffect(() => {
    if (paintTool !== "select") {
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [paintTool]);

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

  // Drop cached character sprites when switching maps/projects so the cache
  // doesn't accumulate every sprite visited this session. (Re-loading the same
  // map keeps currentMapId stable, so its sprites are preserved.)
  useEffect(() => {
    setCharacterImages(new Map());
  }, [currentMapId, _projectPath]);

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

  // Event markers only depend on the map data and loaded sprite images, not on
  // viewport/zoom — memoize so panning doesn't rebuild this array every frame.
  const events: EventMarker[] = useMemo(
    () =>
      mapData
        ? mapData.events.map((e) => ({
            id: e.id,
            name: e.name,
            x: e.x,
            y: e.y,
            graphicName: e.graphic_name,
            graphicDirection: e.graphic_direction,
            graphicPattern: e.graphic_pattern,
            graphicImage: e.graphic_name ? characterImages.get(e.graphic_name) : null,
          }))
        : [],
    [mapData, characterImages]
  );

  // Mirror the latest render params into a ref every render. The persistent RAF
  // loop below reads from this ref, so pan/zoom/selection changes never tear down
  // and recreate the animation loop (which previously happened on every mousemove).
  const renderStateRef = useRef<{ options: RenderOptions; events: EventMarker[] } | null>(null);
  const startMarker =
    currentMapId !== undefined && startPosition && currentMapId === startPosition.mapId
      ? { x: startPosition.x, y: startPosition.y }
      : undefined;
  const selectionRect = (selectionStart && selectionEnd)
    ? { x1: selectionStart.x, y1: selectionStart.y, x2: selectionEnd.x, y2: selectionEnd.y }
    : null;
  renderStateRef.current = {
    options: {
      showGrid,
      showEvents: true,
      showLayer: showLayers,
      activeLayer: selectedLayer,
      zoom,
      viewportX,
      viewportY,
      startMarker,
      selectionRect,
    },
    events,
  };

  // Animation loop — started once per map; reads live params from the ref above.
  useEffect(() => {
    if (!rendererRef.current || !mapData) return;
    const animate = (time: number) => {
      const st = renderStateRef.current;
      if (st) rendererRef.current?.render(time, st.options, st.events);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mapData]);

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

  // Keyboard shortcuts (undo/redo + tile copy/paste)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mapData) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const action = undoStackRef.current.undo();
        if (action) {
          revertAction(mapData, action);
          rendererRef.current?.setMapData(mapData.tiles, mapData.width, mapData.height);
          setRenderTick((t) => t + 1);
        }
      }

      if ((e.ctrlKey || e.metaKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        const action = undoStackRef.current.redo();
        if (action) {
          applyAction(mapData, action);
          rendererRef.current?.setMapData(mapData.tiles, mapData.width, mapData.height);
          setRenderTick((t) => t + 1);
        }
      }

      // Ctrl+C — copy tile selection
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        setSelectionStart((start) => {
          setSelectionEnd((end) => {
            if (start && end) {
              const clipboard = copyTileRegion(
                mapData,
                { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
                selectedLayer
              );
              setTileClipboard(clipboard);
            }
            return end;
          });
          return start;
        });
      }

      // Ctrl+V — paste tile clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        setTileClipboard((clipboard) => {
          if (!clipboard) return clipboard;
          setCursorTile((cursor) => {
            setSelectionStart((selStart) => {
              const origin = cursor ?? selStart;
              if (origin) {
                const changes = pasteTileRegion(mapData, clipboard, origin, selectedLayer);
                if (changes.length > 0) {
                  undoStackRef.current.push({ type: "paste", changes, timestamp: Date.now() });
                  rendererRef.current?.setMapData(mapData.tiles, mapData.width, mapData.height);
                  setRenderTick((t) => t + 1);
                  onMapDirty();
                }
              }
              return selStart;
            });
            return cursor;
          });
          return clipboard;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData, selectedLayer, onMapDirty]);

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
        const changes = paintTile(mapData, x, y, selectedLayer, selectedTileId);
        if (changes.length > 0) {
          paintChanges.current.push(...changes);
          rendererRef.current?.setMapData(
            mapData.tiles,
            mapData.width,
            mapData.height
          );
          setRenderTick((t) => t + 1);
        }
      } else if (paintTool === "eraser") {
        const changes = eraseTile(mapData, x, y, selectedLayer);
        if (changes.length > 0) {
          paintChanges.current.push(...changes);
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

        if (paintTool === "select") {
          setSelectionStart(pos);
          setSelectionEnd(pos);
          isSelecting.current = true;
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

        if (isSelecting.current && paintTool === "select") {
          setSelectionEnd(pos);
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

      if (e.button === 0 && isSelecting.current) {
        isSelecting.current = false;
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
        <MapToolbar
          paintTool={paintTool}
          setPaintTool={setPaintTool}
          tileClipboard={tileClipboard}
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          zoom={zoom}
          setZoom={setZoom}
        />
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
            if (pos.x < 0 || pos.x >= mapData.width || pos.y < 0 || pos.y >= mapData.height) return;
            const evt = mapData.events.find(ev => ev.x === pos.x && ev.y === pos.y);
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              tileX: pos.x,
              tileY: pos.y,
              event: evt ? { id: evt.id, name: evt.name } : null,
            });
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

      {/* Tile context menu */}
      {contextMenu && (
        <MapContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          hasClipboardEvent={hasClipboardEvent}
          onOpenEvent={onOpenEvent}
          onCopyEvent={onCopyEvent}
          onDeleteEvent={onDeleteEvent}
          onPasteEvent={onPasteEvent}
          onSetStartPosition={onSetStartPosition}
        />
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
