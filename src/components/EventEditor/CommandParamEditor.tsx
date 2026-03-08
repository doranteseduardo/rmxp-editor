/**
 * Inline parameter editors for common RMXP event commands.
 * Renders appropriate UI controls for editing command parameters
 * that aren't simple text (conditional branches, switches, variables, etc.)
 */

import type { EventCommand } from "../../types";

interface Props {
  command: EventCommand;
  onChange: (paramIndex: number, value: unknown) => void;
  onDone: () => void;
}

/**
 * Returns true if this command code has a dedicated parameter editor.
 */
export function hasParamEditor(code: number): boolean {
  return [111, 121, 122, 123, 117, 125, 126, 201].includes(code);
}

/**
 * Renders a parameter editor for the given command.
 */
export function CommandParamEditor({ command, onChange, onDone }: Props) {
  const p = command.parameters;

  switch (command.code) {
    case 111: return <ConditionalBranchEditor params={p} onChange={onChange} onDone={onDone} />;
    case 121: return <ControlSwitchesEditor params={p} onChange={onChange} onDone={onDone} />;
    case 122: return <ControlVariablesEditor params={p} onChange={onChange} onDone={onDone} />;
    case 123: return <ControlSelfSwitchEditor params={p} onChange={onChange} onDone={onDone} />;
    case 117: return <CallCommonEventEditor params={p} onChange={onChange} onDone={onDone} />;
    case 125: return <ChangeGoldEditor params={p} onChange={onChange} onDone={onDone} />;
    case 126: return <ChangeItemsEditor params={p} onChange={onChange} onDone={onDone} />;
    case 201: return <TransferPlayerEditor params={p} onChange={onChange} onDone={onDone} />;
    default: return null;
  }
}

// ---- Individual editors ----

interface EditorProps {
  params: unknown[];
  onChange: (index: number, value: unknown) => void;
  onDone: () => void;
}

function EditorShell({ title, children, onDone }: { title: string; children: React.ReactNode; onDone: () => void }) {
  return (
    <div className="cmd-param-editor">
      <div className="cmd-param-editor-title">{title}</div>
      <div className="cmd-param-editor-body">{children}</div>
      <button className="cmd-param-editor-done" onClick={onDone}>Done</button>
    </div>
  );
}

function NInput({ value, onChange, min, max, label, width }: {
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

// --- Conditional Branch (111) ---
// params: [type, ...rest] — type determines the condition kind
function ConditionalBranchEditor({ params, onChange, onDone }: EditorProps) {
  const condType = (params[0] as number) ?? 0;
  return (
    <EditorShell title="Conditional Branch" onDone={onDone}>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Type:</span>
        <select className="prop-select" value={condType} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Switch</option>
          <option value={1}>Variable</option>
          <option value={2}>Self Switch</option>
          <option value={4}>Actor in Party</option>
          <option value={12}>Script</option>
        </select>
      </div>
      {condType === 0 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Switch ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
          </div>
          <div className="cmd-param-row">
            <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={0}>ON</option>
              <option value={1}>OFF</option>
            </select>
          </div>
        </>
      )}
      {condType === 1 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Variable:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
          </div>
          <div className="cmd-param-row">
            <select className="prop-select" value={num(params[4])} onChange={(e) => onChange(4, Number(e.target.value))}>
              <option value={0}>==</option>
              <option value={1}>&gt;=</option>
              <option value={2}>&lt;=</option>
              <option value={3}>&gt;</option>
              <option value={4}>&lt;</option>
              <option value={5}>!=</option>
            </select>
          </div>
          <div className="cmd-param-row">
            <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={0}>Constant</option>
              <option value={1}>Variable</option>
            </select>
            <NInput label="" value={num(params[3])} onChange={(v) => onChange(3, v)} min={num(params[2]) === 0 ? undefined : 1} />
          </div>
        </>
      )}
      {condType === 2 && (
        <>
          <div className="cmd-param-row">
            <span className="cmd-param-label">Self Switch:</span>
            <select className="prop-select" value={str(params[1])} onChange={(e) => onChange(1, e.target.value)}>
              {["A", "B", "C", "D"].map((ch) => <option key={ch} value={ch}>{ch}</option>)}
            </select>
            <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={0}>ON</option>
              <option value={1}>OFF</option>
            </select>
          </div>
        </>
      )}
      {condType === 4 && (
        <div className="cmd-param-row">
          <NInput label="Actor ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        </div>
      )}
      {condType === 12 && (
        <div className="cmd-param-row">
          <input className="event-command-edit-input" value={str(params[1])}
            onChange={(e) => onChange(1, e.target.value)} style={{ flex: 1 }} />
        </div>
      )}
    </EditorShell>
  );
}

// --- Control Switches (121) ---
// params: [start_id, end_id, value (0=ON, 1=OFF)]
function ControlSwitchesEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Control Switches" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="From:" value={num(params[0])} onChange={(v) => { onChange(0, v); if (v > num(params[1])) onChange(1, v); }} min={1} />
        <NInput label="To:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={num(params[0])} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>ON</option>
          <option value={1}>OFF</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Control Variables (122) ---
// params: [start_id, end_id, operation, operand_type, operand_value]
function ControlVariablesEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Control Variables" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="From:" value={num(params[0])} onChange={(v) => { onChange(0, v); if (v > num(params[1])) onChange(1, v); }} min={1} />
        <NInput label="To:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={num(params[0])} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Op:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          {["=", "+=", "-=", "*=", "/=", "%="].map((op, i) => <option key={i} value={i}>{op}</option>)}
        </select>
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Operand:</span>
        <select className="prop-select" value={num(params[3])} onChange={(e) => onChange(3, Number(e.target.value))}>
          <option value={0}>Constant</option>
          <option value={1}>Variable</option>
          <option value={2}>Random</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="Value:" value={num(params[4])} onChange={(v) => onChange(4, v)} />
        {num(params[3]) === 2 && <NInput label="Max:" value={num(params[5])} onChange={(v) => onChange(5, v)} />}
      </div>
    </EditorShell>
  );
}

// --- Control Self Switch (123) ---
// params: [switch_ch, value (0=ON, 1=OFF)]
function ControlSelfSwitchEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Control Self Switch" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={str(params[0])} onChange={(e) => onChange(0, e.target.value)}>
          {["A", "B", "C", "D"].map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>
        <span className="cmd-param-label">=</span>
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>ON</option>
          <option value={1}>OFF</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Call Common Event (117) ---
// params: [common_event_id]
function CallCommonEventEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Call Common Event" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Common Event ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// --- Change Gold (125) ---
// params: [operation (0=increase, 1=decrease), operand_type (0=constant, 1=variable), operand]
function ChangeGoldEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Gold" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Increase</option>
          <option value={1}>Decrease</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Constant</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label="" value={num(params[2])} onChange={(v) => onChange(2, v)} min={num(params[1]) === 1 ? 1 : 0} />
      </div>
    </EditorShell>
  );
}

// --- Change Items (126) ---
// params: [item_id, operation (0=increase, 1=decrease), operand_type, operand]
function ChangeItemsEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Items" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Item ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Increase</option>
          <option value={1}>Decrease</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Constant</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label="" value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// --- Transfer Player (201) ---
// params: [designation (0=direct, 1=variable), map_id, x, y, direction]
function TransferPlayerEditor({ params, onChange, onDone }: EditorProps) {
  const direct = num(params[0]) === 0;
  return (
    <EditorShell title="Transfer Player" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Direct designation</option>
          <option value={1}>Variable designation</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label={direct ? "Map:" : "Map Var:"} value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <NInput label={direct ? "X:" : "X Var:"} value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
        <NInput label={direct ? "Y:" : "Y Var:"} value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Direction:</span>
        <select className="prop-select" value={num(params[4])} onChange={(e) => onChange(4, Number(e.target.value))}>
          <option value={0}>Retain</option>
          <option value={2}>Down</option>
          <option value={4}>Left</option>
          <option value={6}>Right</option>
          <option value={8}>Up</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Helpers ---
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
