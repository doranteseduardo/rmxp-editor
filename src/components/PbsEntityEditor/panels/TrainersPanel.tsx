/**
 * Trainers panel
 * - Left: tree view: TrainerType nodes → individual trainers
 * - Right (type selected): type detail (name, gender, money, skill, BGM)
 * - Right (trainer selected): loseText, items, team cards
 */
import { useCallback, useState, useId } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadTrainers } from "../../../services/pbsUnified";
import { saveTrainers } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { TrainerEntry, TrainerTypeEntry, TrainerPokemon } from "../../../types/pbsEntityTypes";
import { previewAudio } from "../../../services/tauriApi";

const getTrainerId = (t: TrainerEntry) => t.id;
const getTypeId = (t: TrainerTypeEntry) => t.id;

function buildAssetUrl(p: string) {
  return `asset://localhost/${encodeURIComponent(p)}`;
}

function TrainerTypeSprite({ projectPath, id }: { projectPath: string; id: string }) {
  return (
    <img
      src={buildAssetUrl(`${projectPath}/Graphics/Trainers/${id}.png`)}
      alt={id}
      style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function PokemonCard({
  poke, idx, pokemonNames, moveNames, itemNames, onChange, onRemove,
}: {
  poke: TrainerPokemon; idx: number;
  pokemonNames: string[]; moveNames: string[]; itemNames: string[];
  onChange: (p: Partial<TrainerPokemon>) => void;
  onRemove: () => void;
}) {
  const pDl = useId(), mDl = useId(), iDl = useId();
  return (
    <div style={{
      minWidth: 175, maxWidth: 210, border: "1px solid #ccd0da", borderRadius: 6,
      background: "#fff", padding: 10, flexShrink: 0, position: "relative",
    }}>
      <datalist id={pDl}>{pokemonNames.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id={mDl}>{moveNames.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id={iDl}>{itemNames.map((n) => <option key={n} value={n} />)}</datalist>

      <button onClick={onRemove} style={{
        position: "absolute", top: 4, right: 4, background: "none", border: "none",
        cursor: "pointer", color: "#fe640b", fontSize: 14, lineHeight: 1,
      }}>×</button>

      <div style={{ fontSize: 10, fontWeight: 700, color: "#8c8fa1", marginBottom: 4 }}>
        #{idx + 1}
      </div>

      <CardField label="Species">
        <input list={pDl} value={poke.species} onChange={(e) => onChange({ species: e.target.value })} style={cardInp} />
      </CardField>
      <CardField label="Nickname">
        <input value={poke.nickname ?? ""} onChange={(e) => onChange({ nickname: e.target.value || undefined })} style={cardInp} placeholder="—" maxLength={10} />
      </CardField>
      <CardField label="Level">
        <input type="number" value={poke.level} onChange={(e) => onChange({ level: parseInt(e.target.value, 10) || 1 })} style={{ ...cardInp, width: 60 }} />
      </CardField>
      <CardField label="Held Item">
        <input list={iDl} value={poke.heldItem ?? ""} onChange={(e) => onChange({ heldItem: e.target.value || undefined })} style={cardInp} />
      </CardField>
      <CardField label="Ball">
        <input list={iDl} value={poke.ball ?? ""} onChange={(e) => onChange({ ball: e.target.value || undefined })} style={cardInp} placeholder="—" />
      </CardField>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#4c4f69" }}>
          <input type="checkbox" checked={!!poke.shadow} onChange={(e) => onChange({ shadow: e.target.checked || undefined })} />
          Shadow
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#4c4f69" }}>
          <input type="checkbox" checked={!!poke.superShiny} onChange={(e) => onChange({ superShiny: e.target.checked || undefined })} />
          Super Shiny
        </label>
      </div>
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#5c5f77", marginBottom: 2 }}>Moves</div>
        {[0, 1, 2, 3].map((mi) => (
          <input
            key={mi}
            list={mDl}
            value={poke.moves[mi] ?? ""}
            onChange={(e) => {
              const moves = [...(poke.moves ?? [])];
              while (moves.length <= mi) moves.push("");
              moves[mi] = e.target.value;
              onChange({ moves: moves.filter(Boolean) });
            }}
            style={{ ...cardInp, marginBottom: 2, display: "block", width: "100%" }}
          />
        ))}
      </div>
    </div>
  );
}

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#5c5f77", marginBottom: 1 }}>{label}</div>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12, border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69", width: "100%", boxSizing: "border-box",
};
const cardInp: React.CSSProperties = { ...inp, fontSize: 11, padding: "2px 5px" };

export function TrainersPanel() {
  const { projectPath, pbsIndex } = usePbsEntityContext();
  const pokemonNames = pbsIndex.get("pokemon.txt") ?? [];
  const moveNames = pbsIndex.get("moves.txt") ?? [];
  const itemNames = pbsIndex.get("items.txt") ?? [];

  // Two separate entity editors: one for trainer types, one for trainers
  const typesEditor = useEntityEditor(
    "pbs-trainer-types",
    getTypeId,
    useCallback(async () => {
      const { trainerTypes } = await loadTrainers(projectPath);
      return trainerTypes;
    }, [projectPath]),
    useCallback(
      (types: TrainerTypeEntry[]) => saveTrainers(projectPath, [], types),
      [projectPath]
    )
  );

  const trainersEditor = useEntityEditor(
    "pbs-trainers",
    getTrainerId,
    useCallback(async () => {
      const { trainers } = await loadTrainers(projectPath);
      return trainers;
    }, [projectPath]),
    useCallback(
      (trainers: TrainerEntry[]) => saveTrainers(projectPath, trainers, typesEditor.items),
      [projectPath, typesEditor.items]
    )
  );

  // Selection: either a trainer type or a trainer
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);

  const selectedType = selectedTypeId ? typesEditor.items.find((t) => t.id === selectedTypeId) ?? null : null;
  const selectedTrainer = selectedTrainerId ? trainersEditor.items.find((t) => t.id === selectedTrainerId) ?? null : null;

  const handleAddType = () => {
    typesEditor.add({
      id: `TYPE_${Date.now()}`, name: "New Type", gender: "Mixed",
      baseMoney: 30, skillLevel: 2,
    });
  };

  const handleAddTrainer = (typeId: string) => {
    trainersEditor.add({
      id: `${typeId},Trainer,0`, trainerType: typeId,
      name: "Trainer", version: 0, loseText: "...", items: [], team: [],
    });
  };

  const updateTrainerTeam = (poke: TrainerPokemon, idx: number, patch: Partial<TrainerPokemon>) => {
    if (!selectedTrainer) return;
    const team = [...selectedTrainer.team];
    team[idx] = { ...poke, ...patch };
    trainersEditor.update(selectedTrainer.id, { team });
  };

  const removeTeamMember = (idx: number) => {
    if (!selectedTrainer) return;
    const team = selectedTrainer.team.filter((_, i) => i !== idx);
    trainersEditor.update(selectedTrainer.id, { team });
  };

  const addTeamMember = () => {
    if (!selectedTrainer) return;
    const team = [...selectedTrainer.team, { species: "", level: 5, moves: [] }];
    trainersEditor.update(selectedTrainer.id, { team });
  };

  const trainersForType = (typeId: string) =>
    trainersEditor.items.filter((t) => t.trainerType === typeId);

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Left tree */}
      <div style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        borderRight: "1px solid #ccd0da", background: "#e6e9ef", overflow: "hidden",
      }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {typesEditor.items.map((tt) => {
            const trainers = trainersForType(tt.id);
            const isTypeSel = tt.id === selectedTypeId;
            return (
              <div key={tt.id}>
                {/* Type node */}
                <div
                  onClick={() => { setSelectedTypeId(tt.id); setSelectedTrainerId(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
                    cursor: "pointer", background: isTypeSel ? "#1e66f5" : "transparent",
                    color: isTypeSel ? "#fff" : "#4c4f69", fontSize: 12, fontWeight: 600,
                  }}
                >
                  <TrainerTypeSprite projectPath={projectPath} id={tt.id} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tt.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddTrainer(tt.id); }}
                    title="Add trainer"
                    style={{ background: "none", border: "none", cursor: "pointer", color: isTypeSel ? "#fff" : "#1e66f5", fontSize: 14, lineHeight: 1 }}
                  >+</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); typesEditor.remove(tt.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: isTypeSel ? "rgba(255,255,255,0.6)" : "#acb0be", fontSize: 13, lineHeight: 1 }}
                  >×</button>
                </div>
                {/* Trainer children */}
                {trainers.map((tr) => {
                  const isTrSel = tr.id === selectedTrainerId;
                  return (
                    <div
                      key={tr.id}
                      onClick={() => { setSelectedTrainerId(tr.id); setSelectedTypeId(null); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 8px 4px 28px", cursor: "pointer", fontSize: 11,
                        background: isTrSel ? "#1e66f5" : "transparent",
                        color: isTrSel ? "#fff" : "#4c4f69",
                      }}
                    >
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tr.name}{tr.version > 0 ? ` (v${tr.version})` : ""} [{tr.team.length}]
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); trainersEditor.remove(tr.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: isTrSel ? "rgba(255,255,255,0.6)" : "#acb0be", fontSize: 13 }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "6px 8px", borderTop: "1px solid #ccd0da" }}>
          <button onClick={handleAddType} style={{ width: "100%", padding: "4px 0", fontSize: 11, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
            + Add Trainer Type
          </button>
        </div>
      </div>

      {/* Right detail */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {/* Trainer Type detail */}
        {selectedType && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #ccd0da", paddingBottom: 8 }}>
              <TrainerTypeSprite projectPath={projectPath} id={selectedType.id} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69" }}>{selectedType.name}</span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Internal ID">
                <input value={selectedType.id} onChange={(e) => typesEditor.update(selectedType.id, { id: e.target.value })} style={inp} />
              </Field>
              <Field label="Name">
                <input value={selectedType.name} onChange={(e) => typesEditor.update(selectedType.id, { name: e.target.value })} style={inp} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Gender">
                <select value={selectedType.gender} onChange={(e) => typesEditor.update(selectedType.id, { gender: e.target.value })} style={inp}>
                  <option>Male</option><option>Female</option><option>Mixed</option>
                </select>
              </Field>
              <Field label="Base Money">
                <input type="number" value={selectedType.baseMoney} onChange={(e) => typesEditor.update(selectedType.id, { baseMoney: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 80 }} />
              </Field>
              <Field label="Skill Level">
                <input type="number" min={0} max={5} value={selectedType.skillLevel} onChange={(e) => typesEditor.update(selectedType.id, { skillLevel: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 60 }} />
              </Field>
            </div>
            {(["battleBGM", "victoryBGM", "introBGM"] as const).map((key) => {
              const labels: Record<string, string> = { battleBGM: "Battle BGM", victoryBGM: "Victory BGM", introBGM: "Intro BGM" };
              return (
                <Field key={key} label={labels[key]}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={selectedType[key] ?? ""} onChange={(e) => typesEditor.update(selectedType.id, { [key]: e.target.value || undefined })} style={{ ...inp, flex: 1 }} />
                    {selectedType[key] && (
                      <button
                        onClick={() => previewAudio(projectPath, "BGM", selectedType[key]!, 0.8)}
                        style={{ padding: "4px 8px", fontSize: 11, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                      >▶</button>
                    )}
                  </div>
                </Field>
              );
            })}
          </div>
        )}

        {/* Trainer detail */}
        {selectedTrainer && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69", borderBottom: "1px solid #ccd0da", paddingBottom: 8, marginBottom: 12 }}>
              {selectedTrainer.trainerType} — {selectedTrainer.name}
              {selectedTrainer.version > 0 && <span style={{ fontSize: 11, color: "#8c8fa1", marginLeft: 6 }}>v{selectedTrainer.version}</span>}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <Field label="Name">
                <input value={selectedTrainer.name} onChange={(e) => trainersEditor.update(selectedTrainer.id, { name: e.target.value })} style={{ ...inp, maxWidth: 200 }} />
              </Field>
              <Field label="Version">
                <input type="number" min={0} value={selectedTrainer.version} onChange={(e) => trainersEditor.update(selectedTrainer.id, { version: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 60 }} />
              </Field>
            </div>

            <Field label="Lose Text">
              <textarea value={selectedTrainer.loseText} onChange={(e) => trainersEditor.update(selectedTrainer.id, { loseText: e.target.value })} rows={2} style={{ ...inp, maxWidth: 400, resize: "vertical", fontFamily: "inherit" }} />
            </Field>

            <Field label="Items (comma-separated)">
              <input value={selectedTrainer.items.join(",")} onChange={(e) => trainersEditor.update(selectedTrainer.id, { items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={{ ...inp, maxWidth: 400 }} />
            </Field>

            {/* Team cards */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#4c4f69", marginBottom: 8 }}>
                Team ({selectedTrainer.team.length}/6)
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                {selectedTrainer.team.map((poke, i) => (
                  <PokemonCard
                    key={i}
                    poke={poke}
                    idx={i}
                    pokemonNames={pokemonNames}
                    moveNames={moveNames}
                    itemNames={itemNames}
                    onChange={(patch) => updateTrainerTeam(poke, i, patch)}
                    onRemove={() => removeTeamMember(i)}
                  />
                ))}
                {selectedTrainer.team.length < 6 && (
                  <button onClick={addTeamMember} style={{
                    minWidth: 80, border: "2px dashed #ccd0da", borderRadius: 6,
                    background: "transparent", color: "#8c8fa1", cursor: "pointer", fontSize: 24,
                  }}>+</button>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedType && !selectedTrainer && (
          <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select a trainer type or trainer.</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77" }}>{label}</label>
      {children}
    </div>
  );
}
