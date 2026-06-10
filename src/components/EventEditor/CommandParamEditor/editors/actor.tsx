import type { EditorProps } from "../types";
import { EditorShell, NInput, TInput, ActorSelector, IncDecOperand, num, str } from "../shared";

// Change HP (311) — params: [actor_id, operation, operand_type, operand, allow_death]
export function ChangeHPEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeSPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change SP" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change State (313) — params: [actor_id, operation (0=add, 1=remove), state_id]
export function ChangeStateEditor({ params, onChange, onDone }: EditorProps) {
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
export function RecoverAllEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
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
export function ChangeEXPEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change EXP" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change Level (316) — same structure as EXP
export function ChangeLevelEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Change Level" onDone={onDone}>
      <ActorSelector params={params} onChange={onChange} idx={0} />
      <IncDecOperand params={params} onChange={onChange} startIdx={1} />
    </EditorShell>
  );
}

// Change Parameters (317) — params: [actor_id, param_type, operation, operand_type, operand]
export function ChangeParametersEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeSkillsEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeEquipmentEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeActorNameEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeActorClassEditor({ params, onChange, onDone }: EditorProps) {
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
export function ChangeActorGraphicEditor({ params, onChange, onDone }: EditorProps) {
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
