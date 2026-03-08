import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RpgEvent,
  EventPage,
  EventCommand,
} from "../../types";
import {
  EVENT_TRIGGERS,
  MOVE_TYPES,
} from "../../types";
import {
  getCommandDef,
  summarizeCommand,
  MOVE_COMMAND_NAMES,
  type CommandDef,
} from "../../services/eventCommands";
import { loadEvent, saveEvent, loadSystemData } from "../../services/tauriApi";
import { useUndoable } from "../../hooks/useUndoable";
import { loadCharacterImage } from "../../services/imageLoader";
import { EventCommandPicker } from "./EventCommandPicker";
import { CommandParamEditor, hasParamEditor } from "./CommandParamEditor";
import { MoveRouteEditor } from "./MoveRouteEditor";
import { CharacterPicker } from "./CharacterPicker";
import { AssetPicker } from "../shared/AssetPicker";
import "./EventEditor.css";

interface Props {
  projectPath: string;
  mapId: number;
  eventId: number;
  /** Initial event name from EventInfo (shown before full data loads) */
  eventName: string;
  onClose: () => void;
  mapInfos?: Record<number, import("../../types").MapInfo>;
}

export function EventEditor({
  projectPath,
  mapId,
  eventId,
  eventName,
  onClose,
  mapInfos,
}: Props) {
  const { value: event, set: setEvent, setWithoutHistory, resetHistory, undo, redo, canUndo, canRedo } = useUndoable<RpgEvent>(null);
  const [activePage, setActivePage] = useState(0);
  const [selectedCommand, setSelectedCommand] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [editingCommand, setEditingCommand] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clipboard, setClipboard] = useState<EventCommand[] | null>(null);
  const [switchNames, setSwitchNames] = useState<string[]>([]);
  const [variableNames, setVariableNames] = useState<string[]>([]);

  // Load switch/variable names from System.rxdata
  useEffect(() => {
    let cancelled = false;
    loadSystemData(projectPath).then((sys) => {
      if (!cancelled) {
        setSwitchNames(sys.switches ?? []);
        setVariableNames(sys.variables ?? []);
      }
    }).catch(() => { /* ignore - names just won't show */ });
    return () => { cancelled = true; };
  }, [projectPath]);

  // Load full event data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadEvent(projectPath, mapId, eventId);
        if (!cancelled) {
          setWithoutHistory(data);
          resetHistory();
          setActivePage(0);
          setSelectedCommand(-1);
          setDirty(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectPath, mapId, eventId, setWithoutHistory, resetHistory]);

  const page: EventPage | null =
    event && event.pages[activePage] ? event.pages[activePage] : null;

  // --- Editing functions ---

  const updatePage = useCallback(
    (updater: (page: EventPage) => EventPage) => {
      if (!event) return;
      setEvent((prev) => {
        if (!prev) return prev;
        const pages = [...prev.pages];
        pages[activePage] = updater(pages[activePage]);
        return { ...prev, pages };
      });
      setDirty(true);
    },
    [event, activePage]
  );

  const handleInsertCommand = useCallback(
    (def: CommandDef) => {
      if (!page) return;
      const newCmd: EventCommand = {
        code: def.code,
        indent: selectedCommand >= 0 ? page.list[selectedCommand]?.indent ?? 0 : 0,
        parameters: getDefaultParams(def.code),
      };

      const insertAt = selectedCommand >= 0 ? selectedCommand + 1 : page.list.length - 1;
      updatePage((p) => {
        const list = [...p.list];
        list.splice(insertAt, 0, newCmd);
        return { ...p, list };
      });
      setSelectedCommand(insertAt);
      setShowPicker(false);
    },
    [page, selectedCommand, updatePage]
  );

  const handleDeleteCommand = useCallback(
    (index: number) => {
      if (!page) return;
      const cmd = page.list[index];
      if (cmd.code === 0) return;

      updatePage((p) => {
        const list = [...p.list];
        list.splice(index, 1);
        return { ...p, list };
      });
      setSelectedCommand(Math.max(0, index - 1));
    },
    [page, updatePage]
  );

  const handleUpdateCommandParam = useCallback(
    (index: number, paramIndex: number, value: unknown) => {
      updatePage((p) => {
        const list = [...p.list];
        const cmd = { ...list[index], parameters: [...list[index].parameters] };
        cmd.parameters[paramIndex] = value;
        list[index] = cmd;
        return { ...p, list };
      });
    },
    [updatePage]
  );

  // Save event to disk
  const handleSave = useCallback(async () => {
    if (!event || !dirty) return;
    try {
      setSaving(true);
      await saveEvent(projectPath, mapId, event);
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [event, dirty, projectPath, mapId]);

  // Close on Escape, Delete key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPicker) {
          setShowPicker(false);
        } else if (editingCommand !== null) {
          setEditingCommand(null);
        } else {
          onClose();
        }
      }
      if (e.key === "Delete" && selectedCommand >= 0 && event && !showPicker && editingCommand === null) {
        handleDeleteCommand(selectedCommand);
      }
      if (e.key === "Insert" && !showPicker && editingCommand === null) {
        setShowPicker(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Copy command
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedCommand >= 0 && page && editingCommand === null) {
        const cmd = page.list[selectedCommand];
        if (cmd && cmd.code !== 0) {
          setClipboard([{ ...cmd, parameters: [...cmd.parameters] }]);
        }
      }
      // Paste command
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard && clipboard.length > 0 && page && editingCommand === null) {
        e.preventDefault();
        const insertAt = selectedCommand >= 0 ? selectedCommand + 1 : page.list.length - 1;
        updatePage((p) => {
          const list = [...p.list];
          list.splice(insertAt, 0, ...clipboard.map((c) => ({ ...c, parameters: [...c.parameters] })));
          return { ...p, list };
        });
        setSelectedCommand(insertAt);
      }
      // Duplicate command (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedCommand >= 0 && page && editingCommand === null) {
        e.preventDefault();
        const cmd = page.list[selectedCommand];
        if (cmd && cmd.code !== 0) {
          updatePage((p) => {
            const list = [...p.list];
            list.splice(selectedCommand + 1, 0, { ...cmd, parameters: [...cmd.parameters] });
            return { ...p, list };
          });
          setSelectedCommand(selectedCommand + 1);
        }
      }
      // Undo (Ctrl+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && editingCommand === null) {
        e.preventDefault();
        undo();
        setDirty(true);
      }
      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey)) && editingCommand === null) {
        e.preventDefault();
        redo();
        setDirty(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, showPicker, editingCommand, selectedCommand, event, page, clipboard, handleDeleteCommand, handleSave, updatePage, undo, redo]);

  // Click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("event-editor-overlay")) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div className="event-editor-overlay" onClick={handleOverlayClick}>
      <div className="event-editor">
        {/* Header */}
        <div className="event-editor-header">
          <div>
            <h3>
              Event [{String(eventId).padStart(3, "0")}] {event?.name ?? eventName}
              {dirty && <span style={{ color: "#f9e2af", marginLeft: 8 }}>*</span>}
            </h3>
            <span className="event-editor-header-info">
              Map [{String(mapId).padStart(3, "0")}] · Position ({event?.x ?? "?"},{" "}
              {event?.y ?? "?"})
            </span>
          </div>
          <button className="event-editor-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Page tabs */}
        {event && (
          <div className="event-editor-pages">
            {event.pages.map((_p, i) => (
              <button
                key={i}
                className={`event-page-tab ${activePage === i ? "active" : ""}`}
                onClick={() => {
                  setActivePage(i);
                  setSelectedCommand(-1);
                  setEditingCommand(null);
                }}
              >
                Page {i + 1}
              </button>
            ))}
            <button
              className="event-page-tab event-page-tab-add"
              onClick={() => {
                if (!event) return;
                const newPage: EventPage = {
                  condition: { switch1_valid: false, switch2_valid: false, variable_valid: false, self_switch_valid: false, switch1_id: 1, switch2_id: 1, variable_id: 1, variable_value: 0, self_switch_ch: "A" },
                  graphic: { tile_id: 0, character_name: "", character_hue: 0, direction: 2, pattern: 0, opacity: 255, blend_type: 0 },
                  move_type: 0, move_speed: 3, move_frequency: 3,
                  move_route: { repeat: true, skippable: false, list: [{ code: 0, parameters: [] }] },
                  walk_anime: true, step_anime: false, direction_fix: false, through: false, always_on_top: false,
                  trigger: 0,
                  list: [{ code: 0, indent: 0, parameters: [] }],
                };
                setEvent({ ...event, pages: [...event.pages, newPage] });
                setActivePage(event.pages.length);
                setSelectedCommand(-1);
                setDirty(true);
              }}
              title="Add a new page"
            >
              +
            </button>
            {event.pages.length > 1 && (
              <button
                className="event-page-tab event-page-tab-remove"
                onClick={() => {
                  if (!event || event.pages.length <= 1) return;
                  const pages = event.pages.filter((_, i) => i !== activePage);
                  setEvent({ ...event, pages });
                  setActivePage(Math.min(activePage, pages.length - 1));
                  setSelectedCommand(-1);
                  setDirty(true);
                }}
                title="Remove current page"
              >
                −
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="event-editor-body">
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6c7086" }}>
              Loading event data...
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f38ba8" }}>
              {error}
            </div>
          ) : page ? (
            <>
              {/* Left: Page properties */}
              <div className="event-page-properties">
                <PageProperties page={page} onUpdatePage={updatePage} projectPath={projectPath} switchNames={switchNames} variableNames={variableNames} />
              </div>

              {/* Right: Command list */}
              <div className="event-command-panel">
                <div className="event-command-panel-header">
                  <span className="event-command-panel-title">
                    Event Commands ({page.list.length})
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="event-editor-btn"
                      style={{ padding: "3px 10px", fontSize: 11 }}
                      onClick={() => setShowPicker(true)}
                      title="Insert a new command (Ins)"
                    >
                      + Insert
                    </button>
                    <button
                      className="event-editor-btn"
                      style={{ padding: "3px 10px", fontSize: 11 }}
                      onClick={() => {
                        if (selectedCommand >= 0) handleDeleteCommand(selectedCommand);
                      }}
                      disabled={selectedCommand < 0 || page.list[selectedCommand]?.code === 0}
                      title="Delete selected command (Del)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="event-command-list">
                  {page.list.map((cmd, i) => (
                    <CommandRow
                      key={i}
                      command={cmd}
                      index={i}
                      selected={selectedCommand === i}
                      editing={editingCommand === i}
                      onClick={() => setSelectedCommand(i)}
                      onDoubleClick={() => {
                        if (cmd.code !== 0) {
                          setEditingCommand(i);
                        }
                      }}
                      onParamChange={(paramIdx, value) =>
                        handleUpdateCommandParam(i, paramIdx, value)
                      }
                      onStopEditing={() => setEditingCommand(null)}
                      mapInfos={mapInfos}
                      switchNames={switchNames}
                      variableNames={variableNames}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6c7086" }}>
              No pages defined
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="event-editor-footer">
          <span style={{ fontSize: 10, color: "#6c7086" }}>
            Dbl-click edit · Del/Ins · Ctrl+Z undo · Ctrl+Y redo · Ctrl+S save
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="event-editor-btn"
              onClick={() => { undo(); setDirty(true); }}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{ padding: "6px 10px" }}
            >
              ↩
            </button>
            <button
              className="event-editor-btn"
              onClick={() => { redo(); setDirty(true); }}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              style={{ padding: "6px 10px" }}
            >
              ↪
            </button>
            <button
              className="event-editor-btn event-editor-btn-primary"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="event-editor-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Command Picker Dialog */}
      {showPicker && (
        <EventCommandPicker
          onSelect={handleInsertCommand}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function PageProperties({ page, onUpdatePage, projectPath, switchNames, variableNames }: { page: EventPage; onUpdatePage: (updater: (p: EventPage) => EventPage) => void; projectPath: string; switchNames: string[]; variableNames: string[] }) {
  const [showMoveRoute, setShowMoveRoute] = useState(false);
  const [showCharPicker, setShowCharPicker] = useState(false);

  const updateCondition = (field: string, value: unknown) => {
    onUpdatePage((p) => ({
      ...p,
      condition: { ...p.condition, [field]: value },
    }));
  };

  const updateGraphic = (field: string, value: unknown) => {
    onUpdatePage((p) => ({
      ...p,
      graphic: { ...p.graphic, [field]: value },
    }));
  };

  return (
    <>
      {/* Conditions */}
      <div className="prop-section">
        <div className="prop-section-title">Conditions</div>
        <EditableCondition
          active={page.condition.switch1_valid}
          onToggle={() => updateCondition("switch1_valid", !page.condition.switch1_valid)}
          label="Switch 1"
        >
          <NamedIdSelector
            value={page.condition.switch1_id}
            onChange={(v) => updateCondition("switch1_id", v)}
            names={switchNames}
            label="Switch"
          />
        </EditableCondition>
        <EditableCondition
          active={page.condition.switch2_valid}
          onToggle={() => updateCondition("switch2_valid", !page.condition.switch2_valid)}
          label="Switch 2"
        >
          <NamedIdSelector
            value={page.condition.switch2_id}
            onChange={(v) => updateCondition("switch2_id", v)}
            names={switchNames}
            label="Switch"
          />
        </EditableCondition>
        <EditableCondition
          active={page.condition.variable_valid}
          onToggle={() => updateCondition("variable_valid", !page.condition.variable_valid)}
          label="Variable"
        >
          <NamedIdSelector
            value={page.condition.variable_id}
            onChange={(v) => updateCondition("variable_id", v)}
            names={variableNames}
            label="Variable"
          />
          <span style={{ color: "#6c7086", fontSize: 10 }}>&gt;=</span>
          <NumberInput value={page.condition.variable_value} onChange={(v) => updateCondition("variable_value", v)} />
        </EditableCondition>
        <EditableCondition
          active={page.condition.self_switch_valid}
          onToggle={() => updateCondition("self_switch_valid", !page.condition.self_switch_valid)}
          label="Self Switch"
        >
          <select
            className="prop-select"
            value={page.condition.self_switch_ch}
            onChange={(e) => updateCondition("self_switch_ch", e.target.value)}
          >
            {["A", "B", "C", "D"].map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </EditableCondition>
      </div>

      {/* Graphic */}
      <div className="prop-section">
        <div className="prop-section-title">Graphic</div>
        <div className="prop-row">
          <div
            className="event-graphic-preview"
            onClick={() => setShowCharPicker(true)}
            style={{ cursor: "pointer" }}
            title="Click to change graphic"
          >
            <SpritePreview
              projectPath={projectPath}
              characterName={page.graphic.character_name}
              direction={page.graphic.direction}
              tileId={page.graphic.tile_id}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
              <AssetPicker
                projectPath={projectPath}
                assetType="character"
                value={page.graphic.character_name}
                onChange={(v) => updateGraphic("character_name", v)}
                noneLabel="(no graphic)"
                className="prop-select"
              />
              <button
                className="event-editor-btn"
                style={{ padding: "2px 6px", fontSize: 10 }}
                onClick={() => setShowCharPicker(true)}
                title="Browse characters"
              >
                …
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#6c7086" }}>Dir:</span>
              <select
                className="prop-select"
                value={page.graphic.direction}
                onChange={(e) => updateGraphic("direction", Number(e.target.value))}
              >
                <option value={2}>Down</option>
                <option value={4}>Left</option>
                <option value={6}>Right</option>
                <option value={8}>Up</option>
              </select>
              <span style={{ fontSize: 10, color: "#6c7086" }}>Opacity:</span>
              <NumberInput value={page.graphic.opacity} onChange={(v) => updateGraphic("opacity", v)} min={0} max={255} />
            </div>
          </div>
        </div>
        {showCharPicker && (
          <CharacterPicker
            projectPath={projectPath}
            currentName={page.graphic.character_name}
            currentDirection={page.graphic.direction}
            onSelect={(name) => updateGraphic("character_name", name)}
            onClose={() => setShowCharPicker(false)}
          />
        )}
      </div>

      {/* Movement */}
      <div className="prop-section">
        <div className="prop-section-title">Movement</div>
        <div className="prop-row">
          <span className="prop-label">Type</span>
          <select
            className="prop-select"
            value={page.move_type}
            onChange={(e) => onUpdatePage((p) => ({ ...p, move_type: Number(e.target.value) }))}
          >
            {Object.entries(MOVE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="prop-row">
          <span className="prop-label">Speed</span>
          <NumberInput
            value={page.move_speed}
            onChange={(v) => onUpdatePage((p) => ({ ...p, move_speed: v }))}
            min={1} max={6}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Frequency</span>
          <NumberInput
            value={page.move_frequency}
            onChange={(v) => onUpdatePage((p) => ({ ...p, move_frequency: v }))}
            min={1} max={6}
          />
        </div>

        {page.move_type === 3 && (
          <>
            <button
              className="event-editor-btn"
              style={{ padding: "3px 8px", fontSize: 10, marginTop: 4, width: "100%" }}
              onClick={() => setShowMoveRoute(true)}
            >
              Edit Move Route ({page.move_route.list.length - 1} cmd{page.move_route.list.length - 1 !== 1 ? "s" : ""})
            </button>
            {page.move_route.list.length > 1 && (
              <div className="move-route-list">
                {page.move_route.list.slice(0, 5).map((mc, i) =>
                  mc.code === 0 ? null : (
                    <div key={i} className="move-route-item">
                      {MOVE_COMMAND_NAMES[mc.code] ?? `Code ${mc.code}`}
                    </div>
                  )
                )}
                {page.move_route.list.length > 6 && (
                  <div className="move-route-item" style={{ color: "#6c7086" }}>
                    ...and {page.move_route.list.length - 6} more
                  </div>
                )}
              </div>
            )}
            {showMoveRoute && (
              <MoveRouteEditor
                projectPath={projectPath}
                moveRoute={page.move_route}
                onChange={(route) => onUpdatePage((p) => ({ ...p, move_route: route }))}
                onClose={() => setShowMoveRoute(false)}
              />
            )}
          </>
        )}
      </div>

      {/* Options */}
      <div className="prop-section">
        <div className="prop-section-title">Options</div>
        {(
          [
            ["walk_anime", "Walk Anime"],
            ["step_anime", "Step Anime"],
            ["direction_fix", "Direction Fix"],
            ["through", "Through"],
            ["always_on_top", "Always on Top"],
          ] as [keyof EventPage, string][]
        ).map(([field, label]) => (
          <div className="prop-row" key={field}>
            <span className="prop-label">{label}</span>
            <ToggleBadge
              on={page[field] as boolean}
              onToggle={() => onUpdatePage((p) => ({ ...p, [field]: !p[field] }))}
            />
          </div>
        ))}
      </div>

      {/* Trigger */}
      <div className="prop-section">
        <div className="prop-section-title">Trigger</div>
        <div className="prop-row">
          <select
            className="prop-select prop-select-wide"
            value={page.trigger}
            onChange={(e) => onUpdatePage((p) => ({ ...p, trigger: Number(e.target.value) }))}
          >
            {Object.entries(EVENT_TRIGGERS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

/** Renders a character sprite preview in a small canvas */
function SpritePreview({
  projectPath,
  characterName,
  direction,
  tileId,
}: {
  projectPath: string;
  characterName: string;
  direction: number;
  tileId: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!characterName || !canvasRef.current) {
      setError(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const img = await loadCharacterImage(projectPath, characterName);
        if (cancelled || !img || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const displaySize = 46;
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;
        ctx.imageSmoothingEnabled = false;

        const isSingle = img.width <= 32 && img.height <= 32;
        const cols = isSingle ? 1 : 4;
        const rows = isSingle ? 1 : 4;
        const frameW = img.width / cols;
        const frameH = img.height / rows;

        const dirRow: Record<number, number> = { 2: 0, 4: 1, 6: 2, 8: 3 };
        const row = isSingle ? 0 : (dirRow[direction] ?? 0);
        const col = isSingle ? 0 : 1;

        const srcX = col * frameW;
        const srcY = row * frameH;

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
        setError(false);
      } catch {
        setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [projectPath, characterName, direction]);

  if (!characterName) {
    if (tileId > 0) {
      return <span>Tile {tileId}</span>;
    }
    return <span>(none)</span>;
  }

  if (error) {
    return (
      <span style={{ fontSize: 8, textAlign: "center", padding: 2 }}>
        {characterName.split("_").pop()}
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function EditableCondition({
  active,
  onToggle,
  label,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="condition-item">
      <div
        className={`condition-indicator ${active ? "condition-active" : "condition-inactive"}`}
        onClick={onToggle}
        style={{ cursor: "pointer" }}
        title="Click to toggle"
      />
      <input
        type="checkbox"
        checked={active}
        onChange={onToggle}
        style={{ margin: 0, accentColor: "#a6e3a1" }}
      />
      <span style={{ color: active ? "#cdd6f4" : "#6c7086", fontSize: 11, minWidth: 60 }}>{label}</span>
      {active && <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{children}</span>}
    </div>
  );
}

function ToggleBadge({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <span
      className={`prop-badge ${on ? "prop-badge-on" : "prop-badge-off"}`}
      onClick={onToggle}
      style={{ cursor: "pointer", userSelect: "none" }}
      title="Click to toggle"
    >
      {on ? "ON" : "OFF"}
    </span>
  );
}

/** Dropdown selector that shows [0001] Name entries for switches/variables */
function NamedIdSelector({
  value,
  onChange,
  names,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  names: string[];
  label: string;
}) {
  // If names available (length > 1, since index 0 is always empty), show dropdown
  if (names.length > 1) {
    return (
      <select
        className="prop-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 100, maxWidth: 200, fontSize: 10 }}
      >
        {names.map((name, i) => {
          if (i === 0) return null; // skip index 0
          return (
            <option key={i} value={i}>
              [{String(i).padStart(4, "0")}] {name || `${label} ${i}`}
            </option>
          );
        })}
      </select>
    );
  }
  // Fallback to number input
  return (
    <input
      type="number"
      className="prop-number-input"
      value={value}
      min={1}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      className="prop-number-input"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function CommandRow({
  command,
  index: _index,
  selected,
  editing,
  onClick,
  onDoubleClick,
  onParamChange,
  onStopEditing,
  mapInfos,
  switchNames,
  variableNames,
}: {
  command: EventCommand;
  index: number;
  selected: boolean;
  editing: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onParamChange: (paramIndex: number, value: unknown) => void;
  onStopEditing: () => void;
  mapInfos?: Record<number, import("../../types").MapInfo>;
  switchNames?: string[];
  variableNames?: string[];
}) {
  const def = getCommandDef(command.code);
  const summary = summarizeCommand(command.code, command.parameters, mapInfos, switchNames, variableNames);

  let rowClass = "event-command-row";
  if (selected) rowClass += " selected";
  if (def.isContinuation) rowClass += " cmd-continuation";
  if (def.isBranchEnd) rowClass += " cmd-branch-end";
  if (command.code === 0) rowClass += " cmd-end";
  if (command.code === 108 || command.code === 408) rowClass += " cmd-comment";
  if (command.code === 355 || command.code === 655) rowClass += " cmd-script";
  if (
    command.code === 111 ||
    command.code === 112 ||
    command.code === 411 ||
    command.code === 113 ||
    command.code === 115
  ) {
    rowClass += " cmd-flow";
  }

  const icon = getCommandIcon(command.code);

  // Inline editing for simple text-based commands
  if (editing && isTextEditableCommand(command.code)) {
    return (
      <div className={rowClass + " editing"} onClick={onClick}>
        <span className="event-command-indent">
          {Array.from({ length: command.indent }, (_, i) => (
            <span key={i} className="event-command-indent-bar" />
          ))}
        </span>
        <span className="event-command-icon">{icon}</span>
        <span className="event-command-name">{def.name}</span>
        <input
          className="event-command-edit-input"
          defaultValue={String(command.parameters[0] ?? "")}
          autoFocus
          onBlur={(e) => {
            onParamChange(0, e.target.value);
            onStopEditing();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onParamChange(0, (e.target as HTMLInputElement).value);
              onStopEditing();
            }
            if (e.key === "Escape") {
              onStopEditing();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  // Rich parameter editor for complex commands
  if (editing && hasParamEditor(command.code)) {
    return (
      <div>
        <div className={rowClass + " editing"} onClick={onClick}>
          <span className="event-command-indent">
            {Array.from({ length: command.indent }, (_, i) => (
              <span key={i} className="event-command-indent-bar" />
            ))}
          </span>
          <span className="event-command-icon">{icon}</span>
          <span className="event-command-name">{def.name}</span>
          <span className="event-command-params">{summary}</span>
        </div>
        <CommandParamEditor
          command={command}
          onChange={onParamChange}
          onDone={onStopEditing}
          mapInfos={mapInfos}
          switchNames={switchNames}
          variableNames={variableNames}
        />
      </div>
    );
  }

  return (
    <div className={rowClass} onClick={onClick} onDoubleClick={onDoubleClick}>
      <span className="event-command-indent">
        {Array.from({ length: command.indent }, (_, i) => (
          <span key={i} className="event-command-indent-bar" />
        ))}
      </span>
      <span className="event-command-icon">{icon}</span>
      <span className="event-command-name">
        {command.code === 0 ? "" : def.name}
      </span>
      <span className="event-command-params">
        {command.code === 0 ? "" : summary}
      </span>
    </div>
  );
}

/** Commands that have a single text parameter that can be inline-edited */
function isTextEditableCommand(code: number): boolean {
  return (
    code === 101 || // Show Text
    code === 401 || // Text continuation
    code === 108 || // Comment
    code === 408 || // Comment continuation
    code === 118 || // Label
    code === 119 || // Jump to Label
    code === 355 || // Script
    code === 655    // Script continuation
  );
}

/** Get default parameters for a new command */
function getDefaultParams(code: number): unknown[] {
  switch (code) {
    case 101: return [""];
    case 108: return [""];
    case 111: return [0, 1, 0]; // Conditional: Switch [1] == ON
    case 117: return [1]; // Call Common Event 1
    case 118: return ["label"]; // Label
    case 119: return ["label"]; // Jump to Label
    case 121: return [1, 1, 0]; // Control Switches: [1] = ON
    case 122: return [1, 1, 0, 0, 0]; // Control Variables
    case 123: return ["A", 0]; // Self Switch A = ON
    case 201: return [0, 1, 0, 0, 0]; // Transfer: Map 1 (0,0)
    case 241: return [{ __class: "RPG::AudioFile", name: "", volume: 100, pitch: 100 }];
    case 250: return [{ __class: "RPG::AudioFile", name: "", volume: 80, pitch: 100 }];
    case 355: return [""];
    default: return [];
  }
}

function getCommandIcon(code: number): string {
  if (code === 0) return "";
  if (code === 108 || code === 408) return "//";
  if (code === 101 || code === 401) return "T";
  if (code === 102) return "?";
  if (code === 111 || code === 411 || code === 412) return "\u25C7";
  if (code === 112 || code === 413) return "\u21BB";
  if (code === 113 || code === 115) return "\u23F9";
  if (code === 121 || code === 122 || code === 123) return "=";
  if (code >= 201 && code <= 210) return "\u25B6";
  if (code >= 221 && code <= 236) return "\u25D0";
  if (code >= 241 && code <= 251) return "\u266A";
  if (code === 355 || code === 655) return "{}";
  if (code >= 301 && code <= 340) return "\u2694";
  return "\u2022";
}
