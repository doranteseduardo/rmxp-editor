/**
 * Reusable left-panel list for all entity editors.
 * Shows a searchable list with add/delete controls.
 */
import { useState } from "react";

interface Props<T> {
  items: T[];
  selectedId: string | null;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  /** Optional render function for item prefix (e.g. sprite icon) */
  renderPrefix?: (item: T) => React.ReactNode;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  dirty?: boolean;
  addLabel?: string;
}

export function EntityListPanel<T>({
  items, selectedId, getId, getLabel, renderPrefix,
  onSelect, onAdd, onDelete, loading, addLabel = "+ Add",
}: Props<T>) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? items.filter((item) => getLabel(item).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div style={{
      width: 220, flexShrink: 0,
      display: "flex", flexDirection: "column",
      borderRight: "1px solid #ccd0da",
      background: "#e6e9ef",
    }}>
      {/* Search */}
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #ccd0da" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          style={{
            width: "100%", padding: "3px 6px", fontSize: 11,
            border: "1px solid #ccd0da", borderRadius: 3,
            background: "#fff", color: "#4c4f69", boxSizing: "border-box",
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: 12, fontSize: 11, color: "#8c8fa1" }}>Loading...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 11, color: "#8c8fa1" }}>
            {search ? "No matches." : "Empty."}
          </div>
        )}
        {filtered.map((item) => {
          const id = getId(item);
          const isSelected = id === selectedId;
          return (
            <div
              key={id}
              onClick={() => onSelect(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 8px", cursor: "pointer",
                background: isSelected ? "#1e66f5" : "transparent",
                color: isSelected ? "#fff" : "#4c4f69",
                fontSize: 11,
              }}
            >
              {renderPrefix && (
                <span style={{ flexShrink: 0 }}>{renderPrefix(item)}</span>
              )}
              <span style={{
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {getLabel(item)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: isSelected ? "rgba(255,255,255,0.6)" : "#acb0be",
                  fontSize: 13, padding: "0 2px", lineHeight: 1, flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <div style={{ padding: "6px 8px", borderTop: "1px solid #ccd0da" }}>
        <button
          onClick={onAdd}
          style={{
            width: "100%", padding: "4px 0", fontSize: 11,
            background: "#1e66f5", color: "#fff", border: "none",
            borderRadius: 3, cursor: "pointer",
          }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
