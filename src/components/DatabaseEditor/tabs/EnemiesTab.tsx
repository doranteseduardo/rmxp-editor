import type { RpgEnemy, RpgEnemyAction } from "../../../types/rpgTypes";
import { useDatabase } from "../useDatabase";
import { useDatabaseNames } from "../DatabaseContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import { DatabaseListPanel } from "../DatabaseListPanel";
import { IdSelect } from "../controls/IdSelect";
import { AssetPicker } from "../controls/AssetPicker";
import { RankTableEditor } from "../controls/RankTableEditor";
import { useState } from "react";

interface Props { projectPath: string }

const ACTION_KINDS = ["Basic", "Skill"];
const BASIC_ACTIONS = ["Attack", "Defend", "Escape", "Do Nothing"];

const DEFAULT: RpgEnemy = {
  __class: "RPG::Enemy", id: 0, name: "New Enemy",
  battler_name: "", battler_hue: 0,
  maxhp: 500, maxsp: 500, str: 50, dex: 50, agi: 50, int: 50,
  atk: 100, pdef: 100, mdef: 100, eva: 0,
  animation1_id: 0, animation2_id: 0,
  element_ranks: { __class: "Table" }, state_ranks: { __class: "Table" },
  actions: [{ __class: "RPG::Enemy::Action", kind: 0, basic: 0, skill_id: 1, condition_turn_a: 0, condition_turn_b: 1, condition_hp: 100, condition_level: 1, condition_switch_id: 0, rating: 5 }],
  exp: 0, gold: 0, item_id: 0, weapon_id: 0, armor_id: 0, treasure_prob: 100,
};

export function EnemiesTab({ projectPath }: Props) {
  const db = useDatabase(projectPath, "Enemies.rxdata");
  useEditorRegistration("db-Enemies.rxdata", db.save, db.cancel, db.dirty);
  const names = useDatabaseNames();
  const e = db.selected as RpgEnemy | null;
  const [selAction, setSelAction] = useState(-1);

  if (db.loading) return <div className="db-loading">Loading Enemies...</div>;
  if (db.error) return <div className="db-loading" style={{ color: "#f38ba8" }}>{db.error}</div>;

  const u = (patch: Partial<RpgEnemy>) => db.update(patch);

  const addAction = () => {
    if (!e) return;
    const a: RpgEnemyAction = { __class: "RPG::Enemy::Action", kind: 0, basic: 0, skill_id: 1, condition_turn_a: 0, condition_turn_b: 1, condition_hp: 100, condition_level: 1, condition_switch_id: 0, rating: 5 };
    u({ actions: [...e.actions, a] });
  };

  const updateAction = (idx: number, patch: Partial<RpgEnemyAction>) => {
    if (!e) return;
    const copy = [...e.actions];
    copy[idx] = { ...copy[idx], ...patch };
    u({ actions: copy });
  };

  // Extract rank arrays from Table objects (now exposed via backend)
  const elementRanks: number[] = e?.element_ranks?.data ?? [];
  const stateRanks: number[] = e?.state_ranks?.data ?? [];

  return (
    <>
      <div className="db-content">
        <DatabaseListPanel items={db.items as any} selectedId={db.selectedId} onSelect={db.select}
          onAdd={() => db.addNew(DEFAULT)} label="enemies" />
        {e ? (
          <div className="db-detail-panel">
            <div className="db-columns">
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">General</div>
                  <div className="db-field"><span className="db-field-label">Name</span><input type="text" value={e.name} onChange={ev => u({ name: ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Battler</span><AssetPicker projectPath={projectPath} assetType="Battlers" value={e.battler_name} onChange={v => u({ battler_name: v })} /></div>
                  <div className="db-field"><span className="db-field-label">Battler Hue</span><input type="number" value={e.battler_hue} min={0} max={360} onChange={ev => u({ battler_hue: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">User Anim</span><IdSelect value={e.animation1_id} entries={names.animations} onChange={id => u({ animation1_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Target Anim</span><IdSelect value={e.animation2_id} entries={names.animations} onChange={id => u({ animation2_id: id })} allowNone /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Stats</div>
                  <div className="db-field"><span className="db-field-label">Max HP</span><input type="number" value={e.maxhp} min={1} onChange={ev => u({ maxhp: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Max SP</span><input type="number" value={e.maxsp} min={0} onChange={ev => u({ maxsp: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">STR</span><input type="number" value={e.str} onChange={ev => u({ str: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">DEX</span><input type="number" value={e.dex} onChange={ev => u({ dex: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">AGI</span><input type="number" value={e.agi} onChange={ev => u({ agi: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">INT</span><input type="number" value={e.int} onChange={ev => u({ int: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">ATK</span><input type="number" value={e.atk} onChange={ev => u({ atk: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">PDEF</span><input type="number" value={e.pdef} onChange={ev => u({ pdef: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">MDEF</span><input type="number" value={e.mdef} onChange={ev => u({ mdef: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">EVA</span><input type="number" value={e.eva} onChange={ev => u({ eva: +ev.target.value })} /></div>
                </div>
                <div className="db-section">
                  <div className="db-section-title">Treasure</div>
                  <div className="db-field"><span className="db-field-label">EXP</span><input type="number" value={e.exp} min={0} onChange={ev => u({ exp: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Gold</span><input type="number" value={e.gold} min={0} onChange={ev => u({ gold: +ev.target.value })} /></div>
                  <div className="db-field"><span className="db-field-label">Item</span><IdSelect value={e.item_id} entries={names.items} onChange={id => u({ item_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Weapon</span><IdSelect value={e.weapon_id} entries={names.weapons} onChange={id => u({ weapon_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Armor</span><IdSelect value={e.armor_id} entries={names.armors} onChange={id => u({ armor_id: id })} allowNone /></div>
                  <div className="db-field"><span className="db-field-label">Probability %</span><input type="number" value={e.treasure_prob} min={0} max={100} onChange={ev => u({ treasure_prob: +ev.target.value })} /></div>
                </div>
              </div>
              <div className="db-column">
                <div className="db-section">
                  <div className="db-section-title">Actions</div>
                  <div className="db-sublist">
                    {e.actions.map((act, i) => (
                      <div key={i} className={`db-sublist-item${selAction === i ? " selected" : ""}`} onClick={() => setSelAction(i)}>
                        {act.kind === 0 ? BASIC_ACTIONS[act.basic] ?? "Basic" : `Skill: ${names.skills.find(s => s.id === act.skill_id)?.name ?? `#${act.skill_id}`}`} (R:{act.rating})
                      </div>
                    ))}
                  </div>
                  <div className="db-sublist-toolbar">
                    <button onClick={addAction}>+ Add</button>
                    <button onClick={() => { if (selAction >= 0) { u({ actions: e.actions.filter((_, i) => i !== selAction) }); setSelAction(-1); } }} disabled={selAction < 0}>Remove</button>
                  </div>
                  {selAction >= 0 && e.actions[selAction] && (
                    <div style={{ marginTop: 8 }}>
                      <div className="db-field"><span className="db-field-label">Kind</span>
                        <select value={e.actions[selAction].kind} onChange={ev => updateAction(selAction, { kind: +ev.target.value })}>{ACTION_KINDS.map((k, i) => <option key={i} value={i}>{k}</option>)}</select>
                      </div>
                      {e.actions[selAction].kind === 0 && (
                        <div className="db-field"><span className="db-field-label">Basic</span>
                          <select value={e.actions[selAction].basic} onChange={ev => updateAction(selAction, { basic: +ev.target.value })}>{BASIC_ACTIONS.map((b, i) => <option key={i} value={i}>{b}</option>)}</select>
                        </div>
                      )}
                      {e.actions[selAction].kind === 1 && (
                        <div className="db-field"><span className="db-field-label">Skill</span><IdSelect value={e.actions[selAction].skill_id} entries={names.skills} onChange={id => updateAction(selAction, { skill_id: id })} /></div>
                      )}
                      <div className="db-field"><span className="db-field-label">Rating</span><input type="number" value={e.actions[selAction].rating} min={1} max={10} onChange={ev => updateAction(selAction, { rating: +ev.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Turn A</span><input type="number" value={e.actions[selAction].condition_turn_a} min={0} onChange={ev => updateAction(selAction, { condition_turn_a: +ev.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Turn B</span><input type="number" value={e.actions[selAction].condition_turn_b} min={0} onChange={ev => updateAction(selAction, { condition_turn_b: +ev.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">HP ≤ %</span><input type="number" value={e.actions[selAction].condition_hp} min={0} max={100} onChange={ev => updateAction(selAction, { condition_hp: +ev.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Level ≥</span><input type="number" value={e.actions[selAction].condition_level} min={1} onChange={ev => updateAction(selAction, { condition_level: +ev.target.value })} /></div>
                      <div className="db-field"><span className="db-field-label">Switch</span><input type="number" value={e.actions[selAction].condition_switch_id} min={0} onChange={ev => updateAction(selAction, { condition_switch_id: +ev.target.value })} /></div>
                    </div>
                  )}
                </div>
                <div className="db-section">
                  <div className="db-section-title">Element Ranks</div>
                  <RankTableEditor ranks={elementRanks} labels={names.elements.slice(1)} onChange={ranks => u({ element_ranks: { ...e.element_ranks, data: ranks } })} />
                </div>
                <div className="db-section">
                  <div className="db-section-title">State Ranks</div>
                  <RankTableEditor ranks={stateRanks} labels={names.states.map(s => s.name)} onChange={ranks => u({ state_ranks: { ...e.state_ranks, data: ranks } })} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="db-detail-empty">Select an enemy</div>
        )}
      </div>
    </>
  );
}
