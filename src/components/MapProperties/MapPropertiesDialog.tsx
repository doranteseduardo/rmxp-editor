import { useEffect, useState } from "react";
import type { MapProperties } from "../../types";
import { getMapProperties, saveMapProperties } from "../../services/tauriApi";
import "./MapPropertiesDialog.css";

interface Props {
  projectPath: string;
  mapId: number;
  tilesetCount: number;
  onClose: () => void;
  onSaved: (props: MapProperties) => void;
}

const SCROLL_TYPES: Record<number, string> = {
  0: "No Looping",
  1: "Loop Vertically",
  2: "Loop Horizontally",
  3: "Loop Both",
};

/**
 * Modal dialog for editing map properties.
 * Loads properties from the backend, allows editing, and saves back.
 */
export function MapPropertiesDialog({
  projectPath,
  mapId,
  tilesetCount,
  onClose,
  onSaved,
}: Props) {
  const [props, setProps] = useState<MapProperties | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getMapProperties(projectPath, mapId);
        if (!cancelled) setProps(p);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectPath, mapId]);

  const handleSave = async () => {
    if (!props) return;
    try {
      setSaving(true);
      setError(null);
      await saveMapProperties(projectPath, props);
      onSaved(props);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof MapProperties>(key: K, value: MapProperties[K]) => {
    if (props) setProps({ ...props, [key]: value });
  };

  if (loading) {
    return (
      <div className="map-props-overlay" onClick={onClose}>
        <div className="map-props-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="map-props-loading">Loading map properties...</div>
        </div>
      </div>
    );
  }

  if (!props) {
    return (
      <div className="map-props-overlay" onClick={onClose}>
        <div className="map-props-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="map-props-error">{error || "Failed to load"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-props-overlay" onClick={onClose}>
      <div className="map-props-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="map-props-header">
          <h3>Map Properties — [{String(mapId).padStart(3, "0")}]</h3>
          <button className="map-props-close" onClick={onClose}>×</button>
        </div>

        <div className="map-props-body">
          {/* General */}
          <fieldset className="map-props-section">
            <legend>General</legend>
            <div className="map-props-row">
              <label>Name</label>
              <input
                type="text"
                value={props.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="map-props-row">
              <label>Tileset</label>
              <select
                value={props.tileset_id}
                onChange={(e) => update("tileset_id", Number(e.target.value))}
              >
                {Array.from({ length: tilesetCount }, (_, i) => i + 1).map((id) => (
                  <option key={id} value={id}>
                    Tileset {id}
                  </option>
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
                  value={props.width}
                  onChange={(e) => update("width", Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="map-props-row">
                <label>Height</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={props.height}
                  onChange={(e) => update("height", Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="map-props-row">
              <label>Scroll Type</label>
              <select
                value={props.scroll_type}
                onChange={(e) => update("scroll_type", Number(e.target.value))}
              >
                {Object.entries(SCROLL_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="map-props-row">
              <label>
                <input
                  type="checkbox"
                  checked={props.disable_dashing}
                  onChange={(e) => update("disable_dashing", e.target.checked)}
                />
                Disable Dashing
              </label>
            </div>
          </fieldset>

          {/* BGM */}
          <fieldset className="map-props-section">
            <legend>
              <label>
                <input
                  type="checkbox"
                  checked={props.autoplay_bgm}
                  onChange={(e) => update("autoplay_bgm", e.target.checked)}
                />
                Auto-Play BGM
              </label>
            </legend>
            {props.autoplay_bgm && (
              <>
                <div className="map-props-row">
                  <label>File</label>
                  <input
                    type="text"
                    value={props.bgm_name}
                    onChange={(e) => update("bgm_name", e.target.value)}
                    placeholder="BGM filename"
                  />
                </div>
                <div className="map-props-row-pair">
                  <div className="map-props-row">
                    <label>Volume</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={props.bgm_volume}
                      onChange={(e) => update("bgm_volume", Number(e.target.value))}
                    />
                  </div>
                  <div className="map-props-row">
                    <label>Pitch</label>
                    <input
                      type="number"
                      min={50}
                      max={150}
                      value={props.bgm_pitch}
                      onChange={(e) => update("bgm_pitch", Number(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}
          </fieldset>

          {/* BGS */}
          <fieldset className="map-props-section">
            <legend>
              <label>
                <input
                  type="checkbox"
                  checked={props.autoplay_bgs}
                  onChange={(e) => update("autoplay_bgs", e.target.checked)}
                />
                Auto-Play BGS
              </label>
            </legend>
            {props.autoplay_bgs && (
              <>
                <div className="map-props-row">
                  <label>File</label>
                  <input
                    type="text"
                    value={props.bgs_name}
                    onChange={(e) => update("bgs_name", e.target.value)}
                    placeholder="BGS filename"
                  />
                </div>
                <div className="map-props-row-pair">
                  <div className="map-props-row">
                    <label>Volume</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={props.bgs_volume}
                      onChange={(e) => update("bgs_volume", Number(e.target.value))}
                    />
                  </div>
                  <div className="map-props-row">
                    <label>Pitch</label>
                    <input
                      type="number"
                      min={50}
                      max={150}
                      value={props.bgs_pitch}
                      onChange={(e) => update("bgs_pitch", Number(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}
          </fieldset>

          {/* Encounters */}
          <fieldset className="map-props-section">
            <legend>Encounters</legend>
            <div className="map-props-row">
              <label>Encounter Step</label>
              <input
                type="number"
                min={1}
                max={999}
                value={props.encounter_step}
                onChange={(e) => update("encounter_step", Math.max(1, Number(e.target.value)))}
              />
            </div>
          </fieldset>

          {/* Parallax */}
          <fieldset className="map-props-section">
            <legend>Parallax Background</legend>
            <div className="map-props-row">
              <label>Image</label>
              <input
                type="text"
                value={props.parallax_name}
                onChange={(e) => update("parallax_name", e.target.value)}
                placeholder="Panorama filename"
              />
            </div>
            <div className="map-props-row">
              <label>
                <input
                  type="checkbox"
                  checked={props.parallax_show}
                  onChange={(e) => update("parallax_show", e.target.checked)}
                />
                Show in Editor
              </label>
            </div>
            <div className="map-props-row-pair">
              <div className="map-props-row">
                <label>
                  <input
                    type="checkbox"
                    checked={props.parallax_loop_x}
                    onChange={(e) => update("parallax_loop_x", e.target.checked)}
                  />
                  Loop X
                </label>
              </div>
              <div className="map-props-row">
                <label>
                  <input
                    type="checkbox"
                    checked={props.parallax_loop_y}
                    onChange={(e) => update("parallax_loop_y", e.target.checked)}
                  />
                  Loop Y
                </label>
              </div>
            </div>
            {(props.parallax_loop_x || props.parallax_loop_y) && (
              <div className="map-props-row-pair">
                {props.parallax_loop_x && (
                  <div className="map-props-row">
                    <label>Scroll X</label>
                    <input
                      type="number"
                      value={props.parallax_sx}
                      onChange={(e) => update("parallax_sx", Number(e.target.value))}
                    />
                  </div>
                )}
                {props.parallax_loop_y && (
                  <div className="map-props-row">
                    <label>Scroll Y</label>
                    <input
                      type="number"
                      value={props.parallax_sy}
                      onChange={(e) => update("parallax_sy", Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            )}
          </fieldset>
        </div>

        {error && <div className="map-props-error">{error}</div>}

        <div className="map-props-footer">
          <button
            className="map-props-btn map-props-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "OK"}
          </button>
          <button className="map-props-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
