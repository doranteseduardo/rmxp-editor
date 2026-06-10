import type { EditorProps } from "../types";
import { EditorShell, NInput, num } from "../shared";

// Battle Processing (301) — params: [troop_id, can_escape, can_lose]
export function BattleProcessingEditor({ params, onChange, onDone }: EditorProps) {
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
export function ShopProcessingEditor({ params, onChange, onDone }: EditorProps) {
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
export function NameInputEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Name Input Processing" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Actor ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
        <NInput label="Max chars:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} max={8} />
      </div>
    </EditorShell>
  );
}
