import { useState, useCallback } from "react";
import type { MoveRoute, MoveCommand } from "../../types";
import { MOVE_COMMAND_NAMES } from "../../services/eventCommands";
import { AssetPicker } from "../shared/AssetPicker";

interface Props {
  projectPath: string;
  moveRoute: MoveRoute;
  onChange: (route: MoveRoute) => void;
  onClose: () => void;
}

/** All move command codes grouped by category for the picker */
const MOVE_COMMAND_CATEGORIES: { name: string; commands: number[] }[] = [
  { name: "Movement", commands: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { name: "Wait", commands: [15] },
  { name: "Turn", commands: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { name: "Switch", commands: [27, 28] },
  { name: "Settings", commands: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
  { name: "Other", commands: [41, 42, 43, 44, 45] },
];

/**
 * Modal dialog for editing a move route.
 * Supports add/delete/reorder move commands and toggling route options.
 */
export function MoveRouteEditor({ projectPath, moveRoute, onChange, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showPicker, setShowPicker] = useState(false);

  const updateRoute = useCallback(
    (updater: (route: MoveRoute) => MoveRoute) => {
      onChange(updater(moveRoute));
    },
    [moveRoute, onChange]
  );

  const handleInsertCommand = useCallback(
    (code: number) => {
      const newCmd: MoveCommand = { code, parameters: getDefaultMoveParams(code) };
      // Insert before the selected item, or before the end marker
      const insertAt =
        selectedIndex >= 0 ? selectedIndex : moveRoute.list.length - 1;
      updateRoute((r) => {
        const list = [...r.list];
        list.splice(insertAt, 0, newCmd);
        return { ...r, list };
      });
      setSelectedIndex(insertAt);
      setShowPicker(false);
    },
    [moveRoute, selectedIndex, updateRoute]
  );

  const handleDeleteCommand = useCallback(
    (index: number) => {
      const cmd = moveRoute.list[index];
      if (cmd.code === 0) return; // Don't delete the end marker
      updateRoute((r) => {
        const list = [...r.list];
        list.splice(index, 1);
        return { ...r, list };
      });
      setSelectedIndex(Math.max(0, index - 1));
    },
    [moveRoute, updateRoute]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      updateRoute((r) => {
        const list = [...r.list];
        [list[index - 1], list[index]] = [list[index], list[index - 1]];
        return { ...r, list };
      });
      setSelectedIndex(index - 1);
    },
    [updateRoute]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= moveRoute.list.length - 2) return; // Can't move past end marker
      updateRoute((r) => {
        const list = [...r.list];
        [list[index], list[index + 1]] = [list[index + 1], list[index]];
        return { ...r, list };
      });
      setSelectedIndex(index + 1);
    },
    [moveRoute, updateRoute]
  );

  const handleParamEdit = useCallback(
    (index: number, paramIndex: number, value: unknown) => {
      updateRoute((r) => {
        const list = [...r.list];
        const cmd = { ...list[index], parameters: [...list[index].parameters] };
        cmd.parameters[paramIndex] = value;
        list[index] = cmd;
        return { ...r, list };
      });
    },
    [updateRoute]
  );

  const selectedCmd = selectedIndex >= 0 ? moveRoute.list[selectedIndex] : null;

  return (
    <div
      className="move-route-editor-overlay"
      onClick={(e) => {
        if (
          (e.target as HTMLElement).classList.contains(
            "move-route-editor-overlay"
          )
        ) {
          onClose();
        }
      }}
    >
      <div className="move-route-editor">
        <div className="move-route-editor-header">
          <h3>Move Route</h3>
          <button className="event-editor-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="move-route-editor-options">
          <label className="toolbar-check">
            <input
              type="checkbox"
              checked={moveRoute.repeat}
              onChange={(e) =>
                updateRoute((r) => ({ ...r, repeat: e.target.checked }))
              }
            />
            Repeat
          </label>
          <label className="toolbar-check">
            <input
              type="checkbox"
              checked={moveRoute.skippable}
              onChange={(e) =>
                updateRoute((r) => ({ ...r, skippable: e.target.checked }))
              }
            />
            Skippable
          </label>
        </div>

        <div className="move-route-editor-body">
          {/* Command list */}
          <div className="move-route-command-list">
            {moveRoute.list.map((cmd, i) => (
              <MoveCommandRow
                key={i}
                command={cmd}
                selected={selectedIndex === i}
                onClick={() => setSelectedIndex(i)}
                onDoubleClick={() => {
                  if (cmd.code === 0) setShowPicker(true);
                }}
              />
            ))}
          </div>

          {/* Inline param editor for selected command */}
          {selectedCmd && selectedCmd.code !== 0 && hasMoveParams(selectedCmd.code) && (
            <div className="move-route-param-editor">
              <MoveParamEditor
                projectPath={projectPath}
                command={selectedCmd}
                onChange={(paramIdx, value) =>
                  handleParamEdit(selectedIndex, paramIdx, value)
                }
              />
            </div>
          )}
        </div>

        <div className="move-route-editor-footer">
          <span style={{ fontSize: 11, color: "#6c7086" }}>
            {moveRoute.list.length - 1} command(s)
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className="event-editor-btn"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => setShowPicker(true)}
              title="Add command"
            >
              + Add
            </button>
            <button
              className="event-editor-btn"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => {
                if (selectedIndex >= 0) handleDeleteCommand(selectedIndex);
              }}
              disabled={
                selectedIndex < 0 || moveRoute.list[selectedIndex]?.code === 0
              }
              title="Delete selected"
            >
              Delete
            </button>
            <button
              className="event-editor-btn"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => handleMoveUp(selectedIndex)}
              disabled={selectedIndex <= 0 || moveRoute.list[selectedIndex]?.code === 0}
              title="Move up"
            >
              ▲
            </button>
            <button
              className="event-editor-btn"
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => handleMoveDown(selectedIndex)}
              disabled={
                selectedIndex < 0 ||
                selectedIndex >= moveRoute.list.length - 2 ||
                moveRoute.list[selectedIndex]?.code === 0
              }
              title="Move down"
            >
              ▼
            </button>
            <button className="event-editor-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Move Command Picker */}
      {showPicker && (
        <MoveCommandPicker
          onSelect={handleInsertCommand}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function MoveCommandRow({
  command,
  selected,
  onClick,
  onDoubleClick,
}: {
  command: MoveCommand;
  selected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}) {
  const name = MOVE_COMMAND_NAMES[command.code] ?? `Code ${command.code}`;

  if (command.code === 0) {
    return (
      <div
        className={`move-command-row cmd-end ${selected ? "selected" : ""}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    );
  }

  let paramStr = "";
  if (command.code === 14 && command.parameters.length >= 2) {
    paramStr = `(${command.parameters[0]}, ${command.parameters[1]})`;
  } else if (command.code === 15 && command.parameters.length >= 1) {
    paramStr = `${command.parameters[0]} frames`;
  } else if (command.code === 27 || command.code === 28) {
    paramStr = command.parameters.length >= 1 ? `[${command.parameters[0]}]` : "";
  } else if (command.code === 29 && command.parameters.length >= 1) {
    paramStr = `→ ${command.parameters[0]}`;
  } else if (command.code === 30 && command.parameters.length >= 1) {
    paramStr = `→ ${command.parameters[0]}`;
  } else if (command.code === 41 && command.parameters.length >= 2) {
    paramStr = `"${command.parameters[0]}", ${command.parameters[1]}`;
  } else if (command.code === 42 && command.parameters.length >= 1) {
    paramStr = `${command.parameters[0]}`;
  } else if (command.code === 43 && command.parameters.length >= 1) {
    const blendNames = ["Normal", "Add", "Sub"];
    paramStr = blendNames[command.parameters[0] as number] ?? String(command.parameters[0]);
  } else if (command.code === 44) {
    const audio = command.parameters[0] as { name?: string } | undefined;
    paramStr = audio?.name ?? "(none)";
  } else if (command.code === 45 && command.parameters.length >= 1) {
    paramStr = String(command.parameters[0]).substring(0, 50);
  }

  return (
    <div
      className={`move-command-row ${selected ? "selected" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="move-command-name">{name}</span>
      {paramStr && <span className="move-command-params">{paramStr}</span>}
    </div>
  );
}

// --- Move Command Picker ---

function MoveCommandPicker({
  onSelect,
  onClose,
}: {
  onSelect: (code: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="command-picker-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("command-picker-overlay")) {
          onClose();
        }
      }}
    >
      <div className="command-picker" style={{ width: 360, height: 400 }}>
        <div className="command-picker-header">
          <h3>Add Move Command</h3>
          <button className="event-editor-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="command-picker-list" style={{ flex: 1, overflow: "auto" }}>
          {MOVE_COMMAND_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <div className="command-picker-cat-header">{cat.name}</div>
              {cat.commands.map((code) => (
                <div
                  key={code}
                  className="command-picker-item"
                  onClick={() => onSelect(code)}
                >
                  <span className="command-picker-item-code">{code}</span>
                  <span className="command-picker-item-name">
                    {MOVE_COMMAND_NAMES[code] ?? `Code ${code}`}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Param editors for specific move commands ---

function hasMoveParams(code: number): boolean {
  return [14, 15, 27, 28, 29, 30, 41, 42, 43, 45].includes(code);
}

function MoveParamEditor({
  projectPath,
  command,
  onChange,
}: {
  projectPath: string;
  command: MoveCommand;
  onChange: (paramIndex: number, value: unknown) => void;
}) {
  const p = command.parameters;

  switch (command.code) {
    case 14: // Jump (x_plus, y_plus)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">X+:</span>
          <input type="number" className="prop-number-input" value={num(p[0])}
            onChange={(e) => onChange(0, Number(e.target.value))} />
          <span className="cmd-param-label">Y+:</span>
          <input type="number" className="prop-number-input" value={num(p[1])}
            onChange={(e) => onChange(1, Number(e.target.value))} />
        </div>
      );

    case 15: // Wait (frames)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Frames:</span>
          <input type="number" className="prop-number-input" value={num(p[0])} min={1}
            onChange={(e) => onChange(0, Number(e.target.value))} />
        </div>
      );

    case 27: // Switch ON (switch_id)
    case 28: // Switch OFF (switch_id)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Switch ID:</span>
          <input type="number" className="prop-number-input" value={num(p[0])} min={1}
            onChange={(e) => onChange(0, Number(e.target.value))} />
        </div>
      );

    case 29: // Change Speed (1-6)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Speed:</span>
          <input type="number" className="prop-number-input" value={num(p[0])} min={1} max={6}
            onChange={(e) => onChange(0, Number(e.target.value))} />
        </div>
      );

    case 30: // Change Frequency (1-6)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Frequency:</span>
          <input type="number" className="prop-number-input" value={num(p[0])} min={1} max={6}
            onChange={(e) => onChange(0, Number(e.target.value))} />
        </div>
      );

    case 41: // Change Graphic (character_name, character_hue, direction, pattern)
      return (
        <>
          <div className="cmd-param-row">
            <span className="cmd-param-label">Graphic:</span>
            <AssetPicker
              projectPath={projectPath}
              assetType="character"
              value={String(p[0] ?? "")}
              onChange={(v) => onChange(0, v)}
              noneLabel="(None)"
            />
          </div>
          <div className="cmd-param-row">
            <span className="cmd-param-label">Hue:</span>
            <input type="number" className="prop-number-input" value={num(p[1])} min={0} max={360}
              onChange={(e) => onChange(1, Number(e.target.value))} />
            <span className="cmd-param-label">Dir:</span>
            <select className="prop-select" value={num(p[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={2}>Down</option>
              <option value={4}>Left</option>
              <option value={6}>Right</option>
              <option value={8}>Up</option>
            </select>
            <span className="cmd-param-label">Pattern:</span>
            <input type="number" className="prop-number-input" value={num(p[3])} min={0} max={3}
              onChange={(e) => onChange(3, Number(e.target.value))} />
          </div>
        </>
      );

    case 42: // Change Opacity (0-255)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Opacity:</span>
          <input type="number" className="prop-number-input" value={num(p[0])} min={0} max={255}
            onChange={(e) => onChange(0, Number(e.target.value))} />
        </div>
      );

    case 43: // Change Blending (0=Normal, 1=Add, 2=Sub)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Blend:</span>
          <select className="prop-select" value={num(p[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
            <option value={0}>Normal</option>
            <option value={1}>Add</option>
            <option value={2}>Sub</option>
          </select>
        </div>
      );

    case 45: // Script (string)
      return (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Script:</span>
          <input className="event-command-edit-input" value={String(p[0] ?? "")}
            onChange={(e) => onChange(0, e.target.value)} style={{ flex: 1 }} />
        </div>
      );

    default:
      return null;
  }
}

function getDefaultMoveParams(code: number): unknown[] {
  switch (code) {
    case 14: return [0, 0]; // Jump
    case 15: return [4]; // Wait
    case 27: return [1]; // Switch ON
    case 28: return [1]; // Switch OFF
    case 29: return [4]; // Change Speed
    case 30: return [4]; // Change Freq
    case 41: return ["", 0, 2, 0]; // Change Graphic
    case 42: return [255]; // Change Opacity
    case 43: return [0]; // Change Blending
    case 44: return [{ __class: "RPG::AudioFile", name: "", volume: 80, pitch: 100 }]; // Play SE
    case 45: return [""]; // Script
    default: return [];
  }
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
