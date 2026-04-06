/**
 * ChipListEditor — edits a string[] as removable chip tags with autocomplete input.
 * Usage: <ChipListEditor values={arr} options={allOptions} onChange={setArr} />
 */
import { useId, useRef, useState } from "react";

interface Props {
  values: string[];
  options?: string[];         // autocomplete suggestions
  placeholder?: string;
  maxItems?: number;          // cap on number of chips (default unlimited)
  onChange: (next: string[]) => void;
}

export function ChipListEditor({ values, options, placeholder = "Add…", maxItems, onChange }: Props) {
  const dlId = useId();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) return;
    if (maxItems != null && values.length >= maxItems) return;
    onChange([...values, trimmed]);
    setInput("");
  };

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && values.length > 0) {
      remove(values.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If the user typed a comma, commit the word before it
    if (val.endsWith(",")) {
      add(val.slice(0, -1));
    } else {
      setInput(val);
      // Check if the value matches an option exactly (from datalist selection)
      if (options?.includes(val)) {
        add(val);
      }
    }
  };

  const canAdd = maxItems == null || values.length < maxItems;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        padding: "4px 6px",
        border: "1px solid var(--color-surface1)",
        borderRadius: 4,
        background: "var(--color-crust)",
        cursor: "text",
        minHeight: 30,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {options && <datalist id={dlId}>{options.map((o) => <option key={o} value={o} />)}</datalist>}
      {values.map((v, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "1px 6px",
            background: "var(--color-surface0)",
            border: "1px solid var(--color-surface1)",
            borderRadius: 12,
            fontSize: 11,
            color: "var(--color-text)",
            whiteSpace: "nowrap",
          }}
        >
          {v}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(i); }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--color-subtext0)",
              lineHeight: 1,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
            }}
          >
            ×
          </button>
        </span>
      ))}
      {canAdd && (
        <input
          ref={inputRef}
          list={options ? dlId : undefined}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) add(input); }}
          placeholder={values.length === 0 ? placeholder : ""}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 11,
            color: "var(--color-text)",
            minWidth: 80,
            flex: 1,
          }}
        />
      )}
    </div>
  );
}
