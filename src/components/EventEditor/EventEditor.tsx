import { useCallback, useEffect, useState } from "react";
import type {
  RpgEvent,
  EventPage,
  EventCommand,
} from "../../types";
import {
  EVENT_TRIGGERS,
  MOVE_TYPES,
  DIRECTIONS,
} from "../../types";
import {
  getCommandDef,
  summarizeCommand,
  MOVE_COMMAND_NAMES,
} from "../../services/eventCommands";
import { loadEvent } from "../../services/tauriApi";
import "./EventEditor.css";

interface Props {
  projectPath: string;
  mapId: number;
  eventId: number;
  /** Initial event name from EventInfo (shown before full data loads) */
  eventName: string;
  onClose: () => void;
}

export function EventEditor({
  projectPath,
  mapId,
  eventId,
  eventName,
  onClose,
}: Props) {
  const [event, setEvent] = useState<RpgEvent | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [selectedCommand, setSelectedCommand] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load full event data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadEvent(projectPath, mapId, eventId);
        if (!cancelled) {
          setEvent(data);
          setActivePage(0);
          setSelectedCommand(-1);
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
  }, [projectPath, mapId, eventId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("event-editor-overlay")) {
        onClose();
      }
    },
    [onClose]
  );

  const page: EventPage | null =
    event && event.pages[activePage] ? event.pages[activePage] : null;

  return (
    <div className="event-editor-overlay" onClick={handleOverlayClick}>
      <div className="event-editor">
        {/* Header */}
        <div className="event-editor-header">
          <div>
            <h3>
              Event [{String(eventId).padStart(3, "0")}] {event?.name ?? eventName}
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
        {event && event.pages.length > 0 && (
          <div className="event-editor-pages">
            {event.pages.map((_p, i) => (
              <button
                key={i}
                className={`event-page-tab ${activePage === i ? "active" : ""}`}
                onClick={() => {
                  setActivePage(i);
                  setSelectedCommand(-1);
                }}
              >
                Page {i + 1}
              </button>
            ))}
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
                <PageProperties page={page} />
              </div>

              {/* Right: Command list */}
              <div className="event-command-panel">
                <div className="event-command-panel-header">
                  <span className="event-command-panel-title">
                    Event Commands ({page.list.length})
                  </span>
                </div>
                <div className="event-command-list">
                  {page.list.map((cmd, i) => (
                    <CommandRow
                      key={i}
                      command={cmd}
                      index={i}
                      selected={selectedCommand === i}
                      onClick={() => setSelectedCommand(i)}
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
          <button className="event-editor-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function PageProperties({ page }: { page: EventPage }) {
  return (
    <>
      {/* Conditions */}
      <div className="prop-section">
        <div className="prop-section-title">Conditions</div>
        <ConditionItem
          active={page.condition.switch1_valid}
          label={`Switch [${page.condition.switch1_id}]`}
        />
        <ConditionItem
          active={page.condition.switch2_valid}
          label={`Switch [${page.condition.switch2_id}]`}
        />
        <ConditionItem
          active={page.condition.variable_valid}
          label={`Variable [${page.condition.variable_id}] >= ${page.condition.variable_value}`}
        />
        <ConditionItem
          active={page.condition.self_switch_valid}
          label={`Self Switch ${page.condition.self_switch_ch}`}
        />
      </div>

      {/* Graphic */}
      <div className="prop-section">
        <div className="prop-section-title">Graphic</div>
        <div className="prop-row">
          <div className="event-graphic-preview">
            {page.graphic.character_name ? (
              <span style={{ fontSize: 9, textAlign: "center", padding: 2 }}>
                {page.graphic.character_name.split("_").pop()}
              </span>
            ) : page.graphic.tile_id > 0 ? (
              <span>Tile {page.graphic.tile_id}</span>
            ) : (
              <span>(none)</span>
            )}
          </div>
          <div>
            <div className="prop-value" style={{ marginBottom: 2 }}>
              {page.graphic.character_name || "(no graphic)"}
            </div>
            <div style={{ fontSize: 10, color: "#6c7086" }}>
              Dir: {DIRECTIONS[page.graphic.direction] ?? page.graphic.direction} ·
              Opacity: {page.graphic.opacity}
            </div>
          </div>
        </div>
      </div>

      {/* Movement */}
      <div className="prop-section">
        <div className="prop-section-title">Movement</div>
        <div className="prop-row">
          <span className="prop-label">Type</span>
          <span className="prop-value">
            {MOVE_TYPES[page.move_type] ?? page.move_type}
          </span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Speed</span>
          <span className="prop-value">{page.move_speed}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Frequency</span>
          <span className="prop-value">{page.move_frequency}</span>
        </div>

        {/* Move route preview for custom routes */}
        {page.move_type === 3 && page.move_route.list.length > 1 && (
          <div className="move-route-list">
            {page.move_route.list.map((mc, i) =>
              mc.code === 0 ? null : (
                <div key={i} className="move-route-item">
                  {MOVE_COMMAND_NAMES[mc.code] ?? `Code ${mc.code}`}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="prop-section">
        <div className="prop-section-title">Options</div>
        <div className="prop-row">
          <span className="prop-label">Walk Anime</span>
          <Badge on={page.walk_anime} />
        </div>
        <div className="prop-row">
          <span className="prop-label">Step Anime</span>
          <Badge on={page.step_anime} />
        </div>
        <div className="prop-row">
          <span className="prop-label">Direction Fix</span>
          <Badge on={page.direction_fix} />
        </div>
        <div className="prop-row">
          <span className="prop-label">Through</span>
          <Badge on={page.through} />
        </div>
        <div className="prop-row">
          <span className="prop-label">Always on Top</span>
          <Badge on={page.always_on_top} />
        </div>
      </div>

      {/* Trigger */}
      <div className="prop-section">
        <div className="prop-section-title">Trigger</div>
        <div className="prop-row">
          <span className="prop-badge prop-badge-trigger">
            {EVENT_TRIGGERS[page.trigger] ?? `Unknown (${page.trigger})`}
          </span>
        </div>
      </div>
    </>
  );
}

function ConditionItem({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <div className="condition-item">
      <div
        className={`condition-indicator ${active ? "condition-active" : "condition-inactive"}`}
      />
      <span style={{ color: active ? "#cdd6f4" : "#6c7086" }}>{label}</span>
    </div>
  );
}

function Badge({ on }: { on: boolean }) {
  return (
    <span className={`prop-badge ${on ? "prop-badge-on" : "prop-badge-off"}`}>
      {on ? "ON" : "OFF"}
    </span>
  );
}

function CommandRow({
  command,
  index: _index,
  selected,
  onClick,
}: {
  command: EventCommand;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  const def = getCommandDef(command.code);
  const summary = summarizeCommand(command.code, command.parameters);

  // Determine CSS class modifiers
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

  // Icon for command type
  const icon = getCommandIcon(command.code);

  return (
    <div className={rowClass} onClick={onClick}>
      {/* Indent bars */}
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

function getCommandIcon(code: number): string {
  if (code === 0) return "";
  if (code === 108 || code === 408) return "//";
  if (code === 101 || code === 401) return "T";
  if (code === 102) return "?";
  if (code === 111 || code === 411 || code === 412) return "◇";
  if (code === 112 || code === 413) return "↻";
  if (code === 113 || code === 115) return "⏹";
  if (code === 121 || code === 122 || code === 123) return "=";
  if (code >= 201 && code <= 210) return "▶";
  if (code >= 221 && code <= 236) return "◐";
  if (code >= 241 && code <= 251) return "♪";
  if (code === 355 || code === 655) return "{}";
  if (code >= 301 && code <= 340) return "⚔";
  return "•";
}
