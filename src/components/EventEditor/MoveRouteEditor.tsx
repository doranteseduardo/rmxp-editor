import { useState } from "react";
import type { MoveRoute, MoveCommand } from "../../types";
import { MOVE_COMMAND_NAMES } from "../../services/eventCommands";

interface Props {
  moveRoute: MoveRoute;
  onClose: () => void;
}

/**
 * Modal dialog for viewing/editing a move route.
 * Shows the list of move commands with their names and parameters.
 */
export function MoveRouteEditor({ moveRoute, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <div className="move-route-editor-overlay" onClick={(e) => {
      if ((e.target as HTMLElement).classList.contains("move-route-editor-overlay")) {
        onClose();
      }
    }}>
      <div className="move-route-editor">
        <div className="move-route-editor-header">
          <h3>Move Route</h3>
          <button className="event-editor-close" onClick={onClose}>×</button>
        </div>

        <div className="move-route-editor-options">
          <label className="toolbar-check">
            <input type="checkbox" checked={moveRoute.repeat} readOnly />
            Repeat
          </label>
          <label className="toolbar-check">
            <input type="checkbox" checked={moveRoute.skippable} readOnly />
            Skippable
          </label>
        </div>

        <div className="move-route-command-list">
          {moveRoute.list.map((cmd, i) => (
            <MoveCommandRow
              key={i}
              command={cmd}
              selected={selectedIndex === i}
              onClick={() => setSelectedIndex(i)}
            />
          ))}
        </div>

        <div className="move-route-editor-footer">
          <span style={{ fontSize: 11, color: "#6c7086" }}>
            {moveRoute.list.length - 1} command(s)
          </span>
          <button className="event-editor-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function MoveCommandRow({
  command,
  selected,
  onClick,
}: {
  command: MoveCommand;
  selected: boolean;
  onClick: () => void;
}) {
  const name = MOVE_COMMAND_NAMES[command.code] ?? `Code ${command.code}`;

  if (command.code === 0) {
    return (
      <div
        className={`move-command-row cmd-end ${selected ? "selected" : ""}`}
        onClick={onClick}
      />
    );
  }

  // Format parameters for specific commands
  let paramStr = "";
  if (command.code === 14 && command.parameters.length >= 2) {
    paramStr = `(${command.parameters[0]}, ${command.parameters[1]})`;
  } else if (command.code === 15 && command.parameters.length >= 1) {
    paramStr = `${command.parameters[0]} frames`;
  } else if (command.code === 29 && command.parameters.length >= 1) {
    paramStr = `→ ${command.parameters[0]}`;
  } else if (command.code === 30 && command.parameters.length >= 1) {
    paramStr = `→ ${command.parameters[0]}`;
  } else if (command.code === 41 && command.parameters.length >= 2) {
    paramStr = `"${command.parameters[0]}", ${command.parameters[1]}`;
  } else if (command.code === 42 && command.parameters.length >= 1) {
    paramStr = `${command.parameters[0]}`;
  } else if (command.code === 44) {
    const audio = command.parameters[0] as { name?: string } | undefined;
    paramStr = audio?.name ?? "(none)";
  } else if (command.code === 45 && command.parameters.length >= 1) {
    paramStr = String(command.parameters[0]).substring(0, 50);
  } else if (command.parameters.length > 0) {
    paramStr = command.parameters.map((p) => JSON.stringify(p)).join(", ");
  }

  return (
    <div
      className={`move-command-row ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <span className="move-command-name">{name}</span>
      {paramStr && <span className="move-command-params">{paramStr}</span>}
    </div>
  );
}
