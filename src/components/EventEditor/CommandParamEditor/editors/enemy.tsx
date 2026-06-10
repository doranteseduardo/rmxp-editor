import type { EditorProps } from "../types";
import { EditorShell, NInput, IncDecOperand, num } from "../shared";

// Change Enemy HP (331) — params: [enemy_index, operation, operand_type, operand, allow_death]
export function ChangeEnemyHPEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeEnemySPEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeEnemyStateEditor({ params, onChange, onDone }: EditorProps) {
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
export function EnemyAppearEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Enemy Appearance" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Enemy Index:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={7} />
      </div>
    </EditorShell>
  );
}

// Enemy Transform (336) — params: [enemy_index, new_enemy_id]
export function EnemyTransformEditor({ params, onChange, onDone }: EditorProps) {
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
export function ShowBattleAnimationEditor({ params, onChange, onDone }: EditorProps) {
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
export function DealDamageEditor({ params, onChange, onDone }: EditorProps) {
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
export function ForceActionEditor({ params, onChange, onDone }: EditorProps) {
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
