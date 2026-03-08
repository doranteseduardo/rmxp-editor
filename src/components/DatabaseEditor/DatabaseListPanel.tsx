/**
 * Shared left-side list panel for database tabs.
 * Shows a scrollable list of [id] Name entries with selection.
 */
import { useCallback } from "react";

interface Props {
  items: ({ id: number; name: string } | null)[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd?: () => void;
  onDelete?: () => void;
  label?: string;
}

export function DatabaseListPanel({
  items,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  label = "entries",
}: Props) {
  const realCount = items.filter((x, i) => i > 0 && x != null).length;

  return (
    <div className="db-list-panel">
      <div className="db-list-toolbar">
        {onAdd && <button onClick={onAdd}>+ New</button>}
        {onDelete && (
          <button onClick={onDelete} disabled={selectedId == null}>
            Delete
          </button>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#8c8fa1", alignSelf: "center" }}>
          {realCount} {label}
        </span>
      </div>
      <div className="db-list-scroll">
        {items.map((item, i) => {
          if (i === 0 || item == null) return null;
          return (
            <div
              key={i}
              className={`db-list-item${selectedId === i ? " selected" : ""}`}
              onClick={() => onSelect(i)}
            >
              <span className="db-list-id">
                {String(i).padStart(3, "0")}
              </span>
              <span className="db-list-name">
                {(item as { name: string }).name || "(unnamed)"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
