import type { PaintTool } from "../../types";
import type { TileClipboard } from "../../services/mapEditor";

interface MapToolbarProps {
  paintTool: PaintTool;
  setPaintTool: (tool: PaintTool) => void;
  tileClipboard: TileClipboard | null;
  selectedLayer: number;
  setSelectedLayer: (layer: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export function MapToolbar({
  paintTool,
  setPaintTool,
  tileClipboard,
  selectedLayer,
  setSelectedLayer,
  showGrid,
  setShowGrid,
  zoom,
  setZoom,
}: MapToolbarProps) {
  return (
    <div className="map-editor-toolbar">
      <div className="toolbar-group">
        <span className="toolbar-label">Tool:</span>
        {(["pencil", "rectangle", "bucket", "eraser", "select"] as PaintTool[]).map(
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
                : tool === "eraser"
                ? "Erase"
                : "Sel"}
            </button>
          )
        )}
        {paintTool === "select" && tileClipboard && (
          <span style={{ fontSize: 10, color: "#40a02b", marginLeft: 4 }}>
            ✓ Copied ({tileClipboard.width}×{tileClipboard.height})
          </span>
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
          style={selectedLayer === 3 ? { borderColor: "#fe640b", color: "#fe640b" } : {}}
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
  );
}
