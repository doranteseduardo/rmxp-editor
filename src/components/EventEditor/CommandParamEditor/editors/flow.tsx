import type { EditorProps } from "../types";
import { EditorShell, NamedIdPicker, NInput, TInput, IncDecOperand, num, str } from "../shared";

// --- Conditional Branch (111) ---
export function ConditionalBranchEditor({ params, onChange, onDone, switchNames, variableNames }: EditorProps & { switchNames?: string[]; variableNames?: string[] }) {
  const condType = (params[0] as number) ?? 0;
  return (
    <EditorShell title="Conditional Branch" onDone={onDone}>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Type:</span>
        <select className="prop-select" value={condType} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Switch</option>
          <option value={1}>Variable</option>
          <option value={2}>Self Switch</option>
          <option value={3}>Timer</option>
          <option value={4}>Actor</option>
          <option value={5}>Enemy</option>
          <option value={6}>Character</option>
          <option value={7}>Gold</option>
          <option value={8}>Item</option>
          <option value={9}>Weapon</option>
          <option value={10}>Armor</option>
          <option value={11}>Button</option>
          <option value={12}>Script</option>
        </select>
      </div>
      {condType === 0 && (
        <>
          <div className="cmd-param-row">
            <NamedIdPicker label="Switch:" value={num(params[1])} onChange={(v) => onChange(1, v)} names={switchNames} fallbackLabel="Switch" />
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
            <NamedIdPicker label="Variable:" value={num(params[1])} onChange={(v) => onChange(1, v)} names={variableNames} fallbackLabel="Variable" />
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
            {num(params[2]) === 1 ? (
              <NamedIdPicker label="" value={num(params[3])} onChange={(v) => onChange(3, v)} names={variableNames} fallbackLabel="Variable" />
            ) : (
              <NInput label="" value={num(params[3])} onChange={(v) => onChange(3, v)} />
            )}
          </div>
        </>
      )}
      {condType === 2 && (
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
      )}
      {condType === 3 && (
        <div className="cmd-param-row">
          <NInput label="Minutes:" value={Math.floor(num(params[1]) / 60)} onChange={(v) => onChange(1, v * 60 + (num(params[1]) % 60))} min={0} />
          <NInput label="Sec:" value={num(params[1]) % 60} onChange={(v) => onChange(1, Math.floor(num(params[1]) / 60) * 60 + v)} min={0} max={59} />
          <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
            <option value={0}>or more</option>
            <option value={1}>or less</option>
          </select>
        </div>
      )}
      {condType === 4 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Actor ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
          </div>
          <div className="cmd-param-row">
            <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={0}>In Party</option>
              <option value={1}>Name is</option>
              <option value={2}>Skill learned</option>
              <option value={3}>Weapon equipped</option>
              <option value={4}>Armor equipped</option>
              <option value={5}>State applied</option>
            </select>
          </div>
          {num(params[2]) >= 1 && (
            <div className="cmd-param-row">
              {num(params[2]) === 1
                ? <TInput label="Name:" value={str(params[3])} onChange={(v) => onChange(3, v)} />
                : <NInput label="ID:" value={num(params[3])} onChange={(v) => onChange(3, v)} min={1} />}
            </div>
          )}
        </>
      )}
      {condType === 5 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Enemy Index:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} max={7} />
          </div>
          <div className="cmd-param-row">
            <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={0}>Appeared</option>
              <option value={1}>State applied</option>
            </select>
          </div>
          {num(params[2]) === 1 && (
            <div className="cmd-param-row">
              <NInput label="State ID:" value={num(params[3])} onChange={(v) => onChange(3, v)} min={1} />
            </div>
          )}
        </>
      )}
      {condType === 6 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Character:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={-1} />
            <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(-1=player, 0=this)</span>
          </div>
          <div className="cmd-param-row">
            <span className="cmd-param-label">Facing:</span>
            <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
              <option value={2}>Down</option>
              <option value={4}>Left</option>
              <option value={6}>Right</option>
              <option value={8}>Up</option>
            </select>
          </div>
        </>
      )}
      {condType === 7 && (
        <div className="cmd-param-row">
          <NInput label="Gold:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
          <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
            <option value={0}>or more</option>
            <option value={1}>or less</option>
          </select>
        </div>
      )}
      {condType === 8 && (
        <div className="cmd-param-row">
          <NInput label="Item ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        </div>
      )}
      {condType === 9 && (
        <div className="cmd-param-row">
          <NInput label="Weapon ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        </div>
      )}
      {condType === 10 && (
        <div className="cmd-param-row">
          <NInput label="Armor ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        </div>
      )}
      {condType === 11 && (
        <div className="cmd-param-row">
          <span className="cmd-param-label">Button:</span>
          <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
            <option value={2}>Down</option>
            <option value={4}>Left</option>
            <option value={6}>Right</option>
            <option value={8}>Up</option>
            <option value={11}>A</option>
            <option value={12}>B</option>
            <option value={13}>C</option>
            <option value={14}>X</option>
            <option value={15}>Y</option>
            <option value={16}>Z</option>
            <option value={17}>L</option>
            <option value={18}>R</option>
          </select>
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

// --- Call Common Event (117) ---
export function CallCommonEventEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Call Common Event" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Common Event ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// --- Control Switches (121) ---
export function ControlSwitchesEditor({ params, onChange, onDone, switchNames }: EditorProps & { switchNames?: string[] }) {
  const isSingle = num(params[0]) === num(params[1]);
  return (
    <EditorShell title="Control Switches" onDone={onDone}>
      {isSingle && switchNames && switchNames.length > 1 ? (
        <div className="cmd-param-row">
          <NamedIdPicker label="Switch:" value={num(params[0])} onChange={(v) => { onChange(0, v); onChange(1, v); }} names={switchNames} fallbackLabel="Switch" />
        </div>
      ) : (
        <div className="cmd-param-row">
          <NInput label="From:" value={num(params[0])} onChange={(v) => { onChange(0, v); if (v > num(params[1])) onChange(1, v); }} min={1} />
          <NInput label="To:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={num(params[0])} />
        </div>
      )}
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
export function ControlVariablesEditor({ params, onChange, onDone, variableNames }: EditorProps & { variableNames?: string[] }) {
  const opType = num(params[3]);
  const isSingle = num(params[0]) === num(params[1]);
  return (
    <EditorShell title="Control Variables" onDone={onDone}>
      {isSingle && variableNames && variableNames.length > 1 ? (
        <div className="cmd-param-row">
          <NamedIdPicker label="Variable:" value={num(params[0])} onChange={(v) => { onChange(0, v); onChange(1, v); }} names={variableNames} fallbackLabel="Variable" />
        </div>
      ) : (
        <div className="cmd-param-row">
          <NInput label="From:" value={num(params[0])} onChange={(v) => { onChange(0, v); if (v > num(params[1])) onChange(1, v); }} min={1} />
          <NInput label="To:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={num(params[0])} />
        </div>
      )}
      <div className="cmd-param-row">
        <span className="cmd-param-label">Op:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          {["=", "+=", "-=", "*=", "/=", "%="].map((op, i) => <option key={i} value={i}>{op}</option>)}
        </select>
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Operand:</span>
        <select className="prop-select" value={opType} onChange={(e) => onChange(3, Number(e.target.value))}>
          <option value={0}>Constant</option>
          <option value={1}>Variable</option>
          <option value={2}>Random</option>
          <option value={3}>Item count</option>
          <option value={4}>Actor param</option>
          <option value={5}>Enemy param</option>
          <option value={6}>Character</option>
          <option value={7}>Other</option>
        </select>
      </div>
      <div className="cmd-param-row">
        {opType === 1 ? (
          <NamedIdPicker label="Variable:" value={num(params[4])} onChange={(v) => onChange(4, v)} names={variableNames} fallbackLabel="Variable" />
        ) : (
          <NInput label="Value:" value={num(params[4])} onChange={(v) => onChange(4, v)} />
        )}
        {opType === 2 && <NInput label="Max:" value={num(params[5])} onChange={(v) => onChange(5, v)} />}
        {opType === 4 && (
          <select className="prop-select" value={num(params[5])} onChange={(e) => onChange(5, Number(e.target.value))}>
            <option value={0}>Level</option>
            <option value={1}>EXP</option>
            <option value={2}>HP</option>
            <option value={3}>SP</option>
            <option value={4}>Max HP</option>
            <option value={5}>Max SP</option>
            <option value={6}>STR</option>
            <option value={7}>DEX</option>
            <option value={8}>AGI</option>
            <option value={9}>INT</option>
            <option value={10}>ATK</option>
            <option value={11}>PDEF</option>
            <option value={12}>MDEF</option>
            <option value={13}>EVA</option>
          </select>
        )}
        {opType === 6 && (
          <select className="prop-select" value={num(params[5])} onChange={(e) => onChange(5, Number(e.target.value))}>
            <option value={0}>Map X</option>
            <option value={1}>Map Y</option>
            <option value={2}>Direction</option>
            <option value={3}>Screen X</option>
            <option value={4}>Screen Y</option>
            <option value={5}>Terrain Tag</option>
          </select>
        )}
        {opType === 7 && (
          <select className="prop-select" value={num(params[4])} onChange={(e) => onChange(4, Number(e.target.value))}>
            <option value={0}>Map ID</option>
            <option value={1}>Party Members</option>
            <option value={2}>Gold</option>
            <option value={3}>Steps</option>
            <option value={4}>Play Time</option>
            <option value={5}>Timer</option>
            <option value={6}>Save Count</option>
          </select>
        )}
      </div>
    </EditorShell>
  );
}

// --- Control Self Switch (123) ---
export function ControlSelfSwitchEditor({ params, onChange, onDone }: EditorProps) {
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

// --- Control Timer (124) ---
// params: [operation (0=start, 1=stop), seconds]
export function ControlTimerEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Control Timer" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Start</option>
          <option value={1}>Stop</option>
        </select>
      </div>
      {num(params[0]) === 0 && (
        <div className="cmd-param-row">
          <NInput label="Minutes:" value={Math.floor(num(params[1]) / 60)} onChange={(v) => onChange(1, v * 60 + (num(params[1]) % 60))} min={0} />
          <NInput label="Sec:" value={num(params[1]) % 60} onChange={(v) => onChange(1, Math.floor(num(params[1]) / 60) * 60 + v)} min={0} max={59} />
        </div>
      )}
    </EditorShell>
  );
}

// --- Change Gold (125) ---
export function ChangeGoldEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Gold" onDone={onDone}>
      <IncDecOperand params={params} onChange={onChange} startIdx={0} />
    </EditorShell>
  );
}

// --- Change Items (126) ---
export function ChangeItemsEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Items" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Item ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// --- Change Weapons (127) ---
export function ChangeWeaponsEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Weapons" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Weapon ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// --- Change Armor (128) ---
export function ChangeArmorEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Armor" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Armor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// --- Change Party Member (129) ---
// params: [actor_id, operation (0=add, 1=remove), initialize]
export function ChangePartyMemberEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Party Member" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Add</option>
          <option value={1}>Remove</option>
        </select>
      </div>
      {num(params[1]) === 0 && (
        <div className="cmd-param-row">
          <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#6c6f85", fontSize: 12 }}>
            <input type="checkbox" checked={num(params[2]) === 1}
              onChange={(e) => onChange(2, e.target.checked ? 1 : 0)} />
            Initialize
          </label>
        </div>
      )}
    </EditorShell>
  );
}
