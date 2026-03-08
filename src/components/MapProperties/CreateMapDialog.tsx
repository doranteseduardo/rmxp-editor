import { useState } from "react";
import type { MapInfo } from "../../types";
import "./MapPropertiesDialog.css";

interface Props {
  mapInfos: Record<number, MapInfo>;
  tilesetNames: Array<[number, string]>;
  defaultParentId: number;
  onConfirm: (name: string, parentId: number, width: number, height: number, tilesetId: number) => void;
  onClose: () => void;
}

/**
 * Modal dialog for creating a new map.
 */
export function CreateMapDialog({
  mapInfos,
  tilesetNames,
  defaultParentId,
  onConfirm,
  onClose,
}: Props) {
  const [name, setName] = useState("New Map");
  const [parentId, setParentId] = useState(defaultParentId);
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(15);
  const [tilesetId, setTilesetId] = useState(1);

  const handleOk = () => {
    if (name.trim()) {
      onConfirm(name.trim(), parentId, width, height, tilesetId);
    }
  };

  // Build flat parent options from map infos
  const parentOptions: { id: number; label: string }[] = [
    { id: 0, label: "(Root)" },
    ...Object.entries(mapInfos).map(([id, info]) => ({
      id: Number(id),
      label: `[${String(id).padStart(3, "0")}] ${info.name}`,
    })).sort((a, b) => a.id - b.id),
  ];

  return (
    <div className="map-props-overlay" onClick={onClose}>
      <div
        className="map-props-dialog"
        style={{ width: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="map-props-header">
          <h3>Create New Map</h3>
          <button className="map-props-close" onClick={onClose}>×</button>
        </div>

        <div className="map-props-body">
          <div className="map-props-row">
            <label>Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleOk(); }}
            />
          </div>
          <div className="map-props-row">
            <label>Parent</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(Number(e.target.value))}
            >
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="map-props-row-pair">
            <div className="map-props-row">
              <label>Width</label>
              <input
                type="number"
                min={1}
                max={500}
                value={width}
                onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="map-props-row">
              <label>Height</label>
              <input
                type="number"
                min={1}
                max={500}
                value={height}
                onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>
          <div className="map-props-row">
            <label>Tileset</label>
            <select
              value={tilesetId}
              onChange={(e) => setTilesetId(Number(e.target.value))}
            >
              {tilesetNames.map(([id, name]) => (
                <option key={id} value={id}>
                  {String(id).padStart(3, "0")}: {name || `Tileset ${id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="map-props-footer">
          <button
            className="map-props-btn map-props-btn-primary"
            onClick={handleOk}
            disabled={!name.trim()}
          >
            Create
          </button>
          <button className="map-props-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
