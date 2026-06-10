import type { EditorProps } from "../types";
import { EditorShell, TInput, num, str } from "../shared";

export function ChangeWindowskinEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Windowskin" onDone={onDone}>
      <div className="cmd-param-row">
        <TInput label="Filename:" value={str(params[0])} onChange={(v) => onChange(0, v)} />
      </div>
    </EditorShell>
  );
}

// Reusable toggle for Enable/Disable commands (134, 135, 136, 208)
export function ToggleEditor({ title, onLabel, offLabel, params, onChange, onDone }: EditorProps & { title: string; onLabel: string; offLabel: string }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>{onLabel}</option>
          <option value={1}>{offLabel}</option>
        </select>
      </div>
    </EditorShell>
  );
}
