import type { EventCommand } from "../../../types";

/** Maps parent command codes to their continuation codes */
export const PARENT_CONT: Record<number, number> = { 101: 401, 108: 408, 355: 655 };

export type VisualBlock =
  | { kind: "single"; rawIndex: number; cmd: EventCommand }
  | { kind: "multi"; rawIndex: number; cmd: EventCommand; contIndices: number[]; contCmds: EventCommand[] };

/** Groups parent commands with their continuations into visual blocks */
export function toVisualBlocks(list: EventCommand[]): VisualBlock[] {
  const blocks: VisualBlock[] = [];
  let i = 0;
  while (i < list.length) {
    const cmd = list[i];
    const contCode = PARENT_CONT[cmd.code];
    if (contCode !== undefined) {
      const contIndices: number[] = [];
      const contCmds: EventCommand[] = [];
      let j = i + 1;
      while (j < list.length && list[j].code === contCode) {
        contIndices.push(j);
        contCmds.push(list[j]);
        j++;
      }
      if (contIndices.length > 0) {
        blocks.push({ kind: "multi", rawIndex: i, cmd, contIndices, contCmds });
        i = j;
        continue;
      }
    }
    blocks.push({ kind: "single", rawIndex: i, cmd });
    i++;
  }
  return blocks;
}

/** Returns the last raw index occupied by the block starting at `index` */
export function getBlockEnd(list: EventCommand[], index: number): number {
  const contCode = PARENT_CONT[list[index]?.code ?? -1];
  if (contCode === undefined) return index;
  let j = index + 1;
  while (j < list.length && list[j].code === contCode) j++;
  return j - 1;
}

/** Get default parameters for a new command */
export function getDefaultParams(code: number): unknown[] {
  switch (code) {
    case 101: return [""];
    case 108: return [""];
    case 111: return [0, 1, 0]; // Conditional: Switch [1] == ON
    case 117: return [1]; // Call Common Event 1
    case 118: return ["label"]; // Label
    case 119: return ["label"]; // Jump to Label
    case 121: return [1, 1, 0]; // Control Switches: [1] = ON
    case 122: return [1, 1, 0, 0, 0]; // Control Variables
    case 123: return ["A", 0]; // Self Switch A = ON
    case 201: return [0, 1, 0, 0, 0]; // Transfer: Map 1 (0,0)
    case 241: return [{ __class: "RPG::AudioFile", name: "", volume: 100, pitch: 100 }];
    case 250: return [{ __class: "RPG::AudioFile", name: "", volume: 80, pitch: 100 }];
    case 355: return [""];
    default: return [];
  }
}

export function getCommandIcon(code: number): string {
  if (code === 0) return "";
  if (code === 108 || code === 408) return "//";
  if (code === 101 || code === 401) return "T";
  if (code === 102) return "?";
  if (code === 111 || code === 411 || code === 412) return "◇";
  if (code === 112 || code === 413) return "↻";
  if (code === 113 || code === 115) return "⏹";
  if (code === 121 || code === 122 || code === 123) return "=";
  if (code >= 201 && code <= 210) return "▶";
  if (code >= 221 && code <= 236) return "◐";
  if (code >= 241 && code <= 251) return "♪";
  if (code === 355 || code === 655) return "{}";
  if (code >= 301 && code <= 340) return "⚔";
  return "•";
}
