export interface PbsSection {
  header: string;
  fields: PbsField[];
}

export interface PbsField {
  key: string;
  value: string;
}

export type FieldType =
  | "text"
  | "number"
  | "ref"
  | "refList"
  | "asset"
  | "assetAudio"
  | "csv"
  | "statList"
  | "moveList";

export interface FieldMeta {
  type: FieldType;
  /** e.g. "moves.txt" — drives autocomplete picker */
  refFile?: string;
  /** e.g. "Graphics/Pokemon/Front" — relative to project root */
  assetDir?: string;
  /** e.g. ".png" | ".ogg" */
  assetSuffix?: string;
  /** "header" = derive asset name from section header (INTERNALNAME) */
  assetNameFrom?: "header";
}
