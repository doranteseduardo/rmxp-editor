import type { EditorProps } from "../types";
import { EditorShell, NInput, TInput, num, str } from "../shared";

// Generic audio editor for Play BGM/BGS/ME/SE and Change Battle BGM/ME
export function AudioParamEditor({ title, params, onChange, onDone }: EditorProps & { title: string; audioType?: string }) {
  const audio = (params[0] && typeof params[0] === "object" && !Array.isArray(params[0]))
    ? params[0] as Record<string, unknown>
    : { name: str(params[0]), volume: 100, pitch: 100 };

  const updateAudio = (field: string, val: unknown) => {
    onChange(0, { ...audio, [field]: val });
  };

  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <TInput label="File:" value={str(audio.name)} onChange={(v) => updateAudio("name", v)} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Volume:" value={num(audio.volume)} onChange={(v) => updateAudio("volume", v)} min={0} max={100} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Pitch:" value={num(audio.pitch)} onChange={(v) => updateAudio("pitch", v)} min={50} max={150} />
      </div>
    </EditorShell>
  );
}

// Fade Out BGM (242) / Fade Out BGS (246)
export function FadeOutEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Seconds:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={60} />
      </div>
    </EditorShell>
  );
}
