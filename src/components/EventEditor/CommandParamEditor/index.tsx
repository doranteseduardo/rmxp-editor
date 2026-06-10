/**
 * Inline parameter editors for RMXP event commands.
 * Renders appropriate UI controls for editing command parameters.
 * Covers all 90 official RMXP event command types.
 */

import type { EventCommand, MapInfo } from "../../../types";
import type { PbsIndex } from "../../../services/pbsIndex";
import {
  ShowChoicesEditor,
  InputNumberEditor,
  ChangeTextOptionsEditor,
  ButtonInputEditor,
  WaitEditor,
} from "./editors/message";
import {
  ConditionalBranchEditor,
  CallCommonEventEditor,
  ControlSwitchesEditor,
  ControlVariablesEditor,
  ControlSelfSwitchEditor,
  ControlTimerEditor,
  ChangeGoldEditor,
  ChangeItemsEditor,
  ChangeWeaponsEditor,
  ChangeArmorEditor,
  ChangePartyMemberEditor,
} from "./editors/flow";
import { ChangeWindowskinEditor, ToggleEditor } from "./editors/system";
import { AudioParamEditor, FadeOutEditor } from "./editors/audio";
import {
  TransferPlayerEditor,
  SetEventLocationEditor,
  ScrollMapEditor,
  ChangeMapSettingsEditor,
  ShowAnimationEditor,
} from "./editors/map";
import {
  SimpleEditor,
  ExecuteTransitionEditor,
  ColorToneEditor,
  FlashEditor,
  ScreenShakeEditor,
  OpacityDurationEditor,
} from "./editors/screen";
import {
  ShowPictureEditor,
  MovePictureEditor,
  RotatePictureEditor,
  PictureColorToneEditor,
  ErasePictureEditor,
  WeatherEditor,
} from "./editors/picture";
import {
  BattleProcessingEditor,
  ShopProcessingEditor,
  NameInputEditor,
} from "./editors/battle";
import {
  ChangeHPEditor,
  ChangeSPEditor,
  ChangeStateEditor,
  RecoverAllEditor,
  ChangeEXPEditor,
  ChangeLevelEditor,
  ChangeParametersEditor,
  ChangeSkillsEditor,
  ChangeEquipmentEditor,
  ChangeActorNameEditor,
  ChangeActorClassEditor,
  ChangeActorGraphicEditor,
} from "./editors/actor";
import {
  ChangeEnemyHPEditor,
  ChangeEnemySPEditor,
  ChangeEnemyStateEditor,
  EnemyAppearEditor,
  EnemyTransformEditor,
  ShowBattleAnimationEditor,
  DealDamageEditor,
  ForceActionEditor,
} from "./editors/enemy";
import { PeScriptEditor } from "./editors/script";

interface Props {
  command: EventCommand;
  onChange: (paramIndex: number, value: unknown) => void;
  onDone: () => void;
  mapInfos?: Record<number, MapInfo>;
  switchNames?: string[];
  variableNames?: string[];
  pbsIndex?: PbsIndex;
}

/** All command codes that have a dedicated parameter editor. */
const EDITOR_CODES = new Set([
  355, // Script (PE Ruby script call)
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
export function CommandParamEditor({ command, onChange, onDone, mapInfos, switchNames, variableNames, pbsIndex }: Props) {
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
    // --- PE Script ---
    case 355: return <PeScriptEditor params={p} onChange={onChange} onDone={onDone} pbsIndex={pbsIndex} />;
    default: return null;
  }
}
