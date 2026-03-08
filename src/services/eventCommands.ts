/**
 * RMXP Event Command catalog.
 *
 * Each command has a code, name, category, and description of its parameters.
 * This data drives the visual command list and the command builder UI.
 */

export interface CommandDef {
  code: number;
  name: string;
  category: string;
  description: string;
  /** Whether this code is a continuation of a previous command */
  isContinuation?: boolean;
  /** Whether this code is a branch end marker */
  isBranchEnd?: boolean;
  /** The continuation code for multi-line commands (e.g., 101 → 401) */
  continuationCode?: number;
}

export const COMMAND_CATEGORIES = [
  "Message",
  "Game Progression",
  "Flow Control",
  "Map",
  "Character",
  "Screen Effects",
  "Picture & Weather",
  "Audio",
  "System",
  "Battle",
  "Other",
] as const;

export type CommandCategory = (typeof COMMAND_CATEGORIES)[number];

/**
 * Full catalog of RMXP event command codes.
 */
export const COMMAND_DEFS: CommandDef[] = [
  // --- Message ---
  { code: 101, name: "Show Text", category: "Message", description: "Display a text message", continuationCode: 401 },
  { code: 102, name: "Show Choices", category: "Message", description: "Present player with choices" },
  { code: 103, name: "Input Number", category: "Message", description: "Let player input a number" },
  { code: 104, name: "Change Text Options", category: "Message", description: "Change message window position/style" },
  { code: 105, name: "Button Input Processing", category: "Message", description: "Wait for button press, store in variable" },
  { code: 106, name: "Wait", category: "Message", description: "Pause event processing" },
  { code: 108, name: "Comment", category: "Message", description: "Developer comment (not executed)", continuationCode: 408 },

  // --- Game Progression ---
  { code: 121, name: "Control Switches", category: "Game Progression", description: "Turn game switches ON/OFF" },
  { code: 122, name: "Control Variables", category: "Game Progression", description: "Set or modify game variables" },
  { code: 123, name: "Control Self Switch", category: "Game Progression", description: "Set self-switch A/B/C/D" },
  { code: 124, name: "Control Timer", category: "Game Progression", description: "Start/stop the game timer" },
  { code: 125, name: "Change Gold", category: "Game Progression", description: "Add or remove gold" },
  { code: 126, name: "Change Items", category: "Game Progression", description: "Add or remove items" },
  { code: 127, name: "Change Weapons", category: "Game Progression", description: "Add or remove weapons" },
  { code: 128, name: "Change Armor", category: "Game Progression", description: "Add or remove armor" },
  { code: 129, name: "Change Party Member", category: "Game Progression", description: "Add or remove party member" },

  // --- Flow Control ---
  { code: 111, name: "Conditional Branch", category: "Flow Control", description: "If condition is true..." },
  { code: 112, name: "Loop", category: "Flow Control", description: "Begin a loop" },
  { code: 113, name: "Break Loop", category: "Flow Control", description: "Exit the current loop" },
  { code: 115, name: "Exit Event Processing", category: "Flow Control", description: "Stop event execution" },
  { code: 116, name: "Erase Event", category: "Flow Control", description: "Remove this event from map" },
  { code: 117, name: "Call Common Event", category: "Flow Control", description: "Execute a common event" },
  { code: 118, name: "Label", category: "Flow Control", description: "Mark a jump target" },
  { code: 119, name: "Jump to Label", category: "Flow Control", description: "Jump to a labeled position" },

  // --- Map ---
  { code: 201, name: "Transfer Player", category: "Map", description: "Move player to another map/position" },
  { code: 202, name: "Set Event Location", category: "Map", description: "Move an event to a new position" },
  { code: 203, name: "Scroll Map", category: "Map", description: "Scroll the map view" },
  { code: 204, name: "Change Map Settings", category: "Map", description: "Change panorama, fog, etc." },
  { code: 205, name: "Change Fog Color Tone", category: "Map", description: "Tint the fog layer" },
  { code: 206, name: "Change Fog Opacity", category: "Map", description: "Change fog transparency" },

  // --- Character ---
  { code: 207, name: "Show Animation", category: "Character", description: "Play animation on character" },
  { code: 208, name: "Change Transparent Flag", category: "Character", description: "Make player visible/invisible" },
  { code: 209, name: "Set Move Route", category: "Character", description: "Define a movement pattern" },
  { code: 210, name: "Wait for Move's Completion", category: "Character", description: "Pause until move route ends" },

  // --- Screen Effects ---
  { code: 221, name: "Prepare for Transition", category: "Screen Effects", description: "Freeze screen for transition" },
  { code: 222, name: "Execute Transition", category: "Screen Effects", description: "Perform screen transition" },
  { code: 223, name: "Change Screen Color Tone", category: "Screen Effects", description: "Tint the screen" },
  { code: 224, name: "Screen Flash", category: "Screen Effects", description: "Flash the screen a color" },
  { code: 225, name: "Screen Shake", category: "Screen Effects", description: "Shake the screen" },

  // --- Picture & Weather ---
  { code: 231, name: "Show Picture", category: "Picture & Weather", description: "Display a picture on screen" },
  { code: 232, name: "Move Picture", category: "Picture & Weather", description: "Animate a picture" },
  { code: 233, name: "Rotate Picture", category: "Picture & Weather", description: "Spin a picture" },
  { code: 234, name: "Change Picture Color Tone", category: "Picture & Weather", description: "Tint a picture" },
  { code: 235, name: "Erase Picture", category: "Picture & Weather", description: "Remove a picture" },
  { code: 236, name: "Set Weather Effects", category: "Picture & Weather", description: "Rain, storm, or snow" },

  // --- Audio ---
  { code: 241, name: "Play BGM", category: "Audio", description: "Start background music" },
  { code: 242, name: "Fade Out BGM", category: "Audio", description: "Fade out current BGM" },
  { code: 245, name: "Play BGS", category: "Audio", description: "Start background sound" },
  { code: 246, name: "Fade Out BGS", category: "Audio", description: "Fade out current BGS" },
  { code: 247, name: "Memorize BGM/BGS", category: "Audio", description: "Save current audio state" },
  { code: 248, name: "Restore BGM/BGS", category: "Audio", description: "Restore saved audio state" },
  { code: 249, name: "Play ME", category: "Audio", description: "Play a music effect" },
  { code: 250, name: "Play SE", category: "Audio", description: "Play a sound effect" },
  { code: 251, name: "Stop SE", category: "Audio", description: "Stop all sound effects" },

  // --- System ---
  { code: 131, name: "Change Windowskin", category: "System", description: "Change the message window skin" },
  { code: 132, name: "Change Battle BGM", category: "System", description: "Change battle music" },
  { code: 133, name: "Change Battle End ME", category: "System", description: "Change victory music" },
  { code: 134, name: "Change Save Access", category: "System", description: "Enable/disable saving" },
  { code: 135, name: "Change Menu Access", category: "System", description: "Enable/disable menu" },
  { code: 136, name: "Change Encounter", category: "System", description: "Enable/disable encounters" },

  // --- Battle ---
  { code: 301, name: "Battle Processing", category: "Battle", description: "Start a battle" },
  { code: 302, name: "Shop Processing", category: "Battle", description: "Open a shop" },
  { code: 303, name: "Name Input Processing", category: "Battle", description: "Let player name a character" },
  { code: 311, name: "Change HP", category: "Battle", description: "Modify actor HP" },
  { code: 312, name: "Change SP", category: "Battle", description: "Modify actor SP" },
  { code: 313, name: "Change State", category: "Battle", description: "Add/remove status effect" },
  { code: 314, name: "Recover All", category: "Battle", description: "Fully heal an actor" },
  { code: 315, name: "Change EXP", category: "Battle", description: "Add or remove EXP" },
  { code: 316, name: "Change Level", category: "Battle", description: "Increase or decrease level" },
  { code: 317, name: "Change Parameters", category: "Battle", description: "Modify actor stats" },
  { code: 318, name: "Change Skills", category: "Battle", description: "Learn or forget skills" },
  { code: 319, name: "Change Equipment", category: "Battle", description: "Equip or remove gear" },
  { code: 320, name: "Change Actor Name", category: "Battle", description: "Rename an actor" },
  { code: 321, name: "Change Actor Class", category: "Battle", description: "Change actor's class" },
  { code: 322, name: "Change Actor Graphic", category: "Battle", description: "Change actor sprite" },

  // --- Enemy (in-battle) ---
  { code: 331, name: "Change Enemy HP", category: "Battle", description: "Modify enemy HP in battle" },
  { code: 332, name: "Change Enemy SP", category: "Battle", description: "Modify enemy SP in battle" },
  { code: 333, name: "Change Enemy State", category: "Battle", description: "Add/remove enemy status" },
  { code: 334, name: "Enemy Recover All", category: "Battle", description: "Fully heal an enemy" },
  { code: 335, name: "Enemy Appearance", category: "Battle", description: "Make hidden enemy appear" },
  { code: 336, name: "Enemy Transform", category: "Battle", description: "Change enemy type" },
  { code: 337, name: "Show Battle Animation", category: "Battle", description: "Play animation in battle" },
  { code: 338, name: "Deal Damage", category: "Battle", description: "Deal direct damage" },
  { code: 339, name: "Force Action", category: "Battle", description: "Force battler's next action" },
  { code: 340, name: "Abort Battle", category: "Battle", description: "End battle immediately" },

  // --- Other ---
  { code: 351, name: "Call Menu Screen", category: "Other", description: "Open the menu" },
  { code: 352, name: "Call Save Screen", category: "Other", description: "Open the save screen" },
  { code: 353, name: "Game Over", category: "Other", description: "Trigger game over" },
  { code: 354, name: "Return to Title Screen", category: "Other", description: "Go back to title" },
  { code: 355, name: "Script", category: "Other", description: "Execute Ruby script code", continuationCode: 655 },

  // --- Continuations / branch markers (hidden from picker) ---
  { code: 0, name: "(end)", category: "Other", description: "", isBranchEnd: true },
  { code: 401, name: "(text continuation)", category: "Message", description: "", isContinuation: true },
  { code: 402, name: "When [Choice]", category: "Message", description: "", isContinuation: true },
  { code: 403, name: "When Cancel", category: "Message", description: "", isContinuation: true },
  { code: 404, name: "(choice end)", category: "Message", description: "", isBranchEnd: true },
  { code: 408, name: "(comment continuation)", category: "Message", description: "", isContinuation: true },
  { code: 411, name: "Else", category: "Flow Control", description: "", isContinuation: true },
  { code: 412, name: "(conditional end)", category: "Flow Control", description: "", isBranchEnd: true },
  { code: 413, name: "(loop end)", category: "Flow Control", description: "", isBranchEnd: true },
  { code: 601, name: "If Win", category: "Battle", description: "", isContinuation: true },
  { code: 602, name: "If Escape", category: "Battle", description: "", isContinuation: true },
  { code: 603, name: "If Lose", category: "Battle", description: "", isContinuation: true },
  { code: 604, name: "(battle end)", category: "Battle", description: "", isBranchEnd: true },
  { code: 509, name: "(move command)", category: "Character", description: "", isContinuation: true },
  { code: 605, name: "(shop item)", category: "Battle", description: "", isContinuation: true },
  { code: 655, name: "(script continuation)", category: "Other", description: "", isContinuation: true },
];

/** Lookup command definition by code */
const commandDefMap = new Map<number, CommandDef>();
for (const def of COMMAND_DEFS) {
  commandDefMap.set(def.code, def);
}

export function getCommandDef(code: number): CommandDef {
  return (
    commandDefMap.get(code) ?? {
      code,
      name: `Unknown (${code})`,
      category: "Other",
      description: "",
    }
  );
}

/** Get only the commands that should appear in the picker (not continuations/branch ends). */
export function getPickerCommands(): CommandDef[] {
  return COMMAND_DEFS.filter((d) => !d.isContinuation && !d.isBranchEnd && d.code !== 0);
}

/** Group picker commands by category. */
export function getPickerCommandsByCategory(): Map<string, CommandDef[]> {
  const map = new Map<string, CommandDef[]>();
  for (const def of getPickerCommands()) {
    const existing = map.get(def.category) ?? [];
    existing.push(def);
    map.set(def.category, existing);
  }
  return map;
}

// --- Helpers used by summarizeCommand ---
function _n(v: unknown): number { return typeof v === "number" ? v : 0; }
function _s(v: unknown): string { return typeof v === "string" ? v : ""; }
function _audioName(v: unknown): string {
  if (typeof v === "string") return v || "(none)";
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const obj = v as Record<string, unknown>;
    const vol = typeof obj.volume === "number" ? ` (vol:${obj.volume})` : "";
    return (_s(obj.name) || "(none)") + vol;
  }
  return "(none)";
}
function _incDec(params: unknown[], offset: number): string {
  return `${_n(params[offset]) === 0 ? "+" : "-"}${_n(params[offset + 1]) === 0 ? _n(params[offset + 2]) : `V[${_n(params[offset + 2])}]`}`;
}
function _charTarget(v: unknown): string {
  const id = _n(v);
  return id === -1 ? "Player" : id === 0 ? "This Event" : `Event [${id}]`;
}
const _dirName: Record<number, string> = { 0: "Retain", 2: "Down", 4: "Left", 6: "Right", 8: "Up" };

/**
 * Generate a human-readable summary of an event command's parameters.
 * @param mapInfos Optional map name lookup for commands referencing map IDs.
 */
export function summarizeCommand(code: number, params: unknown[], mapInfos?: Record<number, { name: string }>): string {
  switch (code) {
    // --- Message ---
    case 101: return params[0] ? String(params[0]) : "(empty text)";
    case 401: return params[0] ? String(params[0]) : "";
    case 102: {
      const choices = params[0] as string[] | undefined;
      return choices ? choices.filter(Boolean).join(", ") : "(no choices)";
    }
    case 103: return `Variable [${_n(params[0])}], ${_n(params[1])} digits`;
    case 104: return `${["Top", "Middle", "Bottom"][_n(params[0])] ?? "?"}, ${_n(params[1]) === 0 ? "Show" : "Hide"} frame`;
    case 105: return `Variable [${_n(params[0])}]`;
    case 106: return `${_n(params[0])} frames`;
    case 108: case 408: return params[0] ? String(params[0]) : "";

    // --- Flow Control ---
    case 111: {
      const type = _n(params[0]);
      switch (type) {
        case 0: return `Switch [${params[1]}] == ${params[2] === 0 ? "ON" : "OFF"}`;
        case 1: return `Variable [${params[1]}] ${["==", ">=", "<=", ">", "<", "!="][_n(params[4])]} ${params[2] === 0 ? params[3] : `V[${params[3]}]`}`;
        case 2: return `Self Switch ${params[1]} == ${params[2] === 0 ? "ON" : "OFF"}`;
        case 3: return `Timer ${_n(params[2]) === 0 ? ">=" : "<="} ${_n(params[1])}s`;
        case 4: {
          const sub = _n(params[2]);
          const subLabels = ["in party", `name == "${params[3]}"`, `skill [${params[3]}]`, `weapon [${params[3]}]`, `armor [${params[3]}]`, `state [${params[3]}]`];
          return `Actor [${params[1]}] ${subLabels[sub] ?? `check ${sub}`}`;
        }
        case 5: return `Enemy [${params[1]}] ${_n(params[2]) === 0 ? "appeared" : `state [${params[3]}]`}`;
        case 6: return `${_charTarget(params[1])} facing ${_dirName[_n(params[2])] ?? "?"}`;
        case 7: return `Gold ${_n(params[2]) === 0 ? ">=" : "<="} ${params[1]}`;
        case 8: return `Item [${params[1]}] in inventory`;
        case 9: return `Weapon [${params[1]}] in inventory`;
        case 10: return `Armor [${params[1]}] in inventory`;
        case 11: return `Button [${params[1]}] pressed`;
        case 12: return `Script: ${params[1]}`;
        default: return `Condition type ${type}`;
      }
    }
    case 117: return `Common Event [${params[0]}]`;
    case 118: return `"${params[0]}"`;
    case 119: return `"${params[0]}"`;
    case 411: return "Else";
    case 402: return `"${params[1] ?? params[0]}"`;

    // --- Game Progression ---
    case 121: {
      const range = params[0] === params[1] ? `[${params[0]}]` : `[${params[0]}..${params[1]}]`;
      return `${range} = ${params[2] === 0 ? "ON" : "OFF"}`;
    }
    case 122: {
      const range = params[0] === params[1] ? `[${params[0]}]` : `[${params[0]}..${params[1]}]`;
      const op = ["=", "+=", "-=", "*=", "/=", "%="][_n(params[2])];
      const opType = _n(params[3]);
      let operand = String(params[4] ?? 0);
      if (opType === 1) operand = `V[${params[4]}]`;
      else if (opType === 2) operand = `Rand(${params[4]}..${params[5]})`;
      else if (opType === 3) operand = `Item[${params[4]}].count`;
      else if (opType === 4) operand = `Actor[${params[4]}].${["Lv", "EXP", "HP", "SP", "MaxHP", "MaxSP", "STR", "DEX", "AGI", "INT", "ATK", "PDEF", "MDEF", "EVA"][_n(params[5])] ?? "?"}`;
      else if (opType === 6) operand = `${_charTarget(params[4])}.${["MapX", "MapY", "Dir", "ScreenX", "ScreenY", "Terrain"][_n(params[5])] ?? "?"}`;
      else if (opType === 7) operand = ["MapID", "PartySize", "Gold", "Steps", "PlayTime", "Timer", "SaveCount"][_n(params[4])] ?? "?";
      return `${range} ${op} ${operand}`;
    }
    case 123: return `${params[0]} = ${params[1] === 0 ? "ON" : "OFF"}`;
    case 124: return _n(params[0]) === 0 ? `Start ${Math.floor(_n(params[1]) / 60)}m${_n(params[1]) % 60}s` : "Stop";
    case 125: return `Gold ${_incDec(params, 0)}`;
    case 126: return `Item [${params[0]}] ${_incDec(params, 1)}`;
    case 127: return `Weapon [${params[0]}] ${_incDec(params, 1)}`;
    case 128: return `Armor [${params[0]}] ${_incDec(params, 1)}`;
    case 129: return `Actor [${params[0]}] ${_n(params[1]) === 0 ? "Add" : "Remove"}`;

    // --- System ---
    case 131: return `"${params[0]}"`;
    case 132: return _audioName(params[0]);
    case 133: return _audioName(params[0]);
    case 134: return _n(params[0]) === 0 ? "Disable" : "Enable";
    case 135: return _n(params[0]) === 0 ? "Disable" : "Enable";
    case 136: return _n(params[0]) === 0 ? "Disable" : "Enable";

    // --- Map ---
    case 201: {
      if (_n(params[0]) !== 0) return "Variable-based transfer";
      const mapId201 = _n(params[1]);
      const mapName201 = mapInfos?.[mapId201]?.name;
      const mapLabel = mapName201 ? `[${String(mapId201).padStart(3, "0")}] ${mapName201}` : `Map [${mapId201}]`;
      return `${mapLabel} (${params[2]}, ${params[3]}) ${_dirName[_n(params[4])] ?? ""}`;
    }
    case 202: {
      const t = _n(params[1]);
      if (t === 2) return `Event [${params[0]}] ↔ Event [${params[2]}]`;
      return `Event [${params[0]}] → ${t === 0 ? `(${params[2]}, ${params[3]})` : `V[${params[2]}], V[${params[3]}]`}`;
    }
    case 203: return `${_dirName[_n(params[0])] ?? "?"} ${params[1]} tiles, speed ${params[2]}`;
    case 204: {
      const t = _n(params[0]);
      return `${["Panorama", "Fog", "Battleback"][t] ?? "?"}: "${params[1]}"`;
    }
    case 205: return `Fog tone (${_n((params[0] as Record<string, unknown>)?.red ?? 0)}, ${_n((params[0] as Record<string, unknown>)?.green ?? 0)}, ${_n((params[0] as Record<string, unknown>)?.blue ?? 0)}) ${params[1]}f`;
    case 206: return `Opacity: ${params[0]}, ${params[1]} frames`;
    case 207: return `${_charTarget(params[0])}, Animation [${params[1]}]`;
    case 208: return _n(params[0]) === 0 ? "Transparent" : "Normal";
    case 209: return `Target: ${_charTarget(params[0])}`;
    case 509: {
      // Move command continuation — params[0] is RPG::MoveCommand object
      const mc = params[0];
      if (mc && typeof mc === "object" && !Array.isArray(mc)) {
        const obj = mc as Record<string, unknown>;
        const moveCode = _n(obj.code);
        const moveName = MOVE_COMMAND_NAMES[moveCode] ?? `Move(${moveCode})`;
        const moveParams = (obj.parameters ?? []) as unknown[];
        if (moveCode === 14) return `◇ ${moveName}: (${moveParams[0] ?? 0}, ${moveParams[1] ?? 0})`;
        if (moveCode === 15) return `◇ Wait: ${moveParams[0] ?? 0} frames`;
        if (moveCode === 27) return `◇ Switch ON [${moveParams[0] ?? 0}]`;
        if (moveCode === 28) return `◇ Switch OFF [${moveParams[0] ?? 0}]`;
        if (moveCode === 29) return `◇ Speed: ${moveParams[0] ?? 0}`;
        if (moveCode === 30) return `◇ Freq: ${moveParams[0] ?? 0}`;
        if (moveCode === 41) return `◇ Graphic: "${moveParams[0] ?? ""}"`;
        if (moveCode === 42) return `◇ Opacity: ${moveParams[0] ?? 0}`;
        if (moveCode === 43) return `◇ Blend: ${moveParams[0] ?? 0}`;
        if (moveCode === 44) {
          const se = moveParams[0] as Record<string, unknown> | undefined;
          return `◇ Play SE: ${se ? _s(se.name) || "(none)" : "(none)"}`;
        }
        if (moveCode === 45) return `◇ Script: ${_s(moveParams[0])}`;
        return `◇ ${moveName}`;
      }
      return "◇ (move command)";
    }

    // --- Screen Effects ---
    case 222: return params[0] ? `"${params[0]}"` : "(default fade)";
    case 223: {
      const t = params[0] as Record<string, unknown> | undefined;
      return t ? `(${_n(t.red)}, ${_n(t.green)}, ${_n(t.blue)}, gray:${_n(t.gray)}) ${params[1]}f` : "";
    }
    case 224: {
      const c = params[0] as Record<string, unknown> | undefined;
      return c ? `(${_n(c.red)}, ${_n(c.green)}, ${_n(c.blue)}, ${_n(c.alpha)}) ${params[1]}f` : "";
    }
    case 225: return `Power: ${params[0]}, Speed: ${params[1]}, ${params[2]} frames`;

    // --- Picture & Weather ---
    case 231: return `#${params[0]} "${params[1]}" at (${params[4]}, ${params[5]})`;
    case 232: return `#${params[0]} → (${params[4]}, ${params[5]}) in ${params[1]}f`;
    case 233: return `#${params[0]} speed: ${params[1]}`;
    case 234: return `#${params[0]} tone change, ${params[2]}f`;
    case 235: return `#${params[0]}`;
    case 236: return `${["None", "Rain", "Storm", "Snow"][_n(params[0])] ?? "?"} power:${params[1]}`;

    // --- Audio ---
    case 241: case 245: case 249: case 250: return _audioName(params[0]);
    case 242: case 246: return `${params[0]}s`;

    // --- Battle ---
    case 301: return `Troop [${params[0]}]${params[1] ? " +Escape" : ""}${params[2] ? " +Lose" : ""}`;
    case 302: {
      const types = ["Item", "Weapon", "Armor"];
      return `${types[_n(params[0])] ?? "?"} [${params[1]}]`;
    }
    case 605: {
      const types = ["Item", "Weapon", "Armor"];
      return `${types[_n(params[0])] ?? "?"} [${params[1]}]`;
    }
    case 303: return `Actor [${params[0]}], max ${params[1]} chars`;

    // --- Actor ---
    case 311: return `Actor [${params[0]}] HP ${_incDec(params, 1)}${params[4] ? " (can die)" : ""}`;
    case 312: return `Actor [${params[0]}] SP ${_incDec(params, 1)}`;
    case 313: return `Actor [${params[0]}] ${_n(params[1]) === 0 ? "+" : "-"}State [${params[2]}]`;
    case 314: return `Actor [${params[0]}]${_n(params[0]) === 0 ? " (all)" : ""}`;
    case 315: return `Actor [${params[0]}] EXP ${_incDec(params, 1)}`;
    case 316: return `Actor [${params[0]}] Level ${_incDec(params, 1)}`;
    case 317: return `Actor [${params[0]}] ${["MaxHP", "MaxSP", "STR", "DEX", "AGI", "INT"][_n(params[1])] ?? "?"} ${_incDec(params, 2)}`;
    case 318: return `Actor [${params[0]}] ${_n(params[1]) === 0 ? "Learn" : "Forget"} Skill [${params[2]}]`;
    case 319: return `Actor [${params[0]}] ${["Weapon", "Shield", "Helmet", "Armor", "Accessory"][_n(params[1])] ?? "?"} = [${params[2]}]`;
    case 320: return `Actor [${params[0]}] → "${params[1]}"`;
    case 321: return `Actor [${params[0]}] → Class [${params[1]}]`;
    case 322: return `Actor [${params[0]}] graphic: "${params[1]}", battler: "${params[3]}"`;

    // --- Enemy ---
    case 331: return `Enemy [${params[0]}] HP ${_incDec(params, 1)}${params[4] ? " (can die)" : ""}`;
    case 332: return `Enemy [${params[0]}] SP ${_incDec(params, 1)}`;
    case 333: return `Enemy [${params[0]}] ${_n(params[1]) === 0 ? "+" : "-"}State [${params[2]}]`;
    case 334: return `Enemy [${params[0]}]`;
    case 335: return `Enemy [${params[0]}]`;
    case 336: return `Enemy [${params[0]}] → Enemy [${params[1]}]`;
    case 337: {
      const target = _n(params[0]) === 0 ? `Enemy [${params[1]}]` : `Actor [${params[1]}]`;
      return `${target}, Anim [${params[2]}]`;
    }
    case 338: {
      const target = _n(params[0]) === 0 ? `Enemy [${params[1]}]` : `Actor [${params[1]}]`;
      return `${target} ${_n(params[2]) === 0 ? _n(params[3]) : `V[${params[3]}]`} dmg`;
    }
    case 339: {
      const target = _n(params[0]) === 0 ? `Enemy [${params[1]}]` : `Actor [${params[1]}]`;
      const action = _n(params[2]) === 0 ? ["Attack", "Defend", "Escape", "Nothing"][_n(params[3])] ?? "?" : `Skill [${params[3]}]`;
      return `${target}: ${action}`;
    }

    // --- Script ---
    case 355: case 655: return params[0] ? String(params[0]) : "";

    default:
      if (params.length > 0) {
        return params.map((p) => {
          if (p === null || p === undefined) return "nil";
          if (typeof p === "object" && !Array.isArray(p)) {
            const obj = p as Record<string, unknown>;
            // Handle well-known RPG classes
            if (obj.__class === "RPG::MoveCommand") {
              const mc = _n(obj.code);
              return MOVE_COMMAND_NAMES[mc] ?? `Move(${mc})`;
            }
            if (obj.__class === "RPG::MoveRoute") return "(move route)";
            if (obj.__class === "RPG::AudioFile") return _s(obj.name) || "(none)";
            if (obj.__class) return `${obj.__class}${obj.name ? `: ${obj.name}` : ""}`;
            // Handle Tone/Color objects
            if ("red" in obj && "green" in obj && "blue" in obj) {
              return `(${_n(obj.red)},${_n(obj.green)},${_n(obj.blue)})`;
            }
            return JSON.stringify(p);
          }
          return JSON.stringify(p);
        }).join(", ").substring(0, 80);
      }
      return "";
  }
}

/**
 * Move command code names.
 */
export const MOVE_COMMAND_NAMES: Record<number, string> = {
  0: "(end)",
  1: "Move Down",
  2: "Move Left",
  3: "Move Right",
  4: "Move Up",
  5: "Move Lower Left",
  6: "Move Lower Right",
  7: "Move Upper Left",
  8: "Move Upper Right",
  9: "Move at Random",
  10: "Move Toward Player",
  11: "Move Away from Player",
  12: "1 Step Forward",
  13: "1 Step Backward",
  14: "Jump",
  15: "Wait",
  16: "Turn Down",
  17: "Turn Left",
  18: "Turn Right",
  19: "Turn Up",
  20: "Turn 90° Right",
  21: "Turn 90° Left",
  22: "Turn 180°",
  23: "Turn 90° Random",
  24: "Turn at Random",
  25: "Turn Toward Player",
  26: "Turn Away from Player",
  27: "Switch ON",
  28: "Switch OFF",
  29: "Change Speed",
  30: "Change Freq",
  31: "Move Animation ON",
  32: "Move Animation OFF",
  33: "Stop Animation ON",
  34: "Stop Animation OFF",
  35: "Direction Fix ON",
  36: "Direction Fix OFF",
  37: "Through ON",
  38: "Through OFF",
  39: "Always on Top ON",
  40: "Always on Top OFF",
  41: "Change Graphic",
  42: "Change Opacity",
  43: "Change Blending",
  44: "Play SE",
  45: "Script",
};
