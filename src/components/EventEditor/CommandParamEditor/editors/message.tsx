import type { EditorProps } from "../types";
import { EditorShell, NInput, TInput, num } from "../shared";

// --- Show Choices (102) ---
// params: [choices_array, cancel_type]
export function ShowChoicesEditor({ params, onChange, onDone }: EditorProps) {
  const choices = (Array.isArray(params[0]) ? params[0] : []) as string[];
  const cancelType = num(params[1]);

  const updateChoice = (idx: number, val: string) => {
    const next = [...choices];
    next[idx] = val;
    onChange(0, next);
  };

  return (
    <EditorShell title="Show Choices" onDone={onDone}>
      {[0, 1, 2, 3].map((i) => (
        <div className="cmd-param-row" key={i}>
          <TInput label={`Choice ${i + 1}:`} value={choices[i] ?? ""}
            onChange={(v) => updateChoice(i, v)} placeholder={i < 2 ? "(required)" : "(optional)"} />
        </div>
      ))}
      <div className="cmd-param-row">
        <span className="cmd-param-label">On Cancel:</span>
        <select className="prop-select" value={cancelType} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Disallow</option>
          <option value={1}>Choice 1</option>
          <option value={2}>Choice 2</option>
          <option value={3}>Choice 3</option>
          <option value={4}>Choice 4</option>
          <option value={5}>Branch</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Input Number (103) ---
// params: [variable_id, max_digits]
export function InputNumberEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Input Number" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Variable ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Digits:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} max={8} />
      </div>
    </EditorShell>
  );
}

// --- Change Text Options (104) ---
// params: [position, no_frame]
export function ChangeTextOptionsEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Text Options" onDone={onDone}>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Position:</span>
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Top</option>
          <option value={1}>Middle</option>
          <option value={2}>Bottom</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Window:</span>
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Show</option>
          <option value={1}>Hide</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Button Input Processing (105) ---
// params: [variable_id]
export function ButtonInputEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Button Input Processing" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Variable ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row" style={{ fontSize: 10, color: "#8c8fa1" }}>
        Down=2, Left=4, Right=6, Up=8, A=11, B=12, C=13, X=14, Y=15, Z=16, L=17, R=18
      </div>
    </EditorShell>
  );
}

// --- Wait (106) ---
// params: [frames]
export function WaitEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Wait" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Frames:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
        <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>
          ({(num(params[0]) / 20).toFixed(1)}s at 20fps)
        </span>
      </div>
    </EditorShell>
  );
}
