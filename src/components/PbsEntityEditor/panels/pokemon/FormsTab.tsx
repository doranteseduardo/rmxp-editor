import { useState, useId } from "react";
import type { PokemonForm } from "../../../../types/pbsEntityTypes";
import { ChipListEditor } from "../../shared/ChipListEditor";
import { Field, inp, evInp } from "./shared";

export function FormsTab({
  forms, typeNames, abilityNames, itemNames, onChange,
}: {
  forms: PokemonForm[];
  typeNames: string[];
  abilityNames: string[];
  moveNames: string[];
  itemNames: string[];
  onChange: (forms: PokemonForm[]) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(forms.length > 0 ? 0 : null);
  const selected = selectedIdx !== null ? forms[selectedIdx] ?? null : null;

  const updateForm = (patch: Partial<PokemonForm>) => {
    if (selectedIdx === null) return;
    const next = forms.map((f, i) => i === selectedIdx ? { ...f, ...patch } : f);
    onChange(next);
  };

  const addForm = () => {
    const next = [...forms, { formName: `Form${forms.length + 1}`, type1: "NORMAL" }];
    onChange(next);
    setSelectedIdx(next.length - 1);
  };

  const removeForm = (idx: number) => {
    const next = forms.filter((_, i) => i !== idx);
    onChange(next);
    setSelectedIdx(next.length > 0 ? Math.min(idx, next.length - 1) : null);
  };

  const tDlId = useId(), aDlId = useId(), iDlId = useId();

  return (
    <div style={{ display: "flex", gap: 12, minHeight: 300 }}>
      {/* Form list */}
      <div style={{ width: 140, flexShrink: 0, display: "flex", flexDirection: "column", border: "1px solid #ccd0da", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {forms.length === 0 && <div style={{ padding: 8, fontSize: 11, color: "#8c8fa1" }}>No forms.</div>}
          {forms.map((f, i) => (
            <div
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                display: "flex", alignItems: "center", padding: "5px 8px", cursor: "pointer",
                background: i === selectedIdx ? "#1e66f5" : "transparent",
                color: i === selectedIdx ? "#fff" : "#4c4f69", fontSize: 11,
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.formName || `Form ${i}`}</span>
              <button onClick={(e) => { e.stopPropagation(); removeForm(i); }} style={{ background: "none", border: "none", cursor: "pointer", color: i === selectedIdx ? "rgba(255,255,255,0.6)" : "#acb0be", fontSize: 13 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ padding: "4px 6px", borderTop: "1px solid #ccd0da" }}>
          <button onClick={addForm} style={{ width: "100%", padding: "3px 0", fontSize: 10, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>+ Add Form</button>
        </div>
      </div>

      {/* Form detail */}
      {selected && (
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <datalist id={tDlId}>{typeNames.map((t) => <option key={t} value={t} />)}</datalist>
          <datalist id={aDlId}>{abilityNames.map((a) => <option key={a} value={a} />)}</datalist>
          <datalist id={iDlId}>{itemNames.map((i) => <option key={i} value={i} />)}</datalist>

          <Field label="Form Name">
            <input value={selected.formName} onChange={(e) => updateForm({ formName: e.target.value })} style={inp} />
          </Field>

          <div style={{ display: "flex", gap: 8 }}>
            <Field label="Type 1">
              <input list={tDlId} value={selected.type1} onChange={(e) => updateForm({ type1: e.target.value })} style={{ ...inp, width: 120 }} />
            </Field>
            <Field label="Type 2">
              <input list={tDlId} value={selected.type2 ?? ""} onChange={(e) => updateForm({ type2: e.target.value || undefined })} placeholder="—" style={{ ...inp, width: 120 }} />
            </Field>
          </div>

          <Field label="Abilities">
            <ChipListEditor values={selected.abilities ?? []} options={abilityNames} maxItems={2} onChange={(v) => updateForm({ abilities: v.length ? v : undefined })} placeholder="Add ability…" />
          </Field>
          <Field label="Hidden Ability">
            <input list={aDlId} value={selected.hiddenAbility ?? ""} onChange={(e) => updateForm({ hiddenAbility: e.target.value || undefined })} placeholder="—" style={inp} />
          </Field>

          {selected.baseStats !== undefined ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77", marginBottom: 4 }}>Base Stats Override</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["hp","atk","def","spa","spd","spe"] as const).map((k) => (
                  <Field key={k} label={k.toUpperCase()}>
                    <input type="number" min={1} max={255}
                      value={selected.baseStats?.[k] ?? ""}
                      onChange={(e) => updateForm({ baseStats: { ...(selected.baseStats ?? { hp:45, atk:45, def:45, spa:45, spd:45, spe:45 }), [k]: parseInt(e.target.value,10)||1 } })}
                      style={{ ...evInp, width: 52 }}
                    />
                  </Field>
                ))}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button onClick={() => updateForm({ baseStats: undefined })} style={{ padding: "4px 8px", fontSize: 10, background: "none", border: "1px solid #ccd0da", borderRadius: 3, cursor: "pointer", color: "#fe640b" }}>Clear</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => updateForm({ baseStats: { hp:45, atk:45, def:45, spa:45, spd:45, spe:45 } })}
              style={{ alignSelf: "flex-start", fontSize: 10, padding: "3px 10px", background: "none", border: "1px dashed #ccd0da", borderRadius: 3, cursor: "pointer", color: "#8c8fa1" }}>
              + Override Base Stats
            </button>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Field label="Height (m)">
              <input type="number" step="0.1" value={selected.height ?? ""} onChange={(e) => updateForm({ height: parseFloat(e.target.value) || undefined })} style={{ ...evInp, width: 70 }} />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" step="0.1" value={selected.weight ?? ""} onChange={(e) => updateForm({ weight: parseFloat(e.target.value) || undefined })} style={{ ...evInp, width: 70 }} />
            </Field>
            <Field label="Mega Stone">
              <input list={iDlId} value={selected.megaStone ?? ""} onChange={(e) => updateForm({ megaStone: e.target.value || undefined })} placeholder="—" style={{ ...evInp, width: 120 }} />
            </Field>
          </div>

          <Field label="Pokédex Entry">
            <textarea value={selected.pokedex ?? ""} onChange={(e) => updateForm({ pokedex: e.target.value || undefined })} rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit", fontSize: 11 }} />
          </Field>
        </div>
      )}

      {!selected && forms.length === 0 && (
        <div style={{ color: "#8c8fa1", fontSize: 12, alignSelf: "center" }}>No forms. Click "+ Add Form" to add one.</div>
      )}
    </div>
  );
}
