import type { EditorProps } from "../types";
import { EditorShell, NInput, TInput, num, str } from "../shared";

export function SimpleEditor({ title, onDone }: { title: string; onDone: () => void }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row" style={{ color: "#8c8fa1", fontSize: 11 }}>No parameters needed.</div>
    </EditorShell>
  );
}

// Execute Transition (222)
// params: [filename]
export function ExecuteTransitionEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Execute Transition" onDone={onDone}>
      <div className="cmd-param-row">
        <TInput label="Graphic:" value={str(params[0])} onChange={(v) => onChange(0, v)} placeholder="(empty = default fade)" />
      </div>
    </EditorShell>
  );
}

// Color Tone (223, 205) — params: [Tone(r,g,b,gray), duration]
export function ColorToneEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  const tone = (params[0] && typeof params[0] === "object" && !Array.isArray(params[0]))
    ? params[0] as Record<string, unknown>
    : { red: 0, green: 0, blue: 0, gray: 0 };

  const updateTone = (field: string, val: number) => {
    onChange(0, { ...tone, [field]: val });
  };

  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="R:" value={num(tone.red)} onChange={(v) => updateTone("red", v)} min={-255} max={255} />
        <NInput label="G:" value={num(tone.green)} onChange={(v) => updateTone("green", v)} min={-255} max={255} />
        <NInput label="B:" value={num(tone.blue)} onChange={(v) => updateTone("blue", v)} min={-255} max={255} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Gray:" value={num(tone.gray)} onChange={(v) => updateTone("gray", v)} min={0} max={255} />
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// Flash (224) — params: [Color(r,g,b,a), duration]
export function FlashEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  const color = (params[0] && typeof params[0] === "object" && !Array.isArray(params[0]))
    ? params[0] as Record<string, unknown>
    : { red: 255, green: 255, blue: 255, alpha: 255 };

  const updateColor = (field: string, val: number) => {
    onChange(0, { ...color, [field]: val });
  };

  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="R:" value={num(color.red)} onChange={(v) => updateColor("red", v)} min={0} max={255} />
        <NInput label="G:" value={num(color.green)} onChange={(v) => updateColor("green", v)} min={0} max={255} />
        <NInput label="B:" value={num(color.blue)} onChange={(v) => updateColor("blue", v)} min={0} max={255} />
        <NInput label="A:" value={num(color.alpha)} onChange={(v) => updateColor("alpha", v)} min={0} max={255} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Screen Shake (225) — params: [power, speed, duration]
export function ScreenShakeEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Screen Shake" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Power:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={9} />
        <NInput label="Speed:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} max={9} />
        <NInput label="Frames:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
      </div>
    </EditorShell>
  );
}

// Opacity+Duration (206)
export function OpacityDurationEditor({ title, params, onChange, onDone }: EditorProps & { title: string }) {
  return (
    <EditorShell title={title} onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Opacity:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={0} max={255} />
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} />
      </div>
    </EditorShell>
  );
}
