import { useEffect, useState, useRef } from "react";
import { listAssetFiles } from "../../services/tauriApi";
import { loadCharacterImage } from "../../services/imageLoader";

interface Props {
  projectPath: string;
  currentName: string;
  currentDirection: number;
  onSelect: (name: string) => void;
  onClose: () => void;
}

const TILE_SIZE = 32;
const DIRECTION_ROWS: Record<number, number> = { 2: 0, 4: 1, 6: 2, 8: 3 };

/**
 * Modal dialog for picking a character graphic from the project's Characters folder.
 * Shows a searchable grid of all available character sprites with live previews.
 */
export function CharacterPicker({
  projectPath,
  currentName,
  currentDirection,
  onSelect,
  onClose,
}: Props) {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(currentName);

  // Load character file list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listAssetFiles(projectPath, "character");
        if (!cancelled) setNames(list);
      } catch (err) {
        console.error("Failed to list characters:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectPath]);

  const filtered = filter
    ? names.filter((n) => n.toLowerCase().includes(filter.toLowerCase()))
    : names;

  return (
    <div
      className="command-picker-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("command-picker-overlay")) {
          onClose();
        }
      }}
    >
      <div className="character-picker">
        <div className="command-picker-header">
          <h3>Select Character Graphic</h3>
          <button className="event-editor-close" onClick={onClose}>×</button>
        </div>

        <div className="command-picker-search">
          <input
            autoFocus
            placeholder="Filter characters..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="character-picker-grid">
          {loading ? (
            <div className="character-picker-loading">Loading...</div>
          ) : (
            <>
              {/* (none) option */}
              <CharacterTile
                projectPath={projectPath}
                name=""
                direction={currentDirection}
                isSelected={selected === ""}
                onClick={() => setSelected("")}
                onDoubleClick={() => { onSelect(""); onClose(); }}
              />
              {filtered.map((name) => (
                <CharacterTile
                  key={name}
                  projectPath={projectPath}
                  name={name}
                  direction={currentDirection}
                  isSelected={selected === name}
                  onClick={() => setSelected(name)}
                  onDoubleClick={() => { onSelect(name); onClose(); }}
                />
              ))}
            </>
          )}
        </div>

        <div className="character-picker-footer">
          <span className="character-picker-info">
            {selected || "(none)"} — {filtered.length} character(s)
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="event-editor-btn event-editor-btn-primary"
              onClick={() => { onSelect(selected); onClose(); }}
            >
              OK
            </button>
            <button className="event-editor-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual character tile in the picker grid.
 * Loads and renders the first frame of the character's sprite sheet.
 */
function CharacterTile({
  projectPath,
  name,
  direction,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  projectPath: string;
  name: string;
  direction: number;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!name || !canvasRef.current) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const img = await loadCharacterImage(projectPath, name);
        if (cancelled || !img || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const displaySize = 48;
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;
        ctx.imageSmoothingEnabled = false;

        // Calculate frame dimensions
        const isSingle = img.width <= TILE_SIZE && img.height <= TILE_SIZE;
        const cols = isSingle ? 1 : 4;
        const rows = isSingle ? 1 : 4;
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        // Get direction row
        const row = isSingle ? 0 : (DIRECTION_ROWS[direction] ?? 0);
        const col = isSingle ? 0 : 1; // middle frame (standing)

        const srcX = col * frameW;
        const srcY = row * frameH;

        // Scale to fit 48px display, maintaining aspect ratio
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
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [projectPath, name, direction]);

  const shortName = name ? (name.length > 14 ? name.slice(0, 12) + "…" : name) : "(none)";

  return (
    <div
      className={`character-tile ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={name || "(none)"}
    >
      <div className="character-tile-preview">
        {name ? (
          <canvas
            ref={canvasRef}
            style={{ opacity: loaded ? 1 : 0.3 }}
          />
        ) : (
          <span style={{ fontSize: 20, color: "#6c7086" }}>∅</span>
        )}
      </div>
      <span className="character-tile-name">{shortName}</span>
    </div>
  );
}
