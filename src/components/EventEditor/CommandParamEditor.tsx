/**
 * Inline parameter editors for RMXP event commands.
 * Renders appropriate UI controls for editing command parameters.
 * Covers all 90 official RMXP event command types.
 */

import type { EventCommand, MapInfo } from "../../types";

interface Props {
  command: EventCommand;
  onChange: (paramIndex: number, value: unknown) => void;
  onDone: () => void;
  mapInfos?: Record<number, MapInfo>;
  switchNames?: string[];
  variableNames?: string[];
}

/** All command codes that have a dedicated parameter editor. */
const EDITOR_CODES = new Set([
  102, 103, 104, 105, 106,
  111, 117, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  131, 132, 133, 134, 135, 136,
  201, 202, 203, 204, 205, 206, 207, 208,
  221, 222, 223, 224, 225,
  231, 232, 233, 234, 235, 236,
  241, 242, 245, 246, 249, 250,
  301, 302, 303,
  311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322,
  331, 332, 333, 334, 335, 336, 337, 338, 339,
]);

/**
 * Returns true if this command code has a dedicated parameter editor.
 */
export function hasParamEditor(code: number): boolean {
  return EDITOR_CODES.has(code);
}

/**
 * Renders a parameter editor for the given command.
 */
export function CommandParamEditor({ command, onChange, onDone, mapInfos, switchNames, variableNames }: Props) {
  const p = command.parameters;

  switch (command.code) {
    // --- Message ---
    case 102: return <ShowChoicesEditor params={p} onChange={onChange} onDone={onDone} />;
    case 103: return <InputNumberEditor params={p} onChange={onChange} onDone={onDone} />;
    case 104: return <ChangeTextOptionsEditor params={p} onChange={onChange} onDone={onDone} />;
    case 105: return <ButtonInputEditor params={p} onChange={onChange} onDone={onDone} />;
    case 106: return <WaitEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- Flow Control ---
    case 111: return <ConditionalBranchEditor params={p} onChange={onChange} onDone={onDone} switchNames={switchNames} variableNames={variableNames} />;
    case 117: return <CallCommonEventEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- Game Progression ---
    case 121: return <ControlSwitchesEditor params={p} onChange={onChange} onDone={onDone} switchNames={switchNames} />;
    case 122: return <ControlVariablesEditor params={p} onChange={onChange} onDone={onDone} variableNames={variableNames} />;
    case 123: return <ControlSelfSwitchEditor params={p} onChange={onChange} onDone={onDone} />;
    case 124: return <ControlTimerEditor params={p} onChange={onChange} onDone={onDone} />;
    case 125: return <ChangeGoldEditor params={p} onChange={onChange} onDone={onDone} />;
    case 126: return <ChangeItemsEditor params={p} onChange={onChange} onDone={onDone} />;
    case 127: return <ChangeWeaponsEditor params={p} onChange={onChange} onDone={onDone} />;
    case 128: return <ChangeArmorEditor params={p} onChange={onChange} onDone={onDone} />;
    case 129: return <ChangePartyMemberEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- System ---
    case 131: return <ChangeWindowskinEditor params={p} onChange={onChange} onDone={onDone} />;
    case 132: return <AudioParamEditor title="Change Battle BGM" audioType="bgm" params={p} onChange={onChange} onDone={onDone} />;
    case 133: return <AudioParamEditor title="Change Battle End ME" audioType="me" params={p} onChange={onChange} onDone={onDone} />;
    case 134: return <ToggleEditor title="Change Save Access" onLabel="Enable" offLabel="Disable" params={p} onChange={onChange} onDone={onDone} />;
    case 135: return <ToggleEditor title="Change Menu Access" onLabel="Enable" offLabel="Disable" params={p} onChange={onChange} onDone={onDone} />;
    case 136: return <ToggleEditor title="Change Encounter" onLabel="Enable" offLabel="Disable" params={p} onChange={onChange} onDone={onDone} />;
    // --- Map ---
    case 201: return <TransferPlayerEditor params={p} onChange={onChange} onDone={onDone} mapInfos={mapInfos} />;
    case 202: return <SetEventLocationEditor params={p} onChange={onChange} onDone={onDone} />;
    case 203: return <ScrollMapEditor params={p} onChange={onChange} onDone={onDone} />;
    case 204: return <ChangeMapSettingsEditor params={p} onChange={onChange} onDone={onDone} />;
    case 205: return <ColorToneEditor title="Change Fog Color Tone" params={p} onChange={onChange} onDone={onDone} />;
    case 206: return <OpacityDurationEditor title="Change Fog Opacity" params={p} onChange={onChange} onDone={onDone} />;
    case 207: return <ShowAnimationEditor params={p} onChange={onChange} onDone={onDone} />;
    case 208: return <ToggleEditor title="Change Transparent Flag" onLabel="Transparent" offLabel="Normal" params={p} onChange={onChange} onDone={onDone} />;
    // --- Screen Effects ---
    case 221: return <SimpleEditor title="Prepare for Transition" onDone={onDone} />;
    case 222: return <ExecuteTransitionEditor params={p} onChange={onChange} onDone={onDone} />;
    case 223: return <ColorToneEditor title="Change Screen Color Tone" params={p} onChange={onChange} onDone={onDone} />;
    case 224: return <FlashEditor title="Screen Flash" params={p} onChange={onChange} onDone={onDone} />;
    case 225: return <ScreenShakeEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- Picture & Weather ---
    case 231: return <ShowPictureEditor params={p} onChange={onChange} onDone={onDone} />;
    case 232: return <MovePictureEditor params={p} onChange={onChange} onDone={onDone} />;
    case 233: return <RotatePictureEditor params={p} onChange={onChange} onDone={onDone} />;
    case 234: return <PictureColorToneEditor params={p} onChange={onChange} onDone={onDone} />;
    case 235: return <ErasePictureEditor params={p} onChange={onChange} onDone={onDone} />;
    case 236: return <WeatherEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- Audio ---
    case 241: return <AudioParamEditor title="Play BGM" audioType="bgm" params={p} onChange={onChange} onDone={onDone} />;
    case 242: return <FadeOutEditor title="Fade Out BGM" params={p} onChange={onChange} onDone={onDone} />;
    case 245: return <AudioParamEditor title="Play BGS" audioType="bgs" params={p} onChange={onChange} onDone={onDone} />;
    case 246: return <FadeOutEditor title="Fade Out BGS" params={p} onChange={onChange} onDone={onDone} />;
    case 249: return <AudioParamEditor title="Play ME" audioType="me" params={p} onChange={onChange} onDone={onDone} />;
    case 250: return <AudioParamEditor title="Play SE" audioType="se" params={p} onChange={onChange} onDone={onDone} />;
    // --- Battle Processing ---
    case 301: return <BattleProcessingEditor params={p} onChange={onChange} onDone={onDone} />;
    case 302: return <ShopProcessingEditor params={p} onChange={onChange} onDone={onDone} />;
    case 303: return <NameInputEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- Actor ---
    case 311: return <ChangeHPEditor params={p} onChange={onChange} onDone={onDone} />;
    case 312: return <ChangeSPEditor params={p} onChange={onChange} onDone={onDone} />;
    case 313: return <ChangeStateEditor params={p} onChange={onChange} onDone={onDone} />;
    case 314: return <RecoverAllEditor title="Recover All" params={p} onChange={onChange} onDone={onDone} />;
    case 315: return <ChangeEXPEditor params={p} onChange={onChange} onDone={onDone} />;
    case 316: return <ChangeLevelEditor params={p} onChange={onChange} onDone={onDone} />;
    case 317: return <ChangeParametersEditor params={p} onChange={onChange} onDone={onDone} />;
    case 318: return <ChangeSkillsEditor params={p} onChange={onChange} onDone={onDone} />;
    case 319: return <ChangeEquipmentEditor params={p} onChange={onChange} onDone={onDone} />;
    case 320: return <ChangeActorNameEditor params={p} onChange={onChange} onDone={onDone} />;
    case 321: return <ChangeActorClassEditor params={p} onChange={onChange} onDone={onDone} />;
    case 322: return <ChangeActorGraphicEditor params={p} onChange={onChange} onDone={onDone} />;
    // --- Enemy (battle) ---
    case 331: return <ChangeEnemyHPEditor params={p} onChange={onChange} onDone={onDone} />;
    case 332: return <ChangeEnemySPEditor params={p} onChange={onChange} onDone={onDone} />;
    case 333: return <ChangeEnemyStateEditor params={p} onChange={onChange} onDone={onDone} />;
    case 334: return <RecoverAllEditor title="Enemy Recover All" params={p} onChange={onChange} onDone={onDone} />;
    case 335: return <EnemyAppearEditor params={p} onChange={onChange} onDone={onDone} />;
    case 336: return <EnemyTransformEditor params={p} onChange={onChange} onDone={onDone} />;
    case 337: return <ShowBattleAnimationEditor params={p} onChange={onChange} onDone={onDone} />;
    case 338: return <DealDamageEditor params={p} onChange={onChange} onDone={onDone} />;
    case 339: return <ForceActionEditor params={p} onChange={onChange} onDone={onDone} />;
    default: return null;
  }
}

// ══════════════════════════════════════════════════════════
// Shared components
// ══════════════════════════════════════════════════════════

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

/** Dropdown picker for named switch/variable IDs. Falls back to NInput if no names available. */
function NamedIdPicker({ label, value, onChange, names, fallbackLabel }: {
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

function TInput({ value, onChange, label, placeholder }: {
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
function IncDecOperand({ params, onChange, startIdx }: {
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
function ActorSelector({ params, onChange, idx }: {
  params: unknown[]; onChange: (i: number, v: unknown) => void; idx: number;
}) {
  return (
    <div className="cmd-param-row">
      <NInput label="Actor ID:" value={num(params[idx])} onChange={(v) => onChange(idx, v)} min={1} />
      <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(0 = entire party)</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Message commands
// ══════════════════════════════════════════════════════════

// --- Show Choices (102) ---
// params: [choices_array, cancel_type]
function ShowChoicesEditor({ params, onChange, onDone }: EditorProps) {
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
function InputNumberEditor({ params, onChange, onDone }: EditorProps) {
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
function ChangeTextOptionsEditor({ params, onChange, onDone }: EditorProps) {
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
function ButtonInputEditor({ params, onChange, onDone }: EditorProps) {
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
function WaitEditor({ params, onChange, onDone }: EditorProps) {
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

// ══════════════════════════════════════════════════════════
// Flow Control
// ══════════════════════════════════════════════════════════

// --- Conditional Branch (111) ---
function ConditionalBranchEditor({ params, onChange, onDone, switchNames, variableNames }: EditorProps & { switchNames?: string[]; variableNames?: string[] }) {
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
function CallCommonEventEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Call Common Event" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Common Event ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Game Progression
// ══════════════════════════════════════════════════════════

// --- Control Switches (121) ---
function ControlSwitchesEditor({ params, onChange, onDone, switchNames }: EditorProps & { switchNames?: string[] }) {
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
function ControlVariablesEditor({ params, onChange, onDone, variableNames }: EditorProps & { variableNames?: string[] }) {
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

// --- Control Timer (124) ---
// params: [operation (0=start, 1=stop), seconds]
function ControlTimerEditor({ params, onChange, onDone }: EditorProps) {
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
function ChangeGoldEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Gold" onDone={onDone}>
      <IncDecOperand params={params} onChange={onChange} startIdx={0} />
    </EditorShell>
  );
}

// --- Change Items (126) ---
function ChangeItemsEditor({ params, onChange, onDone }: EditorProps) {
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
function ChangeWeaponsEditor({ params, onChange, onDone }: EditorProps) {
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
function ChangeArmorEditor({ params, onChange, onDone }: EditorProps) {
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
function ChangePartyMemberEditor({ params, onChange, onDone }: EditorProps) {
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

// ══════════════════════════════════════════════════════════
// System
// ══════════════════════════════════════════════════════════

function ChangeWindowskinEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Windowskin" onDone={onDone}>
      <div className="cmd-param-row">
        <TInput label="Filename:" value={str(params[0])} onChange={(v) => onChange(0, v)} />
      </div>
    </EditorShell>
  );
}

// Reusable toggle for Enable/Disable commands (134, 135, 136, 208)
function ToggleEditor({ title, onLabel, offLabel, params, onChange, onDone }: EditorProps & { title: string; onLabel: string; offLabel: string }) {
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

// ══════════════════════════════════════════════════════════
// Audio
// ══════════════════════════════════════════════════════════

// Generic audio editor for Play BGM/BGS/ME/SE and Change Battle BGM/ME
function AudioParamEditor({ title, params, onChange, onDone }: EditorProps & { title: string; audioType?: string }) {
  const audio = (params[0] && typeof params[0] === "object" && !Array.isArray(params[0]))
    ? params[0] as Record<string, unknown>
    : { name: str(params[0]), volume: 100, pitch: 100 };

  const updateAudio = (field: string, val: unknown) => {
    onChange(0, { ...audio, [field]: val });
  };

  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <TInput label="File:" value={str(audio.name)} onChange={(v) => updateAudio("name", v)} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Volume:" value={num(audio.volume)} onChange={(v) => updateAudio("volume", v)} min={0} max={100} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Pitch:" value={num(audio.pitch)} onChange={(v) => updateAudio("pitch", v)} min={50} max={150} />
      </div>
    </EditorShell>
  );
}

// Fade Out BGM (242) / Fade Out BGS (246)
function FadeOutEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Seconds:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={60} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Map
// ══════════════════════════════════════════════════════════

// --- Transfer Player (201) ---
function TransferPlayerEditor({ params, onChange, onDone, mapInfos }: EditorProps & { mapInfos?: Record<number, MapInfo> }) {
  const direct = num(params[0]) === 0;

  // Build sorted map list for the dropdown
  const mapEntries = mapInfos
    ? Object.entries(mapInfos)
        .map(([id, info]) => ({ id: Number(id), name: info.name }))
        .sort((a, b) => a.id - b.id)
    : [];

  return (
    <EditorShell title="Transfer Player" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Direct designation</option>
          <option value={1}>Variable designation</option>
        </select>
      </div>
      <div className="cmd-param-row">
        {direct && mapEntries.length > 0 ? (
          <>
            <span className="cmd-param-label">Map:</span>
            <select
              className="prop-select"
              value={num(params[1])}
              onChange={(e) => onChange(1, Number(e.target.value))}
              style={{ flex: 1 }}
            >
              {mapEntries.map((m) => (
                <option key={m.id} value={m.id}>
                  [{String(m.id).padStart(3, "0")}] {m.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <NInput label={direct ? "Map:" : "Map Var:"} value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        )}
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

// --- Set Event Location (202) ---
// params: [event_id, type (0=direct, 1=variable, 2=swap), p1, p2, direction]
function SetEventLocationEditor({ params, onChange, onDone }: EditorProps) {
  const locType = num(params[1]);
  return (
    <EditorShell title="Set Event Location" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Event ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={locType} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Direct</option>
          <option value={1}>Variable</option>
          <option value={2}>Swap with event</option>
        </select>
      </div>
      {locType < 2 && (
        <div className="cmd-param-row">
          <NInput label={locType === 0 ? "X:" : "X Var:"} value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
          <NInput label={locType === 0 ? "Y:" : "Y Var:"} value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} />
        </div>
      )}
      {locType === 2 && (
        <div className="cmd-param-row">
          <NInput label="Swap Event ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
        </div>
      )}
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

// --- Scroll Map (203) ---
// params: [direction, distance, speed]
function ScrollMapEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Scroll Map" onDone={onDone}>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Direction:</span>
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={2}>Down</option>
          <option value={4}>Left</option>
          <option value={6}>Right</option>
          <option value={8}>Up</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="Distance:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        <NInput label="Speed:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} max={6} />
      </div>
    </EditorShell>
  );
}

// --- Change Map Settings (204) ---
// params: [type (0=panorama, 1=fog, 2=battleback), name, ...]
function ChangeMapSettingsEditor({ params, onChange, onDone }: EditorProps) {
  const settingType = num(params[0]);
  return (
    <EditorShell title="Change Map Settings" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={settingType} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Panorama</option>
          <option value={1}>Fog</option>
          <option value={2}>Battle Background</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <TInput label="Filename:" value={str(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
      {settingType === 0 && (
        <div className="cmd-param-row">
          <NInput label="Hue:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} max={360} />
        </div>
      )}
      {settingType === 1 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Hue:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} max={360} />
            <NInput label="Opacity:" value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} max={255} />
          </div>
          <div className="cmd-param-row">
            <NInput label="Blend:" value={num(params[4])} onChange={(v) => onChange(4, v)} min={0} max={2} />
            <NInput label="Zoom:" value={num(params[5])} onChange={(v) => onChange(5, v)} min={100} max={800} />
          </div>
          <div className="cmd-param-row">
            <NInput label="SX:" value={num(params[6])} onChange={(v) => onChange(6, v)} />
            <NInput label="SY:" value={num(params[7])} onChange={(v) => onChange(7, v)} />
          </div>
        </>
      )}
    </EditorShell>
  );
}

// --- Show Animation (207) ---
// params: [character_id, animation_id]
function ShowAnimationEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Show Animation" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Character:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={-1} />
        <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(-1=player, 0=this)</span>
      </div>
      <div className="cmd-param-row">
        <NInput label="Animation ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Screen Effects
// ══════════════════════════════════════════════════════════

function SimpleEditor({ title, onDone }: { title: string; onDone: () => void }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row" style={{ color: "#8c8fa1", fontSize: 11 }}>No parameters needed.</div>
    </EditorShell>
  );
}

// Execute Transition (222)
// params: [filename]
function ExecuteTransitionEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Execute Transition" onDone={onDone}>
      <div className="cmd-param-row">
        <TInput label="Graphic:" value={str(params[0])} onChange={(v) => onChange(0, v)} placeholder="(empty = default fade)" />
      </div>
    </EditorShell>
  );
}

// Color Tone (223, 205) — params: [Tone(r,g,b,gray), duration]
function ColorToneEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  const tone = (params[0] && typeof params[0] === "object" && !Array.isArray(params[0]))
    ? params[0] as Record<string, unknown>
    : { red: 0, green: 0, blue: 0, gray: 0 };

  const updateTone = (field: string, val: number) => {
    onChange(0, { ...tone, [field]: val });
  };

  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="R:" value={num(tone.red)} onChange={(v) => updateTone("red", v)} min={-255} max={255} />
        <NInput label="G:" value={num(tone.green)} onChange={(v) => updateTone("green", v)} min={-255} max={255} />
        <NInput label="B:" value={num(tone.blue)} onChange={(v) => updateTone("blue", v)} min={-255} max={255} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Gray:" value={num(tone.gray)} onChange={(v) => updateTone("gray", v)} min={0} max={255} />
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// Flash (224) — params: [Color(r,g,b,a), duration]
function FlashEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  const color = (params[0] && typeof params[0] === "object" && !Array.isArray(params[0]))
    ? params[0] as Record<string, unknown>
    : { red: 255, green: 255, blue: 255, alpha: 255 };

  const updateColor = (field: string, val: number) => {
    onChange(0, { ...color, [field]: val });
  };

  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="R:" value={num(color.red)} onChange={(v) => updateColor("red", v)} min={0} max={255} />
        <NInput label="G:" value={num(color.green)} onChange={(v) => updateColor("green", v)} min={0} max={255} />
        <NInput label="B:" value={num(color.blue)} onChange={(v) => updateColor("blue", v)} min={0} max={255} />
        <NInput label="A:" value={num(color.alpha)} onChange={(v) => updateColor("alpha", v)} min={0} max={255} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Screen Shake (225) — params: [power, speed, duration]
function ScreenShakeEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Screen Shake" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Power:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={9} />
        <NInput label="Speed:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} max={9} />
        <NInput label="Frames:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Opacity+Duration (206)
function OpacityDurationEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Opacity:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={255} />
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Picture & Weather
// ══════════════════════════════════════════════════════════

// Show Picture (231) — params: [number, name, origin, type, p1, p2, zoom_x, zoom_y, opacity, blend_type]
function ShowPictureEditor({ params, onChange, onDone }: EditorProps) {
  const posType = num(params[3]);
  return (
    <EditorShell title="Show Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
      </div>
      <div className="cmd-param-row">
        <TInput label="Filename:" value={str(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Origin:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Upper Left</option>
          <option value={1}>Center</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={posType} onChange={(e) => onChange(3, Number(e.target.value))}>
          <option value={0}>Direct</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label={posType === 0 ? "X:" : "X Var:"} value={num(params[4])} onChange={(v) => onChange(4, v)} />
        <NInput label={posType === 0 ? "Y:" : "Y Var:"} value={num(params[5])} onChange={(v) => onChange(5, v)} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Zoom X%:" value={num(params[6]) || 100} onChange={(v) => onChange(6, v)} min={1} />
        <NInput label="Zoom Y%:" value={num(params[7]) || 100} onChange={(v) => onChange(7, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Opacity:" value={num(params[8]) ?? 255} onChange={(v) => onChange(8, v)} min={0} max={255} />
        <span className="cmd-param-label">Blend:</span>
        <select className="prop-select" value={num(params[9])} onChange={(e) => onChange(9, Number(e.target.value))}>
          <option value={0}>Normal</option>
          <option value={1}>Add</option>
          <option value={2}>Sub</option>
        </select>
      </div>
    </EditorShell>
  );
}

// Move Picture (232) — same structure + duration
function MovePictureEditor({ params, onChange, onDone }: EditorProps) {
  const posType = num(params[3]);
  return (
    <EditorShell title="Move Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Origin:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Upper Left</option>
          <option value={1}>Center</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={posType} onChange={(e) => onChange(3, Number(e.target.value))}>
          <option value={0}>Direct</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label={posType === 0 ? "X:" : "X Var:"} value={num(params[4])} onChange={(v) => onChange(4, v)} />
        <NInput label={posType === 0 ? "Y:" : "Y Var:"} value={num(params[5])} onChange={(v) => onChange(5, v)} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Zoom X%:" value={num(params[6]) || 100} onChange={(v) => onChange(6, v)} min={1} />
        <NInput label="Zoom Y%:" value={num(params[7]) || 100} onChange={(v) => onChange(7, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Opacity:" value={num(params[8]) ?? 255} onChange={(v) => onChange(8, v)} min={0} max={255} />
        <span className="cmd-param-label">Blend:</span>
        <select className="prop-select" value={num(params[9])} onChange={(e) => onChange(9, Number(e.target.value))}>
          <option value={0}>Normal</option>
          <option value={1}>Add</option>
          <option value={2}>Sub</option>
        </select>
      </div>
    </EditorShell>
  );
}

// Rotate Picture (233) — params: [number, speed]
function RotatePictureEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Rotate Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
        <NInput label="Speed:" value={num(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
    </EditorShell>
  );
}

// Picture Color Tone (234) — params: [number, tone, duration]
function PictureColorToneEditor({ params, onChange, onDone }: EditorProps) {
  const tone = (params[1] && typeof params[1] === "object" && !Array.isArray(params[1]))
    ? params[1] as Record<string, unknown>
    : { red: 0, green: 0, blue: 0, gray: 0 };

  const updateTone = (field: string, val: number) => {
    onChange(1, { ...tone, [field]: val });
  };

  return (
    <EditorShell title="Change Picture Color Tone" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
      </div>
      <div className="cmd-param-row">
        <NInput label="R:" value={num(tone.red)} onChange={(v) => updateTone("red", v)} min={-255} max={255} />
        <NInput label="G:" value={num(tone.green)} onChange={(v) => updateTone("green", v)} min={-255} max={255} />
        <NInput label="B:" value={num(tone.blue)} onChange={(v) => updateTone("blue", v)} min={-255} max={255} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Gray:" value={num(tone.gray)} onChange={(v) => updateTone("gray", v)} min={0} max={255} />
        <NInput label="Frames:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// Erase Picture (235) — params: [number]
function ErasePictureEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Erase Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
      </div>
    </EditorShell>
  );
}

// Weather (236) — params: [type, power, duration]
function WeatherEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Set Weather Effects" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>None</option>
          <option value={1}>Rain</option>
          <option value={2}>Storm</option>
          <option value={3}>Snow</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="Power:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} max={50} />
        <NInput label="Frames:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Battle Processing
// ══════════════════════════════════════════════════════════

// Battle Processing (301) — params: [troop_id, can_escape, can_lose]
function BattleProcessingEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Battle Processing" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Troop ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#6c6f85", fontSize: 12 }}>
          <input type="checkbox" checked={!!params[1]}
            onChange={(e) => onChange(1, e.target.checked)} /> Can Escape
        </label>
      </div>
      <div className="cmd-param-row">
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#6c6f85", fontSize: 12 }}>
          <input type="checkbox" checked={!!params[2]}
            onChange={(e) => onChange(2, e.target.checked)} /> Can Lose
        </label>
      </div>
    </EditorShell>
  );
}

// Shop Processing (302) — params: [item_type, item_id]
// item_type: 0=item, 1=weapon, 2=armor. First merchandise item.
// Additional items use code 605 continuations (handled by event list).
function ShopProcessingEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Shop Processing" onDone={onDone}>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Type:</span>
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Item</option>
          <option value={1}>Weapon</option>
          <option value={2}>Armor</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
      <div className="cmd-param-row" style={{ fontSize: 10, color: "#8c8fa1" }}>
        First merchandise item. Add more items below this command using code 605 continuations.
      </div>
    </EditorShell>
  );
}

// Name Input (303) — params: [actor_id, max_chars]
function NameInputEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Name Input Processing" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
        <NInput label="Max chars:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} max={8} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Actor commands (311-322)
// ══════════════════════════════════════════════════════════

// Change HP (311) — params: [actor_id, operation, operand_type, operand, allow_death]
function ChangeHPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change HP" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
      <div className="cmd-param-row">
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#6c6f85", fontSize: 12 }}>
          <input type="checkbox" checked={!!params[4]}
            onChange={(e) => onChange(4, e.target.checked)} /> Allow Death (HP = 0)
        </label>
      </div>
    </EditorShell>
  );
}

// Change SP (312) — params: [actor_id, operation, operand_type, operand]
function ChangeSPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change SP" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change State (313) — params: [actor_id, operation (0=add, 1=remove), state_id]
function ChangeStateEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change State" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Add</option>
          <option value={1}>Remove</option>
        </select>
        <NInput label="State ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Recover All (314) / Enemy Recover All (334) — params: [id]
function RecoverAllEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} />
        <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(0 = all)</span>
      </div>
    </EditorShell>
  );
}

// Change EXP (315) — params: [actor_id, operation, operand_type, operand]
function ChangeEXPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change EXP" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change Level (316) — same structure as EXP
function ChangeLevelEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Level" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change Parameters (317) — params: [actor_id, param_type, operation, operand_type, operand]
function ChangeParametersEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Parameters" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <div className="cmd-param-row">
        <span className="cmd-param-label">Param:</span>
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Max HP</option>
          <option value={1}>Max SP</option>
          <option value={2}>STR</option>
          <option value={3}>DEX</option>
          <option value={4}>AGI</option>
          <option value={5}>INT</option>
        </select>
      </div>
      <IncDecOperand params={params} onChange={onChange} startIdx={2} />
    </EditorShell>
  );
}

// Change Skills (318) — params: [actor_id, operation (0=learn, 1=forget), skill_id]
function ChangeSkillsEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Skills" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Learn</option>
          <option value={1}>Forget</option>
        </select>
        <NInput label="Skill ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Change Equipment (319) — params: [actor_id, equip_type, equip_id]
function ChangeEquipmentEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Equipment" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Slot:</span>
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Weapon</option>
          <option value={1}>Shield</option>
          <option value={2}>Helmet</option>
          <option value={3}>Body Armor</option>
          <option value={4}>Accessory</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
        <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(0 = unequip)</span>
      </div>
    </EditorShell>
  );
}

// Change Actor Name (320) — params: [actor_id, name]
function ChangeActorNameEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Actor Name" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <TInput label="Name:" value={str(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
    </EditorShell>
  );
}

// Change Actor Class (321) — params: [actor_id, class_id]
function ChangeActorClassEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Actor Class" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
        <NInput label="Class ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Change Actor Graphic (322) — params: [actor_id, character_name, character_hue, battler_name, battler_hue]
function ChangeActorGraphicEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Actor Graphic" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <TInput label="Character:" value={str(params[1])} onChange={(v) => onChange(1, v)} />
        <NInput label="Hue:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} max={360} />
      </div>
      <div className="cmd-param-row">
        <TInput label="Battler:" value={str(params[3])} onChange={(v) => onChange(3, v)} />
        <NInput label="Hue:" value={num(params[4])} onChange={(v) => onChange(4, v)} min={0} max={360} />
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Enemy commands (331-339)
// ══════════════════════════════════════════════════════════

// Change Enemy HP (331) — params: [enemy_index, operation, operand_type, operand, allow_death]
function ChangeEnemyHPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Enemy HP" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Enemy Index:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={7} />
      </div>
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
      <div className="cmd-param-row">
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#6c6f85", fontSize: 12 }}>
          <input type="checkbox" checked={!!params[4]}
            onChange={(e) => onChange(4, e.target.checked)} /> Allow Death
        </label>
      </div>
    </EditorShell>
  );
}

// Change Enemy SP (332) — params: [enemy_index, operation, operand_type, operand]
function ChangeEnemySPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Enemy SP" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Enemy Index:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={7} />
      </div>
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change Enemy State (333) — params: [enemy_index, operation (0=add, 1=remove), state_id]
function ChangeEnemyStateEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Enemy State" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Enemy Index:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={7} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[1])} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Add</option>
          <option value={1}>Remove</option>
        </select>
        <NInput label="State ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Enemy Appear (335) — params: [enemy_index]
function EnemyAppearEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Enemy Appearance" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Enemy Index:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={7} />
      </div>
    </EditorShell>
  );
}

// Enemy Transform (336) — params: [enemy_index, new_enemy_id]
function EnemyTransformEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Enemy Transform" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Enemy Index:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={7} />
        <NInput label="Transform to ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Show Battle Animation (337) — params: [target_type (0=enemy, 1=actor), target_index, animation_id]
function ShowBattleAnimationEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Show Battle Animation" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Enemy</option>
          <option value={1}>Actor</option>
        </select>
        <NInput label="Index:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Animation ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Deal Damage (338) — params: [target_type (0=enemy, 1=actor), target_index, operand_type, operand]
function DealDamageEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Deal Damage" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Enemy</option>
          <option value={1}>Actor</option>
        </select>
        <NInput label="Index:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Constant</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label="Value:" value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// Force Action (339) — params: [target_type, target_index, kind, basic_or_skill_id, target_index2, forcing]
function ForceActionEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Force Action" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Enemy</option>
          <option value={1}>Actor</option>
        </select>
        <NInput label="Index:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Action:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Basic</option>
          <option value={1}>Skill</option>
        </select>
        {num(params[2]) === 0 ? (
          <select className="prop-select" value={num(params[3])} onChange={(e) => onChange(3, Number(e.target.value))}>
            <option value={0}>Attack</option>
            <option value={1}>Defend</option>
            <option value={2}>Escape</option>
            <option value={3}>Do Nothing</option>
          </select>
        ) : (
          <NInput label="Skill ID:" value={num(params[3])} onChange={(v) => onChange(3, v)} min={1} />
        )}
      </div>
      <div className="cmd-param-row">
        <NInput label="Target:" value={num(params[4])} onChange={(v) => onChange(4, v)} min={-1} />
        <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(-1 = last target)</span>
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Execute:</span>
        <select className="prop-select" value={num(params[5])} onChange={(e) => onChange(5, Number(e.target.value))}>
          <option value={0}>On Turn</option>
          <option value={1}>Immediately</option>
        </select>
      </div>
    </EditorShell>
  );
}

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
