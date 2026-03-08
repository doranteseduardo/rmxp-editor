/**
 * IdSelect — dropdown that resolves numeric IDs to names from DatabaseContext.
 *
 * Shows: "001: Actor Name" format. Supports optional "(None)" for id=0.
 */
import type { NameEntry } from "../DatabaseContext";

interface Props {
  value: number;
  entries: NameEntry[];
  onChange: (id: number) => void;
  allowNone?: boolean;      // show a (None) option for id=0
  noneLabel?: string;
  className?: string;
}

export function IdSelect({ value, entries, onChange, allowNone = false, noneLabel = "(None)", className }: Props) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
    >
      {allowNone && <option value={0}>{noneLabel}</option>}
      {entries.map((e) => (
        <option key={e.id} value={e.id}>
          {String(e.id).padStart(3, "0")}: {e.name}
        </option>
      ))}
    </select>
  );
}
