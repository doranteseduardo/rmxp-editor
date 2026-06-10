export function EditableCondition({
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
        style={{ margin: 0, accentColor: "#40a02b" }}
      />
      <span style={{ color: active ? "#4c4f69" : "#8c8fa1", fontSize: 11, minWidth: 60 }}>{label}</span>
      {active && <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{children}</span>}
    </div>
  );
}

export function ToggleBadge({ on, onToggle }: { on: boolean; onToggle: () => void }) {
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
export function NamedIdSelector({
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

export function NumberInput({
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
