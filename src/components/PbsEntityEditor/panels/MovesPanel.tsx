import { useCallback, useId } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadMoves } from "../../../services/pbsUnified";
import { saveMoves } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { MoveEntry } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";
import { TypeChip } from "../shared/TypeChip";
import { ChipListEditor } from "../shared/ChipListEditor";

const getId = (m: MoveEntry) => m.id;

const CATEGORY_ICONS: Record<string, string> = {
  Physical: "⚔",
  Special: "✨",
  Status: "◯",
};

const FUNCTION_CODES = [
  "None","AddGhostTypeToTarget","AddGrassTypeToTarget","AddMoneyGainedFromBattle","AddSpikesToFoeSide","AddStealthRocksToFoeSide","AddStickyWebToFoeSide","AddToxicSpikesToFoeSide",
  "AlwaysCriticalHit","AttackAndSkipNextTurn","AttackerFaintsIfUserFaints","AttackTwoTurnsLater","AttractTarget","BadPoisonTarget","BindTarget","BurnTarget","BurnFlinchTarget",
  "ConfuseTarget","CrashDamageIfFailsUnusableInGravity","CureUserBurnPoisonParalysis","CureUserPartyStatus","DisableTargetLastMoveUsed","FlinchTarget","FlinchTargetDoublePowerIfTargetInSky",
  "FixedDamage20","FixedDamage40","FixedDamageHalfTargetHP","FixedDamageUserLevel","FreezeTarget","HealTargetHalfOfTotalHP","HealUserByHalfOfDamageDone","HealUserFullyAndFallAsleep",
  "HealUserHalfOfTotalHP","HitTwoTimes","HitTwoToFiveTimes","HitTwoToFiveTimesOrThreeForAshGreninja","OHKO","OHKOHitsUndergroundTarget","OHKOIce",
  "ParalyzeTarget","ParalyzeTargetAlwaysHitsInRainHitsTargetInSky","PoisonTarget","ProtectUser","RecoilHalfOfDamageDealt","RecoilQuarterOfDamageDealt","RecoilThirdOfDamageDealt",
  "RecoilThirdOfDamageDealtBurnTarget","RecoilThirdOfDamageDealtParalyzeTarget","RemoveScreens","SleepTarget","SleepTargetNextTurn","StartRainWeather","StartSandstormWeather",
  "StartSunWeather","StartHailWeather","TransformUserIntoTarget","TwoTurnAttack","TwoTurnAttackBurnTarget","TwoTurnAttackFlinchTarget","TwoTurnAttackInvulnerableInSky",
  "TwoTurnAttackInvulnerableUnderground","TwoTurnAttackInvulnerableUnderwater","TwoTurnAttackOneTurnInSun","TwoTurnAttackParalyzeTarget",
  "UserFaintsExplosive","UserFaintsFixedDamageUserHP","UserFaintsHealAndCureReplacement","UserMakeSubstitute","UserLosesHalfOfTotalHP",
  "DoublePowerIfTargetStatusProblem","DoublePowerIfTargetAsleepCureTarget","DoublePowerIfTargetParalyzedCureTarget","DoublePowerIfTargetHPLessThanHalf",
  "PowerHigherWithUserHP","PowerHigherWithTargetHP","PowerLowerWithUserHP","PowerHigherWithUserHappiness","PowerLowerWithUserHappiness",
  "RaiseUserAttack1","RaiseUserAttack2","RaiseUserAttack3IfTargetFaints","RaiseUserDefense1","RaiseUserDefense2","RaiseUserDefense3",
  "RaiseUserSpAtk1","RaiseUserSpAtk2","RaiseUserSpAtk3","RaiseUserSpeed1","RaiseUserSpeed2","RaiseUserAtkDef1","RaiseUserAtkSpAtk1",
  "RaiseUserMainStats1","RaiseUserEvasion1","RaiseUserEvasion2MinimizeUser","RaiseUserCriticalHitRate2",
  "LowerTargetAttack1","LowerTargetAttack2","LowerTargetDefense1","LowerTargetDefense2","LowerTargetSpAtk1","LowerTargetSpAtk2","LowerTargetSpDef1","LowerTargetSpDef2",
  "LowerTargetSpeed1","LowerTargetSpeed2","LowerTargetAccuracy1","LowerTargetAtkDef1","LowerTargetAtkSpAtk1",
  "LowerUserDefense1","LowerUserSpeed1","LowerUserSpAtk2","LowerUserAtkDef1","LowerUserDefSpDef1",
  "StartElectricTerrain","StartGrassyTerrain","StartMistyTerrain","StartPsychicTerrain","StartGravity",
  "StartLeechSeedTarget","StartHealUserEachTurn","StartPerishCountsForAllBattlers","StartPreventCriticalHitsAgainstUserSide",
  "TypeDependsOnUserIVs","TypeDependsOnUserPlate","TypeDependsOnUserDrive","TypeDependsOnUserMemory","TypeIsUserFirstType",
  "SwitchOutUserDamagingMove","SwitchOutUserStatusMove","SwitchOutTargetDamagingMove","SwitchOutTargetStatusMove",
  "HitsTargetInSky","HitsTargetInSkyGroundsTarget","DoublePowerIfTargetInSky","FlinchTargetDoublePowerIfTargetInSky",
  "BindTarget","TrapTargetInBattle","TrapUserAndTargetInBattle","RemoveUserBindingAndEntryHazards",
  "UseRandomMove","UseRandomUserMoveIfAsleep","UseLastMoveUsed","UseLastMoveUsedByTarget",
  "GivePoisonTypeToTarget","CategoryDependsOnHigherDamageIgnoreTargetAbility","CategoryDependsOnHigherDamagePoisonTarget",
  "SetUserTypesToTargetTypes","SetUserTypesToUserMoveType","SetUserTypesToResistLastAttack","SetTargetTypesToWater","SetTargetTypesToPsychic",
  "InvertTargetStatStages","ResetTargetStatStages","ResetAllBattlersStatStages","UserCopyTargetStatStages","UserStealTargetPositiveStatStages",
  "UserSwapBaseAtkDef","UserTargetSwapAbilities","UserTargetSwapItems","UserTargetSwapStatStages","UserTargetSwapBaseSpeed","UserTargetAverageHP",
  "PowerHigherWithConsecutiveUse","PowerHigherWithLessPP","PowerHigherWithTargetWeight","PowerHigherWithUserHeavierThanTarget",
  "HitOncePerUserTeamMember","RandomlyDamageOrHealTarget","CounterPhysicalDamage","CounterSpecialDamage","CounterDamagePlusHalf",
] as const;

export function MovesPanel() {
  const { projectPath, pbsIndex } = usePbsEntityContext();
  const typeNames = pbsIndex.get("types.txt") ?? [];
  const typesDatalisId = useId();
  const funcCodeDlId = useId();

  const loadFn = useCallback(() => loadMoves(projectPath), [projectPath]);
  const saveFn = useCallback((items: MoveEntry[]) => saveMoves(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-moves", getId, loadFn, saveFn);

  const handleAdd = () => {
    add({
      id: `MOVE_${Date.now()}`, name: "New Move",
      type: "NORMAL", category: "Physical",
      power: 40, accuracy: 100, pp: 35,
      target: "NearOther", priority: 0,
      functionCode: "000", flags: [], description: "",
    });
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(m) => `${m.id} — ${m.name}`}
        renderPrefix={(m) => (
          <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <TypeChip typeId={m.type} small />
            <span style={{ fontSize: 10, color: "#8c8fa1" }}>{CATEGORY_ICONS[m.category] ?? ""}</span>
          </span>
        )}
        onSelect={select}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
      />

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!selected && !loading && <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select a move.</div>}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69", borderBottom: "1px solid #ccd0da", paddingBottom: 8 }}>
              {selected.name}
              <span style={{ fontSize: 11, fontWeight: 400, color: "#8c8fa1", marginLeft: 8 }}>{selected.id}</span>
            </div>

            <Row2>
              <Field label="Internal ID">
                <input value={selected.id} onChange={(e) => update(selected.id, { id: e.target.value })} style={inp} />
              </Field>
              <Field label="Name">
                <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} style={inp} />
              </Field>
            </Row2>

            <Row2>
              <Field label="Type">
                <>
                  <datalist id={typesDatalisId}>{typeNames.map((t) => <option key={t} value={t} />)}</datalist>
                  <input list={typesDatalisId} value={selected.type} onChange={(e) => update(selected.id, { type: e.target.value })} style={inp} />
                </>
              </Field>
              <Field label="Category">
                <select value={selected.category} onChange={(e) => update(selected.id, { category: e.target.value })} style={inp}>
                  <option>Physical</option>
                  <option>Special</option>
                  <option>Status</option>
                </select>
              </Field>
            </Row2>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["Power", "Accuracy", "TotalPP", "Priority"] as const).map((label) => {
                const key = label === "TotalPP" ? "pp" : label.toLowerCase() as keyof MoveEntry;
                return (
                  <Field key={label} label={label}>
                    <input
                      type="number"
                      value={selected[key] as number}
                      onChange={(e) => update(selected.id, { [key]: parseInt(e.target.value, 10) || 0 })}
                      style={{ ...inp, width: 70 }}
                    />
                  </Field>
                );
              })}
            </div>

            <Row2>
              <Field label="Target">
                <select value={selected.target} onChange={(e) => update(selected.id, { target: e.target.value })} style={inp}>
                  {["NearOther","Other","NearAlly","UserOrNearAlly","UserAndAllies","User","AllNearFoes","AllNearOthers","AllBattlers","NearFoe","RandomNearFoe","AllFoes","None"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Function Code">
                <datalist id={funcCodeDlId}>{FUNCTION_CODES.map((c) => <option key={c} value={c} />)}</datalist>
                <input list={funcCodeDlId} value={selected.functionCode} onChange={(e) => update(selected.id, { functionCode: e.target.value })} style={inp} />
              </Field>
              <Field label="Effect Chance (%)">
                <input
                  type="number" min={0} max={100}
                  value={selected.effectChance}
                  onChange={(e) => update(selected.id, { effectChance: parseInt(e.target.value, 10) || 0 })}
                  style={{ ...inp, width: 70 }}
                />
              </Field>
            </Row2>

            <Field label="Flags">
              <ChipListEditor
                values={selected.flags}
                onChange={(v) => update(selected.id, { flags: v })}
                placeholder="e.g. HighCriticalHitRate, Contact…"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={selected.description}
                onChange={(e) => update(selected.id, { description: e.target.value })}
                rows={3}
                style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77" }}>{label}</label>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}

const inp: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12,
  border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69",
  width: "100%", boxSizing: "border-box",
};
