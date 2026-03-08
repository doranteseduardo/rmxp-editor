import { useCallback, useEffect, useState } from "react";
import type { ProjectInfo, MapRenderData, TilesetRenderInfo } from "./types";
import { FIRST_REGULAR_TILE } from "./types";
import { openProject, loadMap, loadTileset, saveMap } from "./services/tauriApi";
import { loadAllTilesetImages } from "./services/imageLoader";
import { MapTreePanel } from "./components/MapTree/MapTreePanel";
import { MapEditor } from "./components/MapEditor/MapEditor";
import { TilesetPalette } from "./components/TilesetPalette/TilesetPalette";
import { EventEditor } from "./components/EventEditor/EventEditor";
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
    <div className="app">
      {/* Title bar */}
      <div className="app-titlebar">
        <span className="app-title">
          RMXP Editor
          {project ? ` — ${project.name}` : ""}
          {isDirty ? " *" : ""}
        </span>
        <div className="app-titlebar-right">
          <button className="app-titlebar-btn" onClick={handleBrowseProject}>
            Open...
          </button>
          {loading && <span className="app-loading">Loading...</span>}
        </div>
      </div>

      {/* Main layout */}
      <div className="app-body">
        {/* Left: Map tree */}
        <MapTreePanel
          mapInfos={project.map_infos}
          currentMapId={currentMapId}
          onSelectMap={(id) => handleSelectMap(id)}
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

      {/* Event editor modal */}
      {editingEvent && project && currentMapId && (
        <EventEditor
          projectPath={project.path}
          mapId={currentMapId}
          eventId={editingEvent.eventId}
          eventName={editingEvent.eventName}
          onClose={() => setEditingEvent(null)}
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

export default App;
