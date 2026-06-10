import { useState, useId } from "react";

export function EditorShell({ title, children, onDone }: { title: string; children: React.ReactNode; onDone: () => void }) {
  return (
    <div className="cmd-param-editor">
      <div className="cmd-param-editor-title">{title}</div>
      <div className="cmd-param-editor-body">{children}</div>
      <button className="cmd-param-editor-done" onClick={onDone}>Done</button>
    </div>
  );
}

/** Dropdown picker for named switch/variable IDs. Falls back to NInput if no names available. */
export function NamedIdPicker({ label, value, onChange, names, fallbackLabel }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  names?: string[];
  fallbackLabel: string;
}) {
  if (names && names.length > 1) {
    return (
      <>
        <span className="cmd-param-label">{label}</span>
        <select
          className="prop-select"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, minWidth: 120, fontSize: 10 }}
        >
          {names.map((name, i) => {
            if (i === 0) return null;
            return (
              <option key={i} value={i}>
                [{String(i).padStart(4, "0")}] {name || `${fallbackLabel} ${i}`}
              </option>
            );
          })}
        </select>
      </>
    );
  }
  return <NInput label={label} value={value} onChange={onChange} min={1} />;
}

export function NInput({ value, onChange, min, max, label, width }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string; width?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label && <span className="cmd-param-label">{label}</span>}
      <input type="number" className="prop-number-input" value={value} min={min} max={max}
        style={width ? { width } : undefined}
        onChange={(e) => onChange(Number(e.target.value))} />
    </span>
  );
}

export function TInput({ value, onChange, label, placeholder }: {
  value: string; onChange: (v: string) => void; label?: string; placeholder?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: 1 }}>
      {label && <span className="cmd-param-label">{label}</span>}
      <input className="event-command-edit-input" value={value} placeholder={placeholder}
        style={{ flex: 1 }} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

/** Increase/Decrease selector + constant/variable operand — used by many commands */
export function IncDecOperand({ params, onChange, startIdx }: {
  params: unknown[]; onChange: (i: number, v: unknown) => void; startIdx: number;
}) {
  return (
    <>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[startIdx])} onChange={(e) => onChange(startIdx, Number(e.target.value))}>
          <option value={0}>Increase</option>
          <option value={1}>Decrease</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[startIdx + 1])} onChange={(e) => onChange(startIdx + 1, Number(e.target.value))}>
          <option value={0}>Constant</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label="" value={num(params[startIdx + 2])} onChange={(v) => onChange(startIdx + 2, v)} min={0} />
      </div>
    </>
  );
}

/** Actor selector — used by HP/SP/State/EXP/Level/Params/Skills/Equipment/Name/Class/Graphic */
export function ActorSelector({ params, onChange, idx }: {
  params: unknown[]; onChange: (i: number, v: unknown) => void; idx: number;
}) {
  return (
    <div className="cmd-param-row">
      <NInput label="Actor ID:" value={num(params[idx])} onChange={(v) => onChange(idx, v)} min={1} />
      <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(0 = entire party)</span>
    </div>
  );
}

export function PbsNamePicker({ label, names, prefix, onPick }: { label: string; names: string[]; prefix: string; onPick: (s: string) => void }) {
  const [value, setValue] = useState("");
  const dlId = useId();
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      <datalist id={dlId}>{names.map((n) => <option key={n} value={n} />)}</datalist>
      <input
        list={dlId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={label}
        style={{ padding: "2px 5px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, width: 110 }}
      />
      <button
        onClick={() => { if (value) { onPick(`${prefix}${value}`); setValue(""); } }}
        style={{ padding: "2px 6px", fontSize: 10, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
      >Insert</button>
    </div>
  );
}

export function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
