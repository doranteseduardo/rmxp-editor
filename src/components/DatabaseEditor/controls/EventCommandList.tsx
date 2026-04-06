/**
 * EventCommandList — fully featured event command editor for the database.
 *
 * Reuses the same CommandRow, CommandParamEditor, and EventCommandPicker
 * components from the map event editor so common events and troop battle
 * events get the identical editing experience.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  getCommandDef,
  summarizeCommand,
  MOVE_COMMAND_NAMES,
  type CommandDef,
} from "../../../services/eventCommands";
import { CommandParamEditor, hasParamEditor } from "../../EventEditor/CommandParamEditor";
import { EventCommandPicker } from "../../EventEditor/EventCommandPicker";
import "../../EventEditor/EventEditor.css";

interface EventCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

interface Props {
  commands: EventCommand[];
  /** Called when commands change — if omitted, list is read-only */
  onChange?: (commands: EventCommand[]) => void;
  /** Max height before scroll */
  maxHeight?: number;
}

/** Get default parameters for a new command */
function getDefaultParams(code: number): unknown[] {
  switch (code) {
    case 101: return [""];
    case 102: return [["Yes", "No"], 2];
    case 103: return [1, 1];
    case 104: return [2, 0];
    case 105: return [1];
    case 106: return [10];
    case 108: return [""];
    case 111: return [0, 1, 0];
    case 112: return [];
    case 113: return [];
    case 115: return [];
    case 116: return [];
    case 117: return [1];
    case 118: return ["label"];
    case 119: return ["label"];
    case 121: return [1, 1, 0];
    case 122: return [1, 1, 0, 0, 0];
    case 123: return ["A", 0];
    case 124: return [0, 0];
    case 125: return [0, 0, 0];
    case 126: return [1, 0, 0, 1];
    case 127: return [1, 0, 0, 1];
    case 128: return [1, 0, 0, 1];
    case 129: return [1, 0];
    case 131: return [""];
    case 132: case 133: return [{ __class: "RPG::AudioFile", name: "", volume: 100, pitch: 100 }];
    case 134: case 135: case 136: return [0];
    case 201: return [0, 1, 0, 0, 0];
    case 209: return [0, { __class: "RPG::MoveRoute", repeat: true, skippable: false, list: [{ __class: "RPG::MoveCommand", code: 0, parameters: [] }] }];
    case 221: return [];
    case 222: return [""];
    case 223: return [{ __class: "Tone", red: 0, green: 0, blue: 0, gray: 0 }, 20];
    case 224: return [{ __class: "Color", red: 255, green: 255, blue: 255, alpha: 170 }, 5];
    case 225: return [5, 5, 20];
    case 231: return [1, "", 0, 0, 0, 0, 100, 100, 255, 0];
    case 241: case 245: case 249: case 250: return [{ __class: "RPG::AudioFile", name: "", volume: 80, pitch: 100 }];
    case 242: case 246: return [2];
    case 301: return [1, false, false];
    case 302: return [0, 1, 0];
    case 303: return [1, 8];
    case 311: return [1, 0, 0, 100, false];
    case 312: return [1, 0, 0, 50];
    case 313: return [1, 0, 1];
    case 314: return [0];
    case 315: return [1, 0, 0, 100];
    case 316: return [1, 0, 0, 1];
    case 317: return [1, 0, 0, 0, 10];
    case 318: return [1, 0, 1];
    case 319: return [1, 0, 0];
    case 320: return [1, ""];
    case 321: return [1, 1];
    case 322: return [1, "", 0, "", 0];
    case 355: return [""];
    default:  return [];
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

function isTextEditableCommand(code: number): boolean {
  return (
    code === 101 || code === 401 ||
    code === 108 || code === 408 ||
    code === 118 || code === 119 ||
    code === 355 || code === 655
  );
}

const PARENT_CONT: Record<number, number> = { 101: 401, 108: 408, 355: 655 };

type VisualBlock =
  | { kind: "single"; rawIndex: number; cmd: EventCommand }
  | { kind: "multi"; rawIndex: number; cmd: EventCommand; contIndices: number[]; contCmds: EventCommand[] };

function toVisualBlocks(list: EventCommand[]): VisualBlock[] {
  const blocks: VisualBlock[] = [];
  let i = 0;
  while (i < list.length) {
    const cmd = list[i];
    const contCode = PARENT_CONT[cmd.code];
    if (contCode !== undefined) {
      const contIndices: number[] = [];
      const contCmds: EventCommand[] = [];
      let j = i + 1;
      while (j < list.length && list[j].code === contCode) {
        contIndices.push(j);
        contCmds.push(list[j]);
        j++;
      }
      if (contIndices.length > 0) {
        blocks.push({ kind: "multi", rawIndex: i, cmd, contIndices, contCmds });
        i = j;
        continue;
      }
    }
    blocks.push({ kind: "single", rawIndex: i, cmd });
    i++;
  }
  return blocks;
}

function getBlockEnd(list: EventCommand[], index: number): number {
  const contCode = PARENT_CONT[list[index]?.code ?? -1];
  if (contCode === undefined) return index;
  let j = index + 1;
  while (j < list.length && list[j].code === contCode) j++;
  return j - 1;
}

function MultiLineBlock({
  block,
  selected,
  editing,
  editable,
  onSelect,
  onStartEdit,
  onUpdateLines,
  onStopEditing,
}: {
  block: Extract<VisualBlock, { kind: "multi" }>;
  selected: boolean;
  editing: boolean;
  editable: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onUpdateLines: (lines: string[]) => void;
  onStopEditing: () => void;
}) {
  const def = getCommandDef(block.cmd.code);
  const icon = getCommandIcon(block.cmd.code);
  const allLines = [
    String(block.cmd.parameters[0] ?? ""),
    ...block.contCmds.map((c) => String(c.parameters[0] ?? "")),
  ];
  const isComment = block.cmd.code === 108;
  const isScript = block.cmd.code === 355;

  let blockClass = "event-command-block";
  if (selected) blockClass += " selected";
  if (editing) blockClass += " editing";

  let rowClass = "event-command-row";
  if (selected) rowClass += " selected";
  if (isComment) rowClass += " cmd-comment";
  if (isScript) rowClass += " cmd-script";

  const indentBars = Array.from({ length: block.cmd.indent }, (_, i) => (
    <span key={i} className="event-command-indent-bar" />
  ));

  if (editing && editable) {
    return (
      <div className={blockClass} onClick={(e) => e.stopPropagation()}>
        <div className={rowClass} onClick={onSelect}>
          <span className="event-command-indent">{indentBars}</span>
          <span className="event-command-icon">{icon}</span>
          <span className="event-command-name">{def.name}</span>
        </div>
        <div style={{ padding: "2px 12px 4px 34px" }}>
          <textarea
            className="event-command-edit-textarea"
            defaultValue={allLines.join("\n")}
            autoFocus
            rows={Math.max(2, allLines.length + 1)}
            onBlur={(e) => {
              const lines = e.target.value.split("\n");
              onUpdateLines(lines.length > 0 ? lines : [""]);
              onStopEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { onStopEditing(); e.preventDefault(); e.stopPropagation(); }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={blockClass} onClick={onSelect} onDoubleClick={editable ? onStartEdit : undefined}>
      <div className={rowClass} style={{ background: "transparent" }}>
        <span className="event-command-indent">{indentBars}</span>
        <span className="event-command-icon">{icon}</span>
        <span className="event-command-name">{def.name}</span>
        <span className="event-command-params">{allLines[0]}</span>
      </div>
      {allLines.slice(1).map((line, idx) => (
        <div key={idx} className={`event-command-cont-line${isComment ? " cmd-comment" : isScript ? " cmd-script" : ""}`}>
          {line}
        </div>
      ))}
    </div>
  );
}

/* ─── CommandRow (same as map editor) ──────────────────────────── */

function CommandRow({
  command,
  selected,
  editing,
  onClick,
  onDoubleClick,
  onParamChange,
  onStopEditing,
}: {
  command: EventCommand;
  selected: boolean;
  editing: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onParamChange: (paramIndex: number, value: unknown) => void;
  onStopEditing: () => void;
}) {
  const def = getCommandDef(command.code);
  let summary = "";
  try {
    summary = summarizeCommand(command.code, command.parameters);
  } catch {
    summary = `[${command.code}]`;
  }

  let rowClass = "event-command-row";
  if (selected) rowClass += " selected";
  if (def.isContinuation) rowClass += " cmd-continuation";
  if (def.isBranchEnd) rowClass += " cmd-branch-end";
  if (command.code === 0) rowClass += " cmd-end";
  if (command.code === 108 || command.code === 408) rowClass += " cmd-comment";
  if (command.code === 355 || command.code === 655) rowClass += " cmd-script";
  if (command.code === 111 || command.code === 112 || command.code === 411 || command.code === 113 || command.code === 115) {
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

/* ─── Main Component ───────────────────────────────────────────── */

export function EventCommandList({ commands, onChange, maxHeight = 400 }: Props) {
  const [selectedCommand, setSelectedCommand] = useState(-1);
  const [editingCommand, setEditingCommand] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [clipboard, setClipboard] = useState<EventCommand[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const editable = !!onChange;

  // --- Editing functions ---

  const handleInsertCommand = useCallback((def: CommandDef) => {
    if (!onChange) return;
    const indent = selectedCommand >= 0 ? commands[selectedCommand]?.indent ?? 0 : 0;
    const newCmd: EventCommand = {
      code: def.code,
      indent,
      parameters: def.defaultParams ?? getDefaultParams(def.code),
    };
    const insertAt = selectedCommand >= 0
      ? getBlockEnd(commands, selectedCommand) + 1
      : commands.length - 1;
    const copy = [...commands];
    copy.splice(insertAt, 0, newCmd);
    onChange(copy);
    setSelectedCommand(insertAt);
    setShowPicker(false);
  }, [onChange, commands, selectedCommand]);

  const handleDeleteCommand = useCallback((index: number) => {
    if (!onChange) return;
    const cmd = commands[index];
    if (!cmd || cmd.code === 0) return;
    const blockEnd = getBlockEnd(commands, index);
    const deleteCount = blockEnd - index + 1;
    const copy = [...commands];
    copy.splice(index, deleteCount);
    onChange(copy);
    setSelectedCommand(Math.max(0, index - 1));
    setEditingCommand(null);
  }, [onChange, commands]);

  const handleUpdateCommandParam = useCallback((index: number, paramIndex: number, value: unknown) => {
    if (!onChange) return;
    const copy = [...commands];
    const cmd = { ...copy[index], parameters: [...copy[index].parameters] };
    cmd.parameters[paramIndex] = value;
    copy[index] = cmd;
    onChange(copy);
  }, [onChange, commands]);

  // Keyboard shortcuts (scoped to this component via ref focus)
  useEffect(() => {
    if (!editable) return;
    const el = listRef.current;
    if (!el) return;

    const handleKey = (e: KeyboardEvent) => {
      // Only handle when this component or a child has focus
      if (!el.contains(document.activeElement) && document.activeElement !== el) return;

      if (e.key === "Delete" && selectedCommand >= 0 && editingCommand === null) {
        handleDeleteCommand(selectedCommand);
      }
      if (e.key === "Insert" && !showPicker && editingCommand === null) {
        setShowPicker(true);
      }
      if (e.key === "Escape") {
        if (showPicker) setShowPicker(false);
        else if (editingCommand !== null) setEditingCommand(null);
      }
      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedCommand >= 0 && editingCommand === null) {
        const cmd = commands[selectedCommand];
        if (cmd && cmd.code !== 0) {
          setClipboard([{ ...cmd, parameters: [...cmd.parameters] }]);
        }
      }
      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard && clipboard.length > 0 && editingCommand === null) {
        e.preventDefault();
        const insertAt = selectedCommand >= 0 ? selectedCommand + 1 : commands.length - 1;
        const copy = [...commands];
        copy.splice(insertAt, 0, ...clipboard.map(c => ({ ...c, parameters: [...c.parameters] })));
        onChange!(copy);
        setSelectedCommand(insertAt);
      }
      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedCommand >= 0 && editingCommand === null) {
        e.preventDefault();
        const cmd = commands[selectedCommand];
        if (cmd && cmd.code !== 0) {
          const copy = [...commands];
          copy.splice(selectedCommand + 1, 0, { ...cmd, parameters: [...cmd.parameters] });
          onChange!(copy);
          setSelectedCommand(selectedCommand + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editable, selectedCommand, editingCommand, showPicker, commands, clipboard, onChange, handleDeleteCommand]);

  if (commands.length === 0 && !editable) {
    return <div style={{ padding: 6, fontSize: 11, color: "#8c8fa1" }}>Empty event list</div>;
  }

  return (
    <div ref={listRef} tabIndex={-1} style={{ outline: "none" }}>
      {/* Header toolbar */}
      {editable && (
        <div className="event-command-panel-header" style={{ padding: "4px 8px" }}>
          <span className="event-command-panel-title" style={{ fontSize: 11 }}>
            Event Commands ({commands.length})
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className="event-editor-btn"
              style={{ padding: "2px 8px", fontSize: 10 }}
              onClick={() => setShowPicker(true)}
              title="Insert a new command (Ins)"
            >
              + Insert
            </button>
            <button
              className="event-editor-btn"
              style={{ padding: "2px 8px", fontSize: 10 }}
              onClick={() => { if (selectedCommand >= 0) handleDeleteCommand(selectedCommand); }}
              disabled={selectedCommand < 0 || commands[selectedCommand]?.code === 0}
              title="Delete selected command (Del)"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Command list */}
      <div className="event-command-list" style={{ maxHeight, fontFamily: "monospace", fontSize: 12 }}>
        {toVisualBlocks(commands).map((block) => {
          if (block.kind === "multi") {
            return (
              <MultiLineBlock
                key={block.rawIndex}
                block={block}
                selected={selectedCommand === block.rawIndex}
                editing={editingCommand === block.rawIndex}
                editable={editable}
                onSelect={() => { setSelectedCommand(block.rawIndex); setEditingCommand(null); }}
                onStartEdit={() => setEditingCommand(block.rawIndex)}
                onUpdateLines={(lines) => {
                  if (!onChange) return;
                  const contCode = PARENT_CONT[block.cmd.code]!;
                  const newCmds: EventCommand[] = lines.map((text, idx) => ({
                    code: idx === 0 ? block.cmd.code : contCode,
                    indent: block.cmd.indent,
                    parameters: [text],
                  }));
                  const copy = [...commands];
                  copy.splice(block.rawIndex, 1 + block.contIndices.length, ...newCmds);
                  onChange(copy);
                }}
                onStopEditing={() => setEditingCommand(null)}
              />
            );
          }
          const { rawIndex: i, cmd } = block;
          return (
            <CommandRow
              key={i}
              command={cmd}
              selected={selectedCommand === i}
              editing={editingCommand === i && editable}
              onClick={() => { setSelectedCommand(i); if (editingCommand !== i) setEditingCommand(null); }}
              onDoubleClick={() => { if (editable && cmd.code !== 0) setEditingCommand(i); }}
              onParamChange={(paramIdx, value) => handleUpdateCommandParam(i, paramIdx, value)}
              onStopEditing={() => setEditingCommand(null)}
            />
          );
        })}
      </div>

      {/* Footer hint */}
      {editable && (
        <div style={{ padding: "3px 8px", fontSize: 9, color: "#acb0be", borderTop: "1px solid #ccd0da" }}>
          Dbl-click edit · Del remove · Ins insert · Ctrl+C/V copy/paste · Ctrl+D duplicate
        </div>
      )}

      {/* Command Picker Dialog */}
      {showPicker && editable && (
        <EventCommandPicker
          onSelect={handleInsertCommand}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
