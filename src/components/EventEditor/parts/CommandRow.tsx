import type { EventCommand } from "../../../types";
import { getCommandDef, summarizeCommand } from "../../../services/eventCommands";
import { CommandParamEditor, hasParamEditor } from "../CommandParamEditor";
import type { PbsIndex } from "../../../services/pbsIndex";
import { getCommandIcon, type VisualBlock } from "./commandHelpers";

export function CommandRow({
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
  pbsIndex,
}: {
  command: EventCommand;
  index: number;
  selected: boolean;
  editing: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onParamChange: (paramIndex: number, value: unknown) => void;
  onStopEditing: () => void;
  mapInfos?: Record<number, import("../../../types").MapInfo>;
  switchNames?: string[];
  variableNames?: string[];
  pbsIndex?: PbsIndex;
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
          pbsIndex={pbsIndex}
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
export function isTextEditableCommand(code: number): boolean {
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

/** Multi-line block: parent command + its continuation lines as one editable unit */
export function MultiLineBlock({
  block,
  selected,
  editing,
  onSelect,
  onStartEdit,
  onUpdateLines,
  onStopEditing,
}: {
  block: Extract<VisualBlock, { kind: "multi" }>;
  selected: boolean;
  editing: boolean;
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

  if (editing) {
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
              const lines = e.target.value.split("\n").filter((_, idx, arr) => idx < arr.length || arr[idx] !== "");
              onUpdateLines(lines.length > 0 ? lines : [""]);
              onStopEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { onStopEditing(); e.preventDefault(); e.stopPropagation(); }
            }}
          />
          <div style={{ fontSize: 9, color: "#8c8fa1", marginTop: 2 }}>
            Each line becomes a continuation. Press Escape to finish.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={blockClass} onClick={onSelect} onDoubleClick={onStartEdit}>
      <div className={rowClass} style={{ background: "transparent" }}>
        <span className="event-command-indent">{indentBars}</span>
        <span className="event-command-icon">{icon}</span>
        <span className="event-command-name">{def.name}</span>
        <span className="event-command-params">{allLines[0]}</span>
      </div>
      {allLines.slice(1).map((line, idx) => (
        <div
          key={idx}
          className={`event-command-cont-line${isComment ? " cmd-comment" : isScript ? " cmd-script" : ""}`}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
