import type { MapInfo } from "../../../../types";
import type { EditorProps } from "../types";
import { EditorShell, NInput, TInput, num, str } from "../shared";

// --- Transfer Player (201) ---
export function TransferPlayerEditor({ params, onChange, onDone, mapInfos }: EditorProps & { mapInfos?: Record<number, MapInfo> }) {
  const direct = num(params[0]) === 0;

  // Build sorted map list for the dropdown
  const mapEntries = mapInfos
    ? Object.entries(mapInfos)
        .map(([id, info]) => ({ id: Number(id), name: info.name }))
        .sort((a, b) => a.id - b.id)
    : [];

  return (
    <EditorShell title="Transfer Player" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Direct designation</option>
          <option value={1}>Variable designation</option>
        </select>
      </div>
      <div className="cmd-param-row">
        {direct && mapEntries.length > 0 ? (
          <>
            <span className="cmd-param-label">Map:</span>
            <select
              className="prop-select"
              value={num(params[1])}
              onChange={(e) => onChange(1, Number(e.target.value))}
              style={{ flex: 1 }}
            >
              {mapEntries.map((m) => (
                <option key={m.id} value={m.id}>
                  [{String(m.id).padStart(3, "0")}] {m.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <NInput label={direct ? "Map:" : "Map Var:"} value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        )}
      </div>
      <div className="cmd-param-row">
        <NInput label={direct ? "X:" : "X Var:"} value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
        <NInput label={direct ? "Y:" : "Y Var:"} value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} />
      </div>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Direction:</span>
        <select className="prop-select" value={num(params[4])} onChange={(e) => onChange(4, Number(e.target.value))}>
          <option value={0}>Retain</option>
          <option value={2}>Down</option>
          <option value={4}>Left</option>
          <option value={6}>Right</option>
          <option value={8}>Up</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Set Event Location (202) ---
// params: [event_id, type (0=direct, 1=variable, 2=swap), p1, p2, direction]
export function SetEventLocationEditor({ params, onChange, onDone }: EditorProps) {
  const locType = num(params[1]);
  return (
    <EditorShell title="Set Event Location" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Event ID:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={1} />
      </div>
      <div className="cmd-param-row">
        <select className="prop-select" value={locType} onChange={(e) => onChange(1, Number(e.target.value))}>
          <option value={0}>Direct</option>
          <option value={1}>Variable</option>
          <option value={2}>Swap with event</option>
        </select>
      </div>
      {locType < 2 && (
        <div className="cmd-param-row">
          <NInput label={locType === 0 ? "X:" : "X Var:"} value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} />
          <NInput label={locType === 0 ? "Y:" : "Y Var:"} value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} />
        </div>
      )}
      {locType === 2 && (
        <div className="cmd-param-row">
          <NInput label="Swap Event ID:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} />
        </div>
      )}
      <div className="cmd-param-row">
        <span className="cmd-param-label">Direction:</span>
        <select className="prop-select" value={num(params[4])} onChange={(e) => onChange(4, Number(e.target.value))}>
          <option value={0}>Retain</option>
          <option value={2}>Down</option>
          <option value={4}>Left</option>
          <option value={6}>Right</option>
          <option value={8}>Up</option>
        </select>
      </div>
    </EditorShell>
  );
}

// --- Scroll Map (203) ---
// params: [direction, distance, speed]
export function ScrollMapEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Scroll Map" onDone={onDone}>
      <div className="cmd-param-row">
        <span className="cmd-param-label">Direction:</span>
        <select className="prop-select" value={num(params[0])} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={2}>Down</option>
          <option value={4}>Left</option>
          <option value={6}>Right</option>
          <option value={8}>Up</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <NInput label="Distance:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
        <NInput label="Speed:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={1} max={6} />
      </div>
    </EditorShell>
  );
}

// --- Change Map Settings (204) ---
// params: [type (0=panorama, 1=fog, 2=battleback), name, ...]
export function ChangeMapSettingsEditor({ params, onChange, onDone }: EditorProps) {
  const settingType = num(params[0]);
  return (
    <EditorShell title="Change Map Settings" onDone={onDone}>
      <div className="cmd-param-row">
        <select className="prop-select" value={settingType} onChange={(e) => onChange(0, Number(e.target.value))}>
          <option value={0}>Panorama</option>
          <option value={1}>Fog</option>
          <option value={2}>Battle Background</option>
        </select>
      </div>
      <div className="cmd-param-row">
        <TInput label="Filename:" value={str(params[1])} onChange={(v) => onChange(1, v)} />
      </div>
      {settingType === 0 && (
        <div className="cmd-param-row">
          <NInput label="Hue:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} max={360} />
        </div>
      )}
      {settingType === 1 && (
        <>
          <div className="cmd-param-row">
            <NInput label="Hue:" value={num(params[2])} onChange={(v) => onChange(2, v)} min={0} max={360} />
            <NInput label="Opacity:" value={num(params[3])} onChange={(v) => onChange(3, v)} min={0} max={255} />
          </div>
          <div className="cmd-param-row">
            <NInput label="Blend:" value={num(params[4])} onChange={(v) => onChange(4, v)} min={0} max={2} />
            <NInput label="Zoom:" value={num(params[5])} onChange={(v) => onChange(5, v)} min={100} max={800} />
          </div>
          <div className="cmd-param-row">
            <NInput label="SX:" value={num(params[6])} onChange={(v) => onChange(6, v)} />
            <NInput label="SY:" value={num(params[7])} onChange={(v) => onChange(7, v)} />
          </div>
        </>
      )}
    </EditorShell>
  );
}

// --- Show Animation (207) ---
// params: [character_id, animation_id]
export function ShowAnimationEditor({ params, onChange, onDone }: EditorProps) {
  return (
    <EditorShell title="Show Animation" onDone={onDone}>
      <div className="cmd-param-row">
        <NInput label="Character:" value={num(params[0])} onChange={(v) => onChange(0, v)} min={-1} />
        <span className="cmd-param-label" style={{ fontSize: 10, color: "#8c8fa1" }}>(-1=player, 0=this)</span>
      </div>
      <div className="cmd-param-row">
        <NInput label="Animation ID:" value={num(params[1])} onChange={(v) => onChange(1, v)} min={1} />
      </div>
    </EditorShell>
  );
}
