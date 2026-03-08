import { useCallback, useEffect, useState } from "react";
import type { ProjectInfo, MapRenderData, TilesetRenderInfo, MapProperties } from "./types";
import { FIRST_REGULAR_TILE } from "./types";
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
import { ProjectSaveProvider } from "./context/ProjectSaveContext";
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

function App() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [currentMapId, setCurrentMapId] = useState<number | null>(null);
  const [mapData, setMapData] = useState<MapRenderData | null>(null);
  const [tilesetInfo, setTilesetInfo] = useState<TilesetRenderInfo | null>(
    null
  );
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(
    null
  );
  const [autotileImages, setAutotileImages] = useState<
    (HTMLImageElement | null)[]
  >([null, null, null, null, null, null, null]);
  const [selectedTileId, setSelectedTileId] = useState(FIRST_REGULAR_TILE);
  const [isDirty, setIsDirty] = useState(false);
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

  // Modal editor windows (like EventEditor)
  const [showDatabase, setShowDatabase] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  // Open a project by path
  const handleOpenProject = useCallback(
    async (path: string) => {
      try {
        setLoading(true);
        setError(null);
        const proj = await openProject(path);
        setProject(proj);
        setMapData(null);
        setTilesetInfo(null);
        setTilesetImage(null);
        setAutotileImages([null, null, null, null, null, null, null]);
        setCurrentMapId(null);
        setIsDirty(false);

        // Load tileset names for dialogs
        try {
          const names = await listTilesetNames(proj.path);
          setTilesetNames(names);
        } catch (err) {
          console.warn("Failed to load tileset names:", err);
        }

        // Auto-open the last edited map
        if (proj.edit_map_id) {
          await handleSelectMap(proj.edit_map_id, proj.path);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Show folder picker and open project
  const handleBrowseProject = useCallback(async () => {
    try {
      const selected = await showFolderPicker();
      if (selected) {
        await handleOpenProject(selected);
      }
    } catch (err) {
      setError(`Dialog error: ${err}`);
    }
  }, [handleOpenProject]);

  // Load map and its tileset images
  const handleSelectMap = useCallback(
    async (mapId: number, projectPath?: string) => {
      const path = projectPath || project?.path;
      if (!path) return;

      try {
        setLoading(true);
        setError(null);
        setCurrentMapId(mapId);

        // Load map data
        const data = await loadMap(path, mapId);
        setMapData(data);

        // Load tileset metadata
        const tileset = await loadTileset(path, data.tileset_id);
        setTilesetInfo(tileset);

        // Load tileset and autotile images
        console.log("[App] Loading images for tileset:", tileset.tileset_name, "autotiles:", tileset.autotile_names);
        const images = await loadAllTilesetImages(
          path,
          tileset.tileset_name,
          tileset.autotile_names
        );
        console.log("[App] Images loaded:", {
          tileset: images.tileset ? `${images.tileset.width}x${images.tileset.height}` : "null",
          autotiles: images.autotiles.map((a, i) => a ? `[${i}]${a.width}x${a.height}` : `[${i}]null`),
        });
        setTilesetImage(images.tileset);
        setAutotileImages(images.autotiles);

        setIsDirty(false);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [project]
  );

  const handleMapDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Open event editor on double-click
  const handleOpenEvent = useCallback(
    (eventId: number, eventName: string) => {
      setEditingEvent({ eventId, eventName });
    },
    []
  );

  // Save current map (Ctrl+S)
  const handleSave = useCallback(async () => {
    if (!project || !mapData || !isDirty) return;

    try {
      setLoading(true);
      await saveMap(
        project.path,
        mapData.id,
        mapData.tiles,
        mapData.width,
        mapData.height
      );
      setIsDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [project, mapData, isDirty]);

  // --- Map management handlers ---

  const handleCreateMap = useCallback((parentId: number) => {
    setCreateMapParentId(parentId);
  }, []);

  const handleConfirmCreateMap = useCallback(
    async (name: string, parentId: number, width: number, height: number, tilesetId: number) => {
      if (!project) return;
      try {
        setCreateMapParentId(null);
        setLoading(true);
        setError(null);
        const [newId, updatedInfos] = await createMap(
          project.path,
          name,
          parentId,
          width,
          height,
          tilesetId
        );
        setProject({ ...project, map_infos: updatedInfos });
        // Open the new map
        await handleSelectMap(newId, project.path);
      } catch (err) {
        setError(`Create failed: ${err}`);
      } finally {
        setLoading(false);
      }
    },
    [project, handleSelectMap]
  );

  const handleDeleteMap = useCallback(
    async (mapId: number, mapName: string) => {
      if (!project) return;
      if (!confirm(`Delete map [${String(mapId).padStart(3, "0")}] "${mapName}"?\n\nThis cannot be undone.`)) {
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const updatedInfos = await deleteMap(project.path, mapId);
        setProject({ ...project, map_infos: updatedInfos });
        if (currentMapId === mapId) {
          setCurrentMapId(null);
          setMapData(null);
        }
      } catch (err) {
        setError(`Delete failed: ${err}`);
      } finally {
        setLoading(false);
      }
    },
    [project, currentMapId]
  );

  const handleRenameMap = useCallback(
    async (mapId: number, currentName: string) => {
      if (!project) return;
      const newName = prompt("Rename map:", currentName);
      if (!newName || newName === currentName) return;
      try {
        setLoading(true);
        setError(null);
        await renameMap(project.path, mapId, newName);
        // Update local state
        const updatedInfos = { ...project.map_infos };
        if (updatedInfos[mapId]) {
          updatedInfos[mapId] = { ...updatedInfos[mapId], name: newName };
        }
        setProject({ ...project, map_infos: updatedInfos });
      } catch (err) {
        setError(`Rename failed: ${err}`);
      } finally {
        setLoading(false);
      }
    },
    [project]
  );

  const handleMapProperties = useCallback((mapId: number) => {
    setPropsMapId(mapId);
  }, []);

  const handleMapPropertiesSaved = useCallback(
    async (props: MapProperties) => {
      if (!project) return;
      setPropsMapId(null);

      // Update local map info with new name
      const updatedInfos = { ...project.map_infos };
      if (updatedInfos[props.id]) {
        updatedInfos[props.id] = { ...updatedInfos[props.id], name: props.name };
      }
      setProject({ ...project, map_infos: updatedInfos });

      // Reload the map if it's currently open (tileset/dimensions may have changed)
      if (currentMapId === props.id) {
        await handleSelectMap(props.id, project.path);
      }
    },
    [project, currentMapId, handleSelectMap]
  );

  // --- Event management handlers ---

  const handleCreateEvent = useCallback(
    async (x: number, y: number) => {
      if (!project || !currentMapId || !mapData) return;
      try {
        setError(null);
        const [newEvent, updatedEvents] = await createEvent(
          project.path,
          currentMapId,
          x,
          y
        );
        // Update map data with new events list
        setMapData({ ...mapData, events: updatedEvents });
        // Open the event editor immediately
        setEditingEvent({ eventId: newEvent.id, eventName: newEvent.name });
      } catch (err) {
        setError(`Create event failed: ${err}`);
      }
    },
    [project, currentMapId, mapData]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: number, eventName: string) => {
      if (!project || !currentMapId || !mapData) return;
      if (!confirm(`Delete event "${eventName}" (ID: ${eventId})?\n\nThis cannot be undone.`)) {
        return;
      }
      try {
        setError(null);
        const updatedEvents = await deleteEvent(project.path, currentMapId, eventId);
        setMapData({ ...mapData, events: updatedEvents });
      } catch (err) {
        setError(`Delete event failed: ${err}`);
      }
    },
    [project, currentMapId, mapData]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handleBrowseProject();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleBrowseProject]);

  // If no project is loaded, show welcome screen
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

  return (
    <ProjectSaveProvider>
    <div className="app">
      {/* Title bar */}
      <div className="app-titlebar">
        <span className="app-title">
          RMXP Editor
          {project ? ` — ${project.name}` : ""}
          {isDirty ? " *" : ""}
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
          projectPath={project?.path ?? ""}
          selectedTileId={selectedTileId}
          onMapDirty={handleMapDirty}
          onOpenEvent={handleOpenEvent}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
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
      {editingEvent && project && currentMapId && (
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
      {propsMapId !== null && project && (
        <MapPropertiesDialog
          projectPath={project.path}
          mapId={propsMapId}
          tilesetNames={tilesetNames}
          onClose={() => setPropsMapId(null)}
          onSaved={handleMapPropertiesSaved}
        />
      )}

      {/* Create map dialog */}
      {createMapParentId !== null && project && (
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
    </ProjectSaveProvider>
  );
}

export default App;
