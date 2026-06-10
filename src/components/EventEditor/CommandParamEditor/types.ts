import type { PbsIndex } from "../../../services/pbsIndex";

interface EditorProps {
  params: unknown[];
  onChange: (index: number, value: unknown) => void;
  onDone: () => void;
}

interface PeScriptEditorProps extends EditorProps {
  pbsIndex?: PbsIndex;
}

export type { EditorProps, PeScriptEditorProps };
