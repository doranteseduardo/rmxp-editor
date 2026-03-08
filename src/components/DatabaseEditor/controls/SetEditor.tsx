/**
 * SetEditor — checkbox list for element_set, state_set, weapon_set, etc.
 *
 * Takes an array of IDs (the "set") and a list of all possible entries.
 * Renders checkboxes; toggling adds/removes from the set.
 */
import type { NameEntry } from "../DatabaseContext";

interface Props {
  value: number[];
  entries: NameEntry[];
  onChange: (newSet: number[]) => void;
  /** Max height before scroll, default 160 */
  maxHeight?: number;
}

export function SetEditor({ value, entries, onChange, maxHeight = 160 }: Props) {
  const valueSet = new Set(value);

  const toggle = (id: number) => {
    if (valueSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id].sort((a, b) => a - b));
    }
  };

  if (entries.length === 0) {
    return <div style={{ fontSize: 11, color: "#6c7086", padding: 4 }}>No entries available</div>;
  }

  return (
    <div
      className="db-sublist"
      style={{ maxHeight, padding: 2 }}
    >
      {entries.map((e) => (
        <label
          key={e.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "1px 6px",
            fontSize: 11,
            color: valueSet.has(e.id) ? "#cdd6f4" : "#a6adc8",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={valueSet.has(e.id)}
            onChange={() => toggle(e.id)}
            style={{ accentColor: "#89b4fa" }}
          />
          <span style={{ color: "#6c7086", width: 28, flexShrink: 0, fontSize: 10 }}>
            {String(e.id).padStart(3, "0")}
          </span>
          {e.name || "(unnamed)"}
        </label>
      ))}
    </div>
  );
}

/**
 * IndexedSetEditor — for element-based sets where index 1..N maps to elements[].
 * elements is a string[] from System where index 0 is empty.
 */
export function ElementSetEditor({
  value,
  elements,
  onChange,
  maxHeight = 160,
}: {
  value: number[];
  elements: string[];
  onChange: (newSet: number[]) => void;
  maxHeight?: number;
}) {
  const entries: NameEntry[] = [];
  for (let i = 1; i < elements.length; i++) {
    entries.push({ id: i, name: elements[i] || `Element ${i}` });
  }
  return <SetEditor value={value} entries={entries} onChange={onChange} maxHeight={maxHeight} />;
}
