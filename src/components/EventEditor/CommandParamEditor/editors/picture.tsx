import type { EditorProps } from "../types";
import { EditorShell, NInput, TInput, num, str } from "../shared";

// Show Picture (231) — params: [number, name, origin, type, p1, p2, zoom_x, zoom_y, opacity, blend_type]
export function ShowPictureEditor({ params, onChange, onDone }: EditorProps) {
  const posType = num(params[3]);
  return (
    <EditorShell title="Show Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
      </div>
      <div className="cmd-param-row">
        <TInput label="Filename:" value={str(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Origin:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Upper Left</option>
          <option value={1}>Center</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={posType} onChange={(e) => onChange(3, Number(e.target.value))}>
          <option value={0}>Direct</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label={posType === 0 ? "X:" : "X Var:"} value={num(params[4])} onChange={(v) => onChange(4, v)} />
        <NInput label={posType === 0 ? "Y:" : "Y Var:"} value={num(params[5])} onChange={(v) => onChange(5, v)} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Zoom X%:" value={num(params[6]) || 100} onChange={(v) => onChange(6, v)} min={1} />
        <NInput label="Zoom Y%:" value={num(params[7]) || 100} onChange={(v) => onChange(7, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Opacity:" value={num(params[8]) ?? 255} onChange={(v) => onChange(8, v)} min={0} max={255} />
        <span className="cmd-param-label">Blend:</span>
        <select className="prop-select" value={num(params[9])} onChange={(e) => onChange(9, Number(e.target.value))}>
          <option value={0}>Normal</option>
          <option value={1}>Add</option>
          <option value={2}>Sub</option>
        </select>
      </div>
    </EditorShell>
  );
}

// Move Picture (232) — same structure + duration
export function MovePictureEditor({ params, onChange, onDone }: EditorProps) {
  const posType = num(params[3]);
  return (
    <EditorShell title="Move Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
        <NInput label="Frames:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Origin:</span>
        <select className="prop-select" value={num(params[2])} onChange={(e) => onChange(2, Number(e.target.value))}>
          <option value={0}>Upper Left</option>
          <option value={1}>Center</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={posType} onChange={(e) => onChange(3, Number(e.target.value))}>
          <option value={0}>Direct</option>
          <option value={1}>Variable</option>
        </select>
        <NInput label={posType === 0 ? "X:" : "X Var:"} value={num(params[4])} onChange={(v) => onChange(4, v)} />
        <NInput label={posType === 0 ? "Y:" : "Y Var:"} value={num(params[5])} onChange={(v) => onChange(5, v)} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Zoom X%:" value={num(params[6]) || 100} onChange={(v) => onChange(6, v)} min={1} />
        <NInput label="Zoom Y%:" value={num(params[7]) || 100} onChange={(v) => onChange(7, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Opacity:" value={num(params[8]) ?? 255} onChange={(v) => onChange(8, v)} min={0} max={255} />
        <span className="cmd-param-label">Blend:</span>
        <select className="prop-select" value={num(params[9])} onChange={(e) => onChange(9, Number(e.target.value))}>
          <option value={0}>Normal</option>
          <option value={1}>Add</option>
          <option value={2}>Sub</option>
        </select>
      </div>
    </EditorShell>
  );
}

// Rotate Picture (233) — params: [number, speed]
export function RotatePictureEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Rotate Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
        <NInput label="Speed:" value={num(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
    </EditorShell>
  );
}

// Picture Color Tone (234) — params: [number, tone, duration]
export function PictureColorToneEditor({ params, onChange, onDone }: EditorProps) {
  const tone = (params[1] && typeof params[1] === "object" && !Array.isArray(params[1]))
    ? params[1] as Record<string, unknown>
    : { red: 0, green: 0, blue: 0, gray: 0 };

  const updateTone = (field: string, val: number) => {
    onChange(1, { ...tone, [field]: val });
  };

  return (
    <EditorShell title="Change Picture Color Tone" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
      </div>
      <div className="cmd-param-row">
        <NInput label="R:" value={num(tone.red)} onChange={(v) => updateTone("red", v)} min={-255} max={255} />
        <NInput label="G:" value={num(tone.green)} onChange={(v) => updateTone("green", v)} min={-255} max={255} />
        <NInput label="B:" value={num(tone.blue)} onChange={(v) => updateTone("blue", v)} min={-255} max={255} />
      </div>
      <div className="cmd-param-row">
        <NInput label="Gray:" value={num(tone.gray)} onChange={(v) => updateTone("gray", v)} min={0} max={255} />
        <NInput label="Frames:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
      </div>
    </EditorShell>
  );
}

// Erase Picture (235) — params: [number]
export function ErasePictureEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Erase Picture" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Number:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} max={50} />
      </div>
    </EditorShell>
  );
}

// Weather (236) — params: [type, power, duration]
export function WeatherEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Set Weather Effects" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>None</option>
          <option value={1}>Rain</option>
          <option value={2}>Storm</option>
          <option value={3}>Snow</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="Power:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={0} max={50} />
        <NInput label="Frames:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
      </div>
    </EditorShell>
  );
}
