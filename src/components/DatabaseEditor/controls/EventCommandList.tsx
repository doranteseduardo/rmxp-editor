/**
 * EventCommandList — read-only display of event commands with nice formatting.
 *
 * Reuses the summarizeCommand logic from the event editor to show
 * human-readable command descriptions. Supports scroll and selection.
 */
import { useState, useMemo } from "react";
import { summarizeCommand } from "../../../services/eventCommands";

interface EventCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

interface Props {
  commands: EventCommand[];
  /** Max height before scroll */
  maxHeight?: number;
}

export function EventCommandList({ commands, maxHeight = 300 }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const summaries = useMemo(() => {
    return commands.map((cmd) => {
      if (cmd.code === 0) return null; // end marker
      try {
        return summarizeCommand(cmd.code, cmd.parameters);
      } catch {
        return `[${cmd.code}]`;
      }
    });
  }, [commands]);

  const visibleCommands = commands
    .map((cmd, i) => ({ cmd, i, summary: summaries[i] }))
    .filter((x) => x.cmd.code !== 0);

  if (visibleCommands.length === 0) {
    return <div style={{ padding: 6, fontSize: 11, color: "#6c7086" }}>Empty event list</div>;
  }

  return (
    <div className="db-sublist" style={{ maxHeight, fontFamily: "monospace" }}>
      {visibleCommands.map(({ cmd, i, summary }) => (
        <div
          key={i}
          className={`db-sublist-item${selectedIdx === i ? " selected" : ""}`}
          onClick={() => setSelectedIdx(i)}
          style={{
            paddingLeft: 6 + cmd.indent * 16,
            fontSize: 10,
            lineHeight: "18px",
          }}
        >
          <span style={{ color: "#6c7086", marginRight: 6, fontSize: 9 }}>{String(cmd.code).padStart(3, "0")}</span>
          <span>{summary || `Code ${cmd.code}`}</span>
        </div>
      ))}
    </div>
  );
}
