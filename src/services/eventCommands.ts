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

/**
 * Generate a human-readable summary of an event command's parameters.
 */
export function summarizeCommand(code: number, params: unknown[]): string {
  switch (code) {
    case 101: // Show Text
      return params[0] ? String(params[0]) : "(empty text)";
    case 401: // Text continuation
      return params[0] ? String(params[0]) : "";
    case 102: { // Show Choices
      const choices = params[0] as string[] | undefined;
      return choices ? choices.join(", ") : "(no choices)";
    }
    case 108: // Comment
    case 408:
      return params[0] ? String(params[0]) : "";
    case 111: { // Conditional Branch
      const type = params[0] as number;
      switch (type) {
        case 0: return `Switch [${params[1]}] == ${params[2] === 0 ? "ON" : "OFF"}`;
        case 1: return `Variable [${params[1]}] ${["==", ">=", "<=", ">", "<", "!="][params[4] as number ?? 0]} ${params[2] === 0 ? params[3] : `Variable [${params[3]}]`}`;
        case 2: return `Self Switch ${params[1]} == ${params[2] === 0 ? "ON" : "OFF"}`;
        case 4: return `Actor [${params[1]}] in party`;
        case 12: return `Script: ${params[1]}`;
        default: return `Condition type ${type}`;
      }
    }
    case 117: // Call Common Event
      return `Common Event [${params[0]}]`;
    case 118: // Label
      return `"${params[0]}"`;
    case 119: // Jump to Label
      return `"${params[0]}"`;
    case 121: { // Control Switches
      const start = params[0], end = params[1], val = params[2];
      const range = start === end ? `[${start}]` : `[${start}..${end}]`;
      return `${range} = ${val === 0 ? "ON" : "OFF"}`;
    }
    case 122: { // Control Variables
      const start = params[0], end = params[1];
      const range = start === end ? `[${start}]` : `[${start}..${end}]`;
      const op = ["=", "+=", "-=", "*=", "/=", "%="][params[2] as number ?? 0];
      return `${range} ${op} ${params[4] ?? params[3]}`;
    }
    case 123: // Control Self Switch
      return `${params[0]} = ${params[1] === 0 ? "ON" : "OFF"}`;
    case 201: { // Transfer Player
      if (params[0] === 0) {
        return `Map [${params[1]}] (${params[2]}, ${params[3]})`;
      }
      return "Variable-based transfer";
    }
    case 209: // Set Move Route
      return `Target: ${params[0] === -1 ? "Player" : params[0] === 0 ? "This Event" : `Event [${params[0]}]`}`;
    case 241: // Play BGM
    case 245: // Play BGS
    case 249: // Play ME
    case 250: { // Play SE
      const audio = params[0] as { name?: string; volume?: number; pitch?: number } | string | undefined;
      if (typeof audio === "string") return audio || "(none)";
      if (audio && typeof audio === "object") {
        const vol = audio.volume !== undefined ? ` (vol: ${audio.volume})` : "";
        return (audio.name || "(none)") + vol;
      }
      return "(none)";
    }
    case 355: // Script
    case 655:
      return params[0] ? String(params[0]) : "";
    case 411:
      return "Else";
    case 402: { // When [Choice]
      return `"${params[1] ?? params[0]}"`;
    }
    default:
      if (params.length > 0) {
        return params.map((p) => {
          if (p === null || p === undefined) return "nil";
          if (typeof p === "object" && !Array.isArray(p)) {
            // Ruby objects converted to JSON — show class or meaningful summary
            const obj = p as Record<string, unknown>;
            if (obj.__class) return `${obj.__class}${obj.name ? `: ${obj.name}` : ""}`;
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
