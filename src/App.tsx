import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectInfo, MapRenderData, TilesetRenderInfo, MapProperties, RpgEvent, EventInfo } from "./types";
import { FIRST_REGULAR_TILE } from "./types";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  openProject,
  loadMap,
  loadTileset,
  saveMap,
  createMap,
  deleteMap,
  renameMap,
  createEvent,
  deleteEvent,
  listTilesetNames,
  loadSystemData,
  saveSystemData,
  loadEvent,
  saveEvent,
} from "./services/tauriApi";
import { loadAllTilesetImages } from "./services/imageLoader";
import { MapTreePanel } from "./components/MapTree/MapTreePanel";
import { MapEditor } from "./components/MapEditor/MapEditor";
import { TilesetPalette } from "./components/TilesetPalette/TilesetPalette";
import { EventEditor } from "./components/EventEditor/EventEditor";
import { MapPropertiesDialog } from "./components/MapProperties/MapPropertiesDialog";
import { CreateMapDialog } from "./components/MapProperties/CreateMapDialog";
import { ScriptEditor } from "./components/ScriptEditor/ScriptEditor";
import { DatabaseEditor } from "./components/DatabaseEditor/DatabaseEditor";
import {
  ProjectSaveProvider,
  useProjectSave,
  useEditorRegistration,
} from "./context/ProjectSaveContext";
import "./App.css";

/** Try to open a native folder picker via Tauri dialog plugin. */
async function showFolderPicker(): Promise<string | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select RMXP Project Folder",
    });
    return selected as string | null;
  } catch (err) {
    console.warn("Tauri dialog not available, falling back to prompt:", err);
    return window.prompt("Enter the path to your RMXP project folder:");
  }
}

/**
 * Inner component rendered inside ProjectSaveProvider so it can call
 * useProjectSave() and useEditorRegistration().
 */
function AppContent() {
  const { saveAll, dirtyCount } = useProjectSave();

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [currentMapId, setCurrentMapId] = useState<number | null>(null);
  const [mapData, setMapData] = useState<MapRenderData | null>(null);
  const [tilesetInfo, setTilesetInfo] = useState<TilesetRenderInfo | null>(null);
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [autotileImages, setAutotileImages] = useState<(HTMLImageElement | null)[]>(
    [null, null, null, null, null, null, null]
  );
  const [selectedTileId, setSelectedTileId] = useState(FIRST_REGULAR_TILE);
  const [mapIsDirty, setMapIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Event editor state
  const [editingEvent, setEditingEvent] = useState<{
    eventId: number;
    eventName: string;
  } | null>(null);

  // Map properties dialog state
  const [propsMapId, setPropsMapId] = useState<number | null>(null);

  // Create map dialog state
  const [createMapParentId, setCreateMapParentId] = useState<number | null>(null);

  // Tileset names cache (loaded once when project opens)
  const [tilesetNames, setTilesetNames] = useState<Array<[number, string]>>([]);

  // Starting position (loaded from System.rxdata)
  const [startPosition, setStartPosition] = useState<{ mapId: number; x: number; y: number } | null>(null);

  // Clipboard for event copy/paste
  const [clipboardEvent, setClipboardEvent] = useState<RpgEvent | null>(null);

  // Modal editor windows
  const [showDatabase, setShowDatabase] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  // Refs let callbacks always read the latest values without stale closures.
  const mapDataRef = useRef<MapRenderData | null>(null);
  const mapIsDirtyRef = useRef(false);
  const currentMapIdRef = useRef<number | null>(null);
  const projectRef = useRef<ProjectInfo | null>(null);

  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);
  useEffect(() => { projectRef.current = project; }, [project]);

  /** Update map dirty flag in both state (for renders) and ref (for callbacks). */
  const updateMapDirty = useCallback((val: boolean) => {
    mapIsDirtyRef.current = val;
    setMapIsDirty(val);
  }, []);

  // ── Map save/cancel for ProjectSaveContext registration ────────────────────

  const saveMapTiles = useCallback(async () => {
    const md = mapDataRef.current;
    const proj = projectRef.current;
    if (!proj || !md) return;
    setLoading(true);
    try {
      await saveMap(proj.path, md.id, md.tiles, md.width, md.height);
      updateMapDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [updateMapDirty]);

  const cancelMapTiles = useCallback(() => {
    updateMapDirty(false);
  }, [updateMapDirty]);

  // Register the current map with the global save context.
  // ID changes when the map changes, which auto-unregisters the old map.
  useEditorRegistration(
    currentMapId != null ? `map-${currentMapId}` : "map-none",
    saveMapTiles,
    cancelMapTiles,
    mapIsDirty
  );

  // ── Project loading ────────────────────────────────────────────────────────

  const handleOpenProject = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const proj = await openProject(path);

      // Update ref immediately so handleSelectMap sees the new project path.
      projectRef.current = proj;
      setProject(proj);

      setMapData(null);
      mapDataRef.current = null;
      setTilesetInfo(null);
      setTilesetImage(null);
      setAutotileImages([null, null, null, null, null, null, null]);
      setCurrentMapId(null);
      currentMapIdRef.current = null;
      updateMapDirty(false);

      try {
        const names = await listTilesetNames(proj.path);
        setTilesetNames(names);
      } catch (err) {
        console.warn("Failed to load tileset names:", err);
      }

      try {
        const sys = await loadSystemData(proj.path);
        setStartPosition({ mapId: sys.start_map_id, x: sys.start_x, y: sys.start_y });
      } catch (err) {
        console.warn("Failed to load system start position:", err);
      }

      if (proj.edit_map_id) {
        // skipGuard=true: dirty state was cleared above; no need to prompt.
        await handleSelectMap(proj.edit_map_id, true);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBrowseProject = useCallback(async () => {
    try {
      const selected = await showFolderPicker();
      if (selected) await handleOpenProject(selected);
    } catch (err) {
      setError(`Dialog error: ${err}`);
    }
  }, [handleOpenProject]);

  // ── Map selection with unsaved-changes guard ───────────────────────────────

  /**
   * Load a map. Pass skipGuard=true to bypass the unsaved-changes prompt
   * (used when reloading the current map after property changes, or on initial
   * project open when dirty state has already been cleared).
   */
  const handleSelectMap = useCallback(async (mapId: number, skipGuard = false) => {
    const path = projectRef.current?.path;
    if (!path) return;

    // Prompt before switching away from a dirty map.
    if (
      !skipGuard &&
      currentMapIdRef.current !== null &&
      mapId !== currentMapIdRef.current &&
      mapIsDirtyRef.current
    ) {
      if (await confirm("Save tile changes to the current map before switching?")) {
        const md = mapDataRef.current;
        if (md) {
          try {
            await saveMap(path, md.id, md.tiles, md.width, md.height);
          } catch (err) {
            setError(`Save failed: ${err}`);
            return; // stay on the current map if save failed
          }
        }
      }
      // Whether saved or discarded, clear the dirty flag.
      mapIsDirtyRef.current = false;
      setMapIsDirty(false);
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentMapId(mapId);
      currentMapIdRef.current = mapId;

      const data = await loadMap(path, mapId);
      setMapData(data);
      mapDataRef.current = data;

      const tileset = await loadTileset(path, data.tileset_id);
      setTilesetInfo(tileset);

      console.log("[App] Loading images for tileset:", tileset.tileset_name, "autotiles:", tileset.autotile_names);
      const images = await loadAllTilesetImages(path, tileset.tileset_name, tileset.autotile_names);
      console.log("[App] Images loaded:", {
        tileset: images.tileset ? `${images.tileset.width}x${images.tileset.height}` : "null",
        autotiles: images.autotiles.map((a, i) => a ? `[${i}]${a.width}x${a.height}` : `[${i}]null`),
      });
      setTilesetImage(images.tileset);
      setAutotileImages(images.autotiles);

      mapIsDirtyRef.current = false;
      setMapIsDirty(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []); // uses refs only — stable reference, no deps needed

  const handleMapDirty = useCallback(() => {
    updateMapDirty(true);
  }, [updateMapDirty]);

  // Open event editor on double-click
  const handleOpenEvent = useCallback((eventId: number, eventName: string) => {
    setEditingEvent({ eventId, eventName });
  }, []);

  // ── Map management handlers ────────────────────────────────────────────────

  const handleCreateMap = useCallback((parentId: number) => {
    setCreateMapParentId(parentId);
  }, []);

  const handleConfirmCreateMap = useCallback(
    async (name: string, parentId: number, width: number, height: number, tilesetId: number) => {
      const proj = projectRef.current;
      if (!proj) return;
      try {
        setCreateMapParentId(null);
        setLoading(true);
        setError(null);
        const [newId, updatedInfos] = await createMap(
          proj.path, name, parentId, width, height, tilesetId
        );
        setProject({ ...proj, map_infos: updatedInfos });
        projectRef.current = { ...proj, map_infos: updatedInfos };
        // Guard runs here: if map tiles are dirty the user will be prompted.
        await handleSelectMap(newId);
      } catch (err) {
        setError(`Create failed: ${err}`);
      } finally {
        setLoading(false);
      }
    },
    [handleSelectMap]
  );

  const handleDeleteMap = useCallback(
    async (mapId: number, mapName: string) => {
      const proj = projectRef.current;
      if (!proj) return;
      if (!(await confirm(`Delete map [${String(mapId).padStart(3, "0")}] "${mapName}"?\n\nThis cannot be undone.`))) {
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const updatedInfos = await deleteMap(proj.path, mapId);
        setProject({ ...proj, map_infos: updatedInfos });
        projectRef.current = { ...proj, map_infos: updatedInfos };
        if (currentMapIdRef.current === mapId) {
          setCurrentMapId(null);
          currentMapIdRef.current = null;
          setMapData(null);
          mapDataRef.current = null;
        }
      } catch (err) {
        setError(`Delete failed: ${err}`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleRenameMap = useCallback(async (mapId: number, currentName: string) => {
    const proj = projectRef.current;
    if (!proj) return;
    const newName = prompt("Rename map:", currentName);
    if (!newName || newName === currentName) return;
    try {
      setLoading(true);
      setError(null);
      await renameMap(proj.path, mapId, newName);
      const updatedInfos = { ...proj.map_infos };
      if (updatedInfos[mapId]) {
        updatedInfos[mapId] = { ...updatedInfos[mapId], name: newName };
      }
      setProject({ ...proj, map_infos: updatedInfos });
      projectRef.current = { ...proj, map_infos: updatedInfos };
    } catch (err) {
      setError(`Rename failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMapProperties = useCallback((mapId: number) => {
    setPropsMapId(mapId);
  }, []);

  const handleMapPropertiesSaved = useCallback(async (props: MapProperties) => {
    const proj = projectRef.current;
    if (!proj) return;
    setPropsMapId(null);

    const updatedInfos = { ...proj.map_infos };
    if (updatedInfos[props.id]) {
      updatedInfos[props.id] = { ...updatedInfos[props.id], name: props.name };
    }
    setProject({ ...proj, map_infos: updatedInfos });
    projectRef.current = { ...proj, map_infos: updatedInfos };

    if (currentMapIdRef.current === props.id) {
      // Reload the same map — skip the guard (we're not switching maps).
      await handleSelectMap(props.id, true);
    }
  }, [handleSelectMap]);

  // ── Event management handlers ──────────────────────────────────────────────

  const handleCreateEvent = useCallback(async (x: number, y: number) => {
    const proj = projectRef.current;
    const md = mapDataRef.current;
    const mapId = currentMapIdRef.current;
    if (!proj || !mapId || !md) return;
    try {
      setError(null);
      const [newEvent, updatedEvents] = await createEvent(proj.path, mapId, x, y);
      setMapData({ ...md, events: updatedEvents });
      mapDataRef.current = { ...md, events: updatedEvents };
      setEditingEvent({ eventId: newEvent.id, eventName: newEvent.name });
    } catch (err) {
      setError(`Create event failed: ${err}`);
    }
  }, []);

  const handleDeleteEvent = useCallback(async (eventId: number, eventName: string) => {
    const proj = projectRef.current;
    const md = mapDataRef.current;
    const mapId = currentMapIdRef.current;
    if (!proj || !mapId || !md) return;
    if (!(await confirm(`Delete event "${eventName}" (ID: ${eventId})?\n\nThis cannot be undone.`))) return;
    try {
      setError(null);
      const updatedEvents = await deleteEvent(proj.path, mapId, eventId);
      setMapData({ ...md, events: updatedEvents });
      mapDataRef.current = { ...md, events: updatedEvents };
    } catch (err) {
      setError(`Delete event failed: ${err}`);
    }
  }, []);

  // Set starting position: load System, patch, save, update local state
  const handleSetStartPosition = useCallback(async (x: number, y: number) => {
    const proj = projectRef.current;
    const mapId = currentMapIdRef.current;
    if (!proj || mapId === null) return;
    try {
      const sys = await loadSystemData(proj.path);
      await saveSystemData(proj.path, { ...sys, start_map_id: mapId, start_x: x, start_y: y });
      setStartPosition({ mapId, x, y });
    } catch (err) {
      setError(`Set starting point failed: ${err}`);
    }
  }, []);

  // Copy event: load full data and store in clipboard
  const handleCopyEvent = useCallback(async (eventId: number) => {
    const proj = projectRef.current;
    const mapId = currentMapIdRef.current;
    if (!proj || mapId === null) return;
    try {
      const evt = await loadEvent(proj.path, mapId, eventId);
      setClipboardEvent(evt);
    } catch (err) {
      setError(`Copy event failed: ${err}`);
    }
  }, []);

  // Paste event: create at target tile, overwrite with clipboard data
  const handlePasteEvent = useCallback(async (tileX: number, tileY: number) => {
    const proj = projectRef.current;
    const md = mapDataRef.current;
    const mapId = currentMapIdRef.current;
    if (!proj || !md || mapId === null || !clipboardEvent) return;
    try {
      setError(null);
      const [newEvent, updatedEvents] = await createEvent(proj.path, mapId, tileX, tileY);
      const pasted: RpgEvent = { ...clipboardEvent, id: newEvent.id, x: tileX, y: tileY };
      await saveEvent(proj.path, mapId, pasted);
      // Build updated EventInfo from clipboard data
      const firstPage = clipboardEvent.pages[0];
      const pastedInfo: EventInfo = {
        id: newEvent.id,
        name: clipboardEvent.name,
        x: tileX,
        y: tileY,
        page_count: clipboardEvent.pages.length,
        graphic_name: firstPage?.graphic.character_name ?? "",
        graphic_direction: firstPage?.graphic.direction ?? 2,
        graphic_pattern: firstPage?.graphic.pattern ?? 0,
      };
      const finalEvents = updatedEvents.map(e => e.id === newEvent.id ? pastedInfo : e);
      setMapData({ ...md, events: finalEvents });
      mapDataRef.current = { ...md, events: finalEvents };
    } catch (err) {
      setError(`Paste event failed: ${err}`);
    }
  }, [clipboardEvent]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  // Ctrl+S saves ALL dirty editors (map tiles + database + scripts).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handleBrowseProject();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveAll, handleBrowseProject]);

  // ── Welcome screen ─────────────────────────────────────────────────────────

  if (!project) {
    return (
      <div className="app">
        <div className="app-titlebar">
          <span className="app-title">RMXP Editor</span>
          <div className="app-titlebar-right">
            {loading && <span className="app-loading">Loading...</span>}
          </div>
        </div>
        <div className="app-welcome">
          <div className="app-welcome-content">
            <h1>RMXP Editor</h1>
            <p>A modern editor for RPG Maker XP projects</p>
            <button
              className="app-welcome-btn"
              onClick={handleBrowseProject}
              disabled={loading}
            >
              {loading ? "Opening..." : "Open Project Folder"}
            </button>
            <p className="app-welcome-hint">
              Select a folder containing a Game.rxproj file
              <br />
              <span style={{ opacity: 0.6 }}>Shortcut: Cmd+O</span>
            </p>
          </div>
          {error && (
            <div className="app-error">
              <span>{error}</span>
              <button onClick={() => setError(null)}>x</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Title bar — * reflects all dirty editors via dirtyCount */}
      <div className="app-titlebar">
        <span className="app-title">
          RMXP Editor — {project.name}{dirtyCount > 0 ? " *" : ""}
        </span>
        <div className="app-titlebar-right">
          <button className="app-titlebar-btn" onClick={() => setShowDatabase(true)}>
            Database
          </button>
          <button className="app-titlebar-btn" onClick={() => setShowScripts(true)}>
            Scripts
          </button>
          <button className="app-titlebar-btn" onClick={handleBrowseProject}>
            Open...
          </button>
          {loading && <span className="app-loading">Loading...</span>}
        </div>
      </div>

      {/* Main layout — map editor always visible */}
      <div className="app-body">
        {/* Left: Map tree */}
        <MapTreePanel
          mapInfos={project.map_infos}
          currentMapId={currentMapId}
          onSelectMap={(id) => handleSelectMap(id)}
          onCreateMap={handleCreateMap}
          onDeleteMap={handleDeleteMap}
          onRenameMap={handleRenameMap}
          onMapProperties={handleMapProperties}
        />

        {/* Center: Map editor */}
        <MapEditor
          mapData={mapData}
          tilesetInfo={tilesetInfo}
          tilesetImage={tilesetImage}
          autotileImages={autotileImages}
          projectPath={project.path}
          selectedTileId={selectedTileId}
          currentMapId={currentMapId ?? undefined}
          startPosition={startPosition ?? undefined}
          hasClipboardEvent={clipboardEvent !== null}
          onMapDirty={handleMapDirty}
          onOpenEvent={handleOpenEvent}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
          onSetStartPosition={handleSetStartPosition}
          onCopyEvent={handleCopyEvent}
          onPasteEvent={handlePasteEvent}
        />

        {/* Right: Tileset palette */}
        <TilesetPalette
          tilesetInfo={tilesetInfo}
          tilesetImage={tilesetImage}
          autotileImages={autotileImages}
          selectedTileId={selectedTileId}
          onSelectTile={setSelectedTileId}
        />
      </div>

      {/* Database editor modal */}
      {showDatabase && (
        <div className="editor-modal-overlay">
          <div className="editor-modal">
            <DatabaseEditor projectPath={project.path} onClose={() => setShowDatabase(false)} />
          </div>
        </div>
      )}

      {/* Script editor modal */}
      {showScripts && (
        <div className="editor-modal-overlay">
          <div className="editor-modal">
            <ScriptEditor projectPath={project.path} onClose={() => setShowScripts(false)} />
          </div>
        </div>
      )}

      {/* Event editor modal */}
      {editingEvent && currentMapId && (
        <EventEditor
          projectPath={project.path}
          mapId={currentMapId}
          eventId={editingEvent.eventId}
          eventName={editingEvent.eventName}
          onClose={() => setEditingEvent(null)}
          mapInfos={project.map_infos}
        />
      )}

      {/* Map properties dialog */}
      {propsMapId !== null && (
        <MapPropertiesDialog
          projectPath={project.path}
          mapId={propsMapId}
          tilesetNames={tilesetNames}
          onClose={() => setPropsMapId(null)}
          onSaved={handleMapPropertiesSaved}
        />
      )}

      {/* Create map dialog */}
      {createMapParentId !== null && (
        <CreateMapDialog
          mapInfos={project.map_infos}
          tilesetNames={tilesetNames}
          defaultParentId={createMapParentId}
          onConfirm={handleConfirmCreateMap}
          onClose={() => setCreateMapParentId(null)}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="app-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>x</button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ProjectSaveProvider>
      <AppContent />
    </ProjectSaveProvider>
  );
}

export default App;
