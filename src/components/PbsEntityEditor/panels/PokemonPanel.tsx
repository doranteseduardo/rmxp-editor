/**
 * Pokémon panel — the flagship entity editor.
 * Left: searchable list with sprite thumbnails.
 * Right: tabbed editor with Base / Stats (radar) / Moves / Evolutions / Forms / Metrics.
 */
import { useCallback, useState, useRef, useEffect, useId } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadPokemon } from "../../../services/pbsUnified";
import { savePokemon } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { PokemonEntry, BaseStats, LearnMove, Evolution, PokemonForm } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";
import { TypeChip } from "../shared/TypeChip";
import { ChipListEditor } from "../shared/ChipListEditor";
import { previewAudio } from "../../../services/tauriApi";

const getId = (p: PokemonEntry) => p.id;

function buildAssetUrl(path: string) {
  return `asset://localhost/${encodeURIComponent(path)}`;
}

// ── Pokémon Icon Sprite (animated, shows first frame of 2-frame sheet) ─────────

function PokemonIconSprite({ projectPath, id, size = 32 }: { projectPath: string; id: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = buildAssetUrl(`${projectPath}/Graphics/Pokemon/Icons/${id}.png`);

    const draw = (frame: number) => {
      if (!imgRef.current) return;
      const nat = imgRef.current;
      const frameH = nat.naturalHeight;
      const frameW = frameH; // icons are always square frames
      const numFrames = Math.max(1, Math.round(nat.naturalWidth / frameW));
      const f = frame % numFrames;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(nat, f * frameW, 0, frameW, frameH, 0, 0, size, size);
    };

    img.onload = () => {
      imgRef.current = img;
      canvas.style.opacity = "1";
      draw(0);
      // Animate if multi-frame
      const numFrames = Math.max(1, Math.round(img.naturalWidth / img.naturalHeight));
      if (numFrames > 1) {
        timerRef.current = setInterval(() => {
          frameRef.current = (frameRef.current + 1) % numFrames;
          draw(frameRef.current);
        }, 250);
      }
    };
    img.onerror = () => { canvas.style.opacity = "0.15"; };

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [projectPath, id, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated", opacity: 0.15, flexShrink: 0 }}
    />
  );
}

// ── Radar (hexagonal stats) chart ─────────────────────────────────────────────

function RadarChart({ stats }: { stats: BaseStats }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 160;
  const CENTER = SIZE / 2;
  const RADIUS = 64;
  const labels = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
  const values = [stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe];
  const MAX = 255;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const angle = (i: number) => (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const point = (i: number, r: number) => ({
      x: CENTER + Math.cos(angle(i)) * r,
      y: CENTER + Math.sin(angle(i)) * r,
    });

    // Draw grid rings
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const p = point(i, (RADIUS * ring) / 5);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#ccd0da";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw spokes
    for (let i = 0; i < 6; i++) {
      const p = point(i, RADIUS);
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "#ccd0da";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw stat polygon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const r = (values[i] / MAX) * RADIUS;
      const p = point(i, r);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(30, 102, 245, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#1e66f5";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#4c4f69";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 6; i++) {
      const p = point(i, RADIUS + 14);
      ctx.fillText(`${labels[i]} ${values[i]}`, p.x, p.y);
    }
  }, [stats]);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: "block" }} />;
}

// ── Evolution chain visualization ─────────────────────────────────────────────

function EvolutionChain({
  entry,
  all,
  projectPath,
}: {
  entry: PokemonEntry;
  all: PokemonEntry[];
  projectPath: string;
}) {
  if (!entry.evolutions.length) {
    return <div style={{ color: "#8c8fa1", fontSize: 11, padding: 8 }}>No evolutions defined.</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
      {/* Base form */}
      <EvolutionNode id={entry.id} name={entry.name} projectPath={projectPath} />

      {entry.evolutions.map((evo, i) => {
        const target = all.find((p) => p.id === evo.species);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 16, color: "#8c8fa1" }}>→</span>
              <span style={{ fontSize: 9, color: "#8c8fa1", maxWidth: 72, textAlign: "center" }}>
                {evo.method}{evo.parameter ? ` ${evo.parameter}` : ""}
              </span>
            </div>
            <EvolutionNode id={evo.species} name={target?.name ?? evo.species} projectPath={projectPath} />
          </div>
        );
      })}
    </div>
  );
}

function EvolutionNode({ id, name, projectPath }: { id: string; name: string; projectPath: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <img
        src={buildAssetUrl(`${projectPath}/Graphics/Pokemon/Front/${id}.png`)}
        alt={id}
        style={{ width: 48, height: 48, imageRendering: "pixelated", objectFit: "contain" }}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
      />
      <span style={{ fontSize: 9, color: "#4c4f69", fontWeight: 600 }}>{name}</span>
      <span style={{ fontSize: 8, color: "#8c8fa1" }}>{id}</span>
    </div>
  );
}

// ── Metrics visual editor ─────────────────────────────────────────────────────

type Metrics = NonNullable<PokemonEntry["metrics"]>;

const DEFAULT_METRICS: Metrics = { frontSpriteOffset: [0, 0], backSpriteOffset: [0, 0], shadowX: 0, shadowSize: 2 };

function MetricsVisualEditor({
  pokemonId,
  projectPath,
  metrics,
  onChange,
}: {
  pokemonId: string;
  projectPath: string;
  metrics: Metrics;
  onChange: (m: Metrics) => void;
}) {
  const CANVAS_W = 220;
  const CANVAS_H = 180;
  const SHADOW_SIZES = ["XS", "S", "M", "L", "XL"];

  // Two canvases: front and back
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);

  // Load sprites into Image objects
  const frontImg = useRef<HTMLImageElement | null>(null);
  const backImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const loadSprite = (src: string, ref: React.MutableRefObject<HTMLImageElement | null>, redraw: () => void) => {
      const img = new Image();
      img.onload = () => { ref.current = img; redraw(); };
      img.onerror = () => { ref.current = null; redraw(); };
      img.src = src;
    };
    loadSprite(buildAssetUrl(`${projectPath}/Graphics/Pokemon/Front/${pokemonId}.png`), frontImg, () => drawCanvas("front"));
    loadSprite(buildAssetUrl(`${projectPath}/Graphics/Pokemon/Back/${pokemonId}.png`), backImg, () => drawCanvas("back"));
  }, [pokemonId, projectPath]);

  const drawCanvas = (side: "front" | "back") => {
    const canvas = side === "front" ? frontRef.current : backRef.current;
    const img = side === "front" ? frontImg.current : backImg.current;
    const offset = side === "front" ? metrics.frontSpriteOffset : metrics.backSpriteOffset;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background grid
    ctx.fillStyle = "#dce0e8";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = "#bcc0cc";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < CANVAS_W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
    for (let y = 0; y < CANVAS_H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }

    // Baseline: horizontal center guide
    const baseX = CANVAS_W / 2;
    const baseY = CANVAS_H - 20;
    ctx.strokeStyle = "#8c8fa1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(CANVAS_W, baseY); ctx.stroke();
    ctx.setLineDash([]);

    // Shadow ellipse
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    const shadowW = [8, 14, 20, 28, 36][metrics.shadowSize ?? 2] ?? 20;
    ctx.ellipse(baseX + (metrics.shadowX ?? 0), baseY + 4, shadowW, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sprite
    if (img) {
      const sx = baseX - img.width / 2 + offset[0];
      const sy = baseY - img.height + offset[1];
      ctx.drawImage(img, sx, sy);
    } else {
      ctx.fillStyle = "#bcc0cc";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("no sprite", baseX, baseY - 30);
    }

    // Cross-hair at base point
    ctx.strokeStyle = "#d20f39";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(baseX - 6, baseY); ctx.lineTo(baseX + 6, baseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(baseX, baseY - 6); ctx.lineTo(baseX, baseY + 6); ctx.stroke();
  };

  // Redraw whenever metrics change
  useEffect(() => { drawCanvas("front"); }, [metrics, pokemonId]);
  useEffect(() => { drawCanvas("back"); }, [metrics, pokemonId]);

  // Drag state
  const dragging = useRef<{ side: "front" | "back"; startX: number; startY: number; origOffset: [number, number] } | null>(null);

  const handleMouseDown = (side: "front" | "back") => (e: React.MouseEvent<HTMLCanvasElement>) => {
    const orig = side === "front" ? metrics.frontSpriteOffset : metrics.backSpriteOffset;
    dragging.current = { side, startX: e.clientX, startY: e.clientY, origOffset: [...orig] as [number, number] };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { side, startX, startY, origOffset } = dragging.current;
      const dx = Math.round(e.clientX - startX);
      const dy = Math.round(e.clientY - startY);
      const newOffset: [number, number] = [origOffset[0] + dx, origOffset[1] + dy];
      onChange({ ...metrics, [side === "front" ? "frontSpriteOffset" : "backSpriteOffset"]: newOffset });
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [metrics, onChange]);

  const inp: React.CSSProperties = {
    width: 60, padding: "2px 4px", fontSize: 11,
    border: "1px solid var(--color-surface1)", borderRadius: 3,
    background: "var(--color-crust)", color: "var(--color-text)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ color: "var(--color-subtext0)", fontSize: 11 }}>
        Drag sprites to adjust display offset. The red crosshair marks the base point.
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {(["front", "back"] as const).map((side) => {
          const offset = side === "front" ? metrics.frontSpriteOffset : metrics.backSpriteOffset;
          const key = side === "front" ? "frontSpriteOffset" : "backSpriteOffset";
          return (
            <div key={side} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-subtext0)", textTransform: "capitalize" }}>{side} Sprite</div>
              <canvas
                ref={side === "front" ? frontRef : backRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ border: "1px solid var(--color-surface1)", borderRadius: 4, cursor: "grab", display: "block" }}
                onMouseDown={handleMouseDown(side)}
              />
              <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}>
                <span style={{ color: "var(--color-subtext0)", minWidth: 14 }}>X</span>
                <input type="number" value={offset[0]} style={inp}
                  onChange={(e) => onChange({ ...metrics, [key]: [parseInt(e.target.value, 10) || 0, offset[1]] as [number,number] })} />
                <span style={{ color: "var(--color-subtext0)", minWidth: 14 }}>Y</span>
                <input type="number" value={offset[1]} style={inp}
                  onChange={(e) => onChange({ ...metrics, [key]: [offset[0], parseInt(e.target.value, 10) || 0] as [number,number] })} />
                <button style={{ fontSize: 10, padding: "1px 6px", background: "var(--color-surface0)", border: "1px solid var(--color-surface1)", borderRadius: 3, cursor: "pointer", color: "var(--color-text)" }}
                  onClick={() => onChange({ ...metrics, [key]: [0, 0] as [number,number] })}>Reset</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-subtext0)" }}>Shadow X</label>
          <input type="number" value={metrics.shadowX ?? 0} style={inp}
            onChange={(e) => onChange({ ...metrics, shadowX: parseInt(e.target.value, 10) || 0 })} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-subtext0)" }}>Shadow Size</label>
          <select value={metrics.shadowSize ?? 2} style={{ ...inp, width: 80 }}
            onChange={(e) => onChange({ ...metrics, shadowSize: parseInt(e.target.value, 10) })}>
            {SHADOW_SIZES.map((s, i) => <option key={i} value={i}>{i} — {s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Move learnset table ────────────────────────────────────────────────────────

function LearnsetTable({
  moves,
  moveNames,
  onChange,
}: {
  moves: LearnMove[];
  moveNames: string[];
  onChange: (m: LearnMove[]) => void;
}) {
  const dlId = useId();
  const sorted = [...moves].sort((a, b) => a.level - b.level);

  const updateMove = (idx: number, patch: Partial<LearnMove>) => {
    const next = [...sorted];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeMove = (idx: number) => {
    onChange(sorted.filter((_, i) => i !== idx));
  };

  const addMove = () => {
    onChange([...sorted, { level: 1, move: "" }]);
  };

  return (
    <div>
      <datalist id={dlId}>{moveNames.map((n) => <option key={n} value={n} />)}</datalist>
      <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #ccd0da", borderRadius: 4 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#e6e9ef", position: "sticky", top: 0 }}>
              <th style={{ padding: "4px 8px", textAlign: "left", width: 60 }}>Level</th>
              <th style={{ padding: "4px 8px", textAlign: "left" }}>Move</th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={i} style={{ borderTop: "1px solid #e6e9ef", background: i % 2 ? "#f8f9fb" : "#fff" }}>
                <td style={{ padding: "2px 8px" }}>
                  <input
                    type="number"
                    value={m.level}
                    onChange={(e) => updateMove(i, { level: parseInt(e.target.value, 10) || 0 })}
                    style={{ width: 48, padding: "1px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#fff", color: "#4c4f69" }}
                  />
                </td>
                <td style={{ padding: "2px 8px" }}>
                  <input
                    list={dlId}
                    value={m.move}
                    onChange={(e) => updateMove(i, { move: e.target.value })}
                    style={{ width: "100%", padding: "1px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#fff", color: "#4c4f69", boxSizing: "border-box" }}
                  />
                </td>
                <td style={{ padding: "2px 4px", textAlign: "center" }}>
                  <button onClick={() => removeMove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 13 }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addMove} style={{ marginTop: 6, fontSize: 11, padding: "3px 10px", background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
        + Add move
      </button>
    </div>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

// PE v21.1 stat display order: HP, Atk, Def, Spe, SpA, SpD
const STAT_LABELS = ["HP", "Atk", "Def", "Spe", "SpA", "SpD"] as const;
const STAT_KEYS = ["hp", "atk", "def", "spe", "spa", "spd"] as const;

function StatsTab({ stats, onChange }: { stats: BaseStats; onChange: (s: BaseStats) => void }) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {STAT_KEYS.map((key, i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 32, fontSize: 11, fontWeight: 600, color: "#5c5f77", textAlign: "right" }}>{STAT_LABELS[i]}</span>
              <input
                type="number"
                min={1}
                max={255}
                value={stats[key]}
                onChange={(e) => onChange({ ...stats, [key]: parseInt(e.target.value, 10) || 0 })}
                style={{ width: 56, padding: "3px 6px", fontSize: 12, border: "1px solid #ccd0da", borderRadius: 3, background: "#fff", color: "#4c4f69", textAlign: "center" }}
              />
              <div style={{
                height: 10, borderRadius: 5, overflow: "hidden",
                background: "#e6e9ef", width: 120,
              }}>
                <div style={{
                  height: "100%", borderRadius: 5,
                  width: `${Math.min(100, (stats[key] / 255) * 100)}%`,
                  background: stats[key] >= 100 ? "#40a02b" : stats[key] >= 60 ? "#df8e1d" : "#d20f39",
                }} />
              </div>
              <span style={{ fontSize: 10, color: "#8c8fa1", width: 28 }}>{stats[key]}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#8c8fa1" }}>Total: <strong>{total}</strong></div>
      </div>
      <RadarChart stats={stats} />
    </div>
  );
}

// ── Evolutions tab ────────────────────────────────────────────────────────────

function EvolutionsTab({
  evolutions,
  pokemonNames,
  onChange,
}: {
  evolutions: Evolution[];
  pokemonNames: string[];
  onChange: (evos: Evolution[]) => void;
}) {
  const dlId = useId();
  const METHODS = [
    // Level-up methods
    "Level", "LevelMale", "LevelFemale",
    "LevelDay", "LevelNight", "LevelMorning", "LevelAfternoon", "LevelEvening",
    "LevelNoWeather", "LevelSun", "LevelRain", "LevelSnow", "LevelSandstorm",
    "LevelCycling", "LevelSurfing", "LevelDiving", "LevelDarkness", "LevelDarkInParty",
    "AttackGreater", "AtkDefEqual", "DefenseGreater",
    "Silcoon", "Cascoon",
    // Happiness
    "Happiness", "HappinessDay", "HappinessNight",
    // Item-use methods
    "Item", "ItemMale", "ItemFemale", "ItemDay", "ItemNight", "ItemMorning",
    // Trade methods
    "Trade", "TradeItem", "TradeSpecies",
    // Party/move methods
    "HasMove", "HasMoveType", "HasInParty", "InArea", "Location",
    // Other
    "Beauty", "LevelAmie", "Shedinja", "None",
  ];
  const methodDlId = useId();

  return (
    <div>
      <datalist id={dlId}>{pokemonNames.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id={methodDlId}>{METHODS.map((m) => <option key={m} value={m} />)}</datalist>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {evolutions.map((evo, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "#f0f2f5", borderRadius: 4 }}>
            <span style={{ fontSize: 10, color: "#8c8fa1", width: 16 }}>→</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <input list={dlId} value={evo.species} onChange={(e) => { const next = [...evolutions]; next[i] = { ...evo, species: e.target.value }; onChange(next); }} placeholder="Species" style={{ ...evInp, flex: 1 }} />
                <input list={methodDlId} value={evo.method} onChange={(e) => { const next = [...evolutions]; next[i] = { ...evo, method: e.target.value }; onChange(next); }} placeholder="Method" style={{ ...evInp, flex: 1 }} />
                <input value={evo.parameter} onChange={(e) => { const next = [...evolutions]; next[i] = { ...evo, parameter: e.target.value }; onChange(next); }} placeholder="Param (level/item/etc)" style={{ ...evInp, flex: 1 }} />
              </div>
            </div>
            <button onClick={() => onChange(evolutions.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 13 }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange([...evolutions, { species: "", method: "Level", parameter: "" }])} style={{ alignSelf: "flex-start", fontSize: 11, padding: "3px 10px", background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
          + Add Evolution
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

type PokemonTab = "base" | "stats" | "moves" | "evolutions" | "forms" | "metrics";

export function PokemonPanel() {
  const { projectPath, pbsIndex } = usePbsEntityContext();
  const moveNames = pbsIndex.get("moves.txt") ?? [];
  const typeNames = pbsIndex.get("types.txt") ?? [];
  const abilityNames = pbsIndex.get("abilities.txt") ?? [];
  const itemNames = pbsIndex.get("items.txt") ?? [];
  const pokemonNames = pbsIndex.get("pokemon.txt") ?? [];

  const loadFn = useCallback(() => loadPokemon(projectPath), [projectPath]);
  const saveFn = useCallback((items: PokemonEntry[]) => savePokemon(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-pokemon", getId, loadFn, saveFn);

  const [tab, setTab] = useState<PokemonTab>("base");
  const [shiny, setShiny] = useState(false);

  const typesDlId = useId();
  const abilitiesDlId = useId();

  const handleAdd = () => {
    add({
      id: `NEWPOKE_${Date.now()}`, name: "New Pokémon",
      type1: "NORMAL", baseStats: { hp: 45, atk: 45, def: 45, spa: 45, spd: 45, spe: 45 },
      evYield: "", abilities: [], genderRatio: "FemaleOneEighth",
      catchRate: 45, happiness: 70, expYield: 64, growthRate: "Medium",
      eggGroups: ["Undiscovered"], hatchSteps: 1, height: 0.5, weight: 5.0,
      moves: [], tutorMoves: [], eggMoves: [], evolutions: [],
      color: "Red", shape: "Upright", forms: [],
    });
  };

  const TABS: { id: PokemonTab; label: string }[] = [
    { id: "base", label: "Base" },
    { id: "stats", label: "Stats" },
    { id: "moves", label: "Moves" },
    { id: "evolutions", label: "Evolutions" },
    { id: "forms", label: `Forms${selected?.forms?.length ? ` (${selected.forms.length})` : ""}` },
    { id: "metrics", label: "Metrics" },
  ];

  const GROWTH_RATES = ["Medium", "Slow", "Fast", "MediumSlow", "Parabolic", "Fluctuating", "Erratic"];
  const GENDER_RATIOS = ["AlwaysMale", "AlwaysFemale", "FemaleOneInEight", "FemaleOneInFour", "Female50Percent", "Female75Percent", "Female87_5Percent", "Genderless"];
  const COLORS = ["Red", "Blue", "Yellow", "Green", "Black", "Brown", "Purple", "Gray", "White", "Pink"];
  const EGG_GROUPS = ["Monster", "Water1", "Bug", "Flying", "Field", "Fairy", "Grass", "HumanLike", "Water3", "Mineral", "Amorphous", "Water2", "Ditto", "Dragon", "Undiscovered"];

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Left list */}
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(p) => `${p.id} — ${p.name}`}
        renderPrefix={(p) => (
          <PokemonIconSprite projectPath={projectPath} id={p.id} size={32} />
        )}
        onSelect={(id) => { select(id); setTab("base"); }}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
        addLabel="+ Add Pokémon"
      />

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {error && <div style={{ color: "#d20f39", fontSize: 12, padding: "4px 12px" }}>{error}</div>}

        {selected && (
          <>
            {/* Sprite header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16, padding: "12px 16px",
              borderBottom: "1px solid #ccd0da", background: "#f0f2f5", flexShrink: 0,
            }}>
              <img
                src={buildAssetUrl(`${projectPath}/Graphics/Pokemon/${shiny ? "Front shiny" : "Front"}/${selected.id}.png`)}
                alt={selected.id}
                style={{ width: 80, height: 80, imageRendering: "pixelated", objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.1"; }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#4c4f69" }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: "#8c8fa1", marginBottom: 4 }}>
                  {selected.id} · #{String(items.indexOf(selected) + 1).padStart(3, "0")}
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <TypeChip typeId={selected.type1} />
                  {selected.type2 && <TypeChip typeId={selected.type2} />}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => setShiny((s) => !s)}
                  style={{
                    padding: "3px 10px", fontSize: 10,
                    background: shiny ? "#df8e1d" : "#dce0e8",
                    color: shiny ? "#fff" : "#4c4f69",
                    border: "1px solid #ccd0da", borderRadius: 3, cursor: "pointer",
                  }}
                >✨ Shiny</button>
                <button
                  onClick={() => previewAudio(projectPath, "se", `Cries/${selected.id}`, 0.8)}
                  style={{ padding: "3px 10px", fontSize: 10, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
                >▶ Cry</button>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #ccd0da", padding: "4px 12px 0", background: "#e6e9ef", flexShrink: 0 }}>
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "4px 12px", fontSize: 11,
                  background: tab === t.id ? "#eff1f5" : "transparent",
                  border: "1px solid", borderColor: tab === t.id ? "#ccd0da" : "transparent",
                  borderBottom: tab === t.id ? "1px solid #eff1f5" : "1px solid transparent",
                  borderRadius: "4px 4px 0 0", cursor: "pointer",
                  color: tab === t.id ? "#4c4f69" : "#8c8fa1", fontWeight: tab === t.id ? 600 : 400,
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <datalist id={typesDlId}>{typeNames.map((n) => <option key={n} value={n} />)}</datalist>
              <datalist id={abilitiesDlId}>{abilityNames.map((n) => <option key={n} value={n} />)}</datalist>

              {/* Base tab */}
              {tab === "base" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 540 }}>
                  <Row2>
                    <Field label="Internal ID">
                      <input value={selected.id} onChange={(e) => update(selected.id, { id: e.target.value })} style={inp} />
                    </Field>
                    <Field label="Name">
                      <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} style={inp} />
                    </Field>
                  </Row2>
                  <Row2>
                    <Field label="Type 1">
                      <input list={typesDlId} value={selected.type1} onChange={(e) => update(selected.id, { type1: e.target.value })} style={inp} />
                    </Field>
                    <Field label="Type 2">
                      <input list={typesDlId} value={selected.type2 ?? ""} onChange={(e) => update(selected.id, { type2: e.target.value || undefined })} placeholder="(none)" style={inp} />
                    </Field>
                  </Row2>
                  <Field label="Abilities">
                    <ChipListEditor values={selected.abilities} options={abilityNames} maxItems={2} onChange={(v) => update(selected.id, { abilities: v })} placeholder="Add ability…" />
                  </Field>
                  <Field label="Hidden Ability">
                    <input list={abilitiesDlId} value={selected.hiddenAbility ?? ""} onChange={(e) => update(selected.id, { hiddenAbility: e.target.value || undefined })} placeholder="(none)" style={inp} />
                  </Field>
                  <Row2>
                    <Field label="Gender Ratio">
                      <select value={selected.genderRatio} onChange={(e) => update(selected.id, { genderRatio: e.target.value })} style={inp}>
                        {GENDER_RATIOS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Growth Rate">
                      <select value={selected.growthRate} onChange={(e) => update(selected.id, { growthRate: e.target.value })} style={inp}>
                        {GROWTH_RATES.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                  </Row2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {([["Catch Rate", "catchRate"], ["Base Happiness", "happiness"], ["Exp Yield", "expYield"], ["Hatch Steps", "hatchSteps"]] as const).map(([label, key]) => (
                      <Field key={key} label={label}>
                        <input type="number" value={(selected as unknown as Record<string, number>)[key]} onChange={(e) => update(selected.id, { [key]: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 80 }} />
                      </Field>
                    ))}
                  </div>
                  <Row2>
                    <Field label="Height (m)">
                      <input type="number" step="0.1" min="0.1" value={selected.height} onChange={(e) => update(selected.id, { height: parseFloat(e.target.value) || 0.1 })} style={{ ...inp, width: 80 }} />
                    </Field>
                    <Field label="Weight (kg)">
                      <input type="number" step="0.1" min="0.1" value={selected.weight} onChange={(e) => update(selected.id, { weight: parseFloat(e.target.value) || 0.1 })} style={{ ...inp, width: 80 }} />
                    </Field>
                    <Field label="Color">
                      <select value={selected.color} onChange={(e) => update(selected.id, { color: e.target.value })} style={inp}>
                        {COLORS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Shape">
                      <select value={selected.shape} onChange={(e) => update(selected.id, { shape: e.target.value })} style={inp}>
                        {["Upright","Quadruped","Fish","Snake","Arms","Blob","Multiparts","Multi-wing","Tentacles","Crystalline","Bug","Humanoid","Armor","Ball"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                  </Row2>
                  <Field label="Egg Groups">
                    <ChipListEditor values={selected.eggGroups} options={EGG_GROUPS} maxItems={2} onChange={(v) => update(selected.id, { eggGroups: v })} placeholder="Add egg group…" />
                  </Field>
                  <Field label="Tutor Moves">
                    <ChipListEditor values={selected.tutorMoves} options={moveNames} onChange={(v) => update(selected.id, { tutorMoves: v })} placeholder="Add tutor move…" />
                  </Field>
                  <Field label="Egg Moves">
                    <ChipListEditor values={selected.eggMoves} options={moveNames} onChange={(v) => update(selected.id, { eggMoves: v })} placeholder="Add egg move…" />
                  </Field>
                  <Field label="Flags">
                    <ChipListEditor values={selected.flags ?? []} onChange={(v) => update(selected.id, { flags: v })} placeholder="Legendary, Mythical…" />
                  </Field>
                  <Field label="EV Yield">
                    <EvYieldEditor
                      value={selected.evYield ?? ""}
                      onChange={(v) => update(selected.id, { evYield: v })}
                    />
                  </Field>
                  <Row2>
                    <Field label="Pokédex Category">
                      <input
                        value={selected.category ?? ""}
                        onChange={(e) => update(selected.id, { category: e.target.value || undefined })}
                        placeholder="Seed, Lizard, …"
                        style={inp}
                      />
                    </Field>
                    <Field label="Habitat">
                      <select value={selected.habitat ?? ""} onChange={(e) => update(selected.id, { habitat: e.target.value || undefined })} style={inp}>
                        <option value="">(none)</option>
                        {["Cave", "Forest", "Grassland", "Mountain", "Rare", "RoughTerrain", "Sea", "Urban", "WatersEdge"].map((h) => <option key={h}>{h}</option>)}
                      </select>
                    </Field>
                  </Row2>
                  <Field label="Pokédex Entry">
                    <textarea
                      value={selected.pokedex ?? ""}
                      onChange={(e) => update(selected.id, { pokedex: e.target.value || undefined })}
                      rows={3}
                      style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </Field>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Field label="Wild Item (Common)">
                      <input list={abilitiesDlId} value={selected.wildItems?.common ?? ""} onChange={(e) => update(selected.id, { wildItems: { ...selected.wildItems, common: e.target.value || undefined } })} placeholder="(none)" style={{ ...inp, width: 130 }} />
                    </Field>
                    <Field label="Wild Item (Uncommon)">
                      <input value={selected.wildItems?.uncommon ?? ""} onChange={(e) => update(selected.id, { wildItems: { ...selected.wildItems, uncommon: e.target.value || undefined } })} placeholder="(none)" style={{ ...inp, width: 130 }} />
                    </Field>
                    <Field label="Wild Item (Rare)">
                      <input value={selected.wildItems?.rare ?? ""} onChange={(e) => update(selected.id, { wildItems: { ...selected.wildItems, rare: e.target.value || undefined } })} placeholder="(none)" style={{ ...inp, width: 130 }} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Stats tab */}
              {tab === "stats" && (
                <StatsTab
                  stats={selected.baseStats}
                  onChange={(s) => update(selected.id, { baseStats: s })}
                />
              )}

              {/* Moves tab */}
              {tab === "moves" && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#5c5f77", marginBottom: 8 }}>Level-Up Moves</div>
                  <LearnsetTable
                    moves={selected.moves}
                    moveNames={moveNames}
                    onChange={(m) => update(selected.id, { moves: m })}
                  />
                </div>
              )}

              {/* Evolutions tab */}
              {tab === "evolutions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#5c5f77", marginBottom: 8 }}>Evolution Chain</div>
                    <EvolutionChain entry={selected} all={items} projectPath={projectPath} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#5c5f77", marginBottom: 8 }}>Edit Evolutions</div>
                    <EvolutionsTab
                      evolutions={selected.evolutions}
                      pokemonNames={pokemonNames}
                      onChange={(evos) => update(selected.id, { evolutions: evos })}
                    />
                  </div>
                </div>
              )}

              {/* Forms tab */}
              {tab === "forms" && (
                <FormsTab
                  forms={selected.forms ?? []}
                  typeNames={typeNames}
                  abilityNames={abilityNames}
                  moveNames={moveNames}
                  itemNames={itemNames}
                  onChange={(forms) => update(selected.id, { forms })}
                />
              )}

              {/* Metrics tab */}
              {tab === "metrics" && (
                <MetricsVisualEditor
                  pokemonId={selected.id}
                  projectPath={projectPath}
                  metrics={selected.metrics ?? DEFAULT_METRICS}
                  onChange={(m) => update(selected.id, { metrics: m })}
                />
              )}
            </div>
          </>
        )}

        {!selected && !loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8fa1", fontSize: 13 }}>
            Select a Pokémon to edit.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Forms tab ─────────────────────────────────────────────────────────────────

function FormsTab({
  forms, typeNames, abilityNames, moveNames, itemNames, onChange,
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

// ── EV Yield editor ───────────────────────────────────────────────────────────

const EV_STATS = ["HP", "ATTACK", "DEFENSE", "SPEED", "SPECIAL_ATTACK", "SPECIAL_DEFENSE"] as const;

function parseEvYield(raw: string): { stat: string; amount: number }[] {
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const pairs: { stat: string; amount: number }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    pairs.push({ stat: parts[i], amount: parseInt(parts[i + 1], 10) || 1 });
  }
  return pairs;
}

function serializeEvYield(pairs: { stat: string; amount: number }[]): string {
  return pairs.map((p) => `${p.stat},${p.amount}`).join(",");
}

function EvYieldEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const pairs = parseEvYield(value);

  const updatePair = (idx: number, patch: Partial<{ stat: string; amount: number }>) => {
    const next = pairs.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(serializeEvYield(next));
  };

  const addPair = () => {
    const used = new Set(pairs.map((p) => p.stat));
    const next = EV_STATS.find((s) => !used.has(s)) ?? "HP";
    onChange(serializeEvYield([...pairs, { stat: next, amount: 1 }]));
  };

  const removePair = (idx: number) => {
    onChange(serializeEvYield(pairs.filter((_, i) => i !== idx)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {pairs.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <select
            value={p.stat}
            onChange={(e) => updatePair(i, { stat: e.target.value })}
            style={{ ...evInp, flex: 1 }}
          >
            {EV_STATS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="number" min={1} max={3}
            value={p.amount}
            onChange={(e) => updatePair(i, { amount: parseInt(e.target.value, 10) || 1 })}
            style={{ ...evInp, width: 48 }}
          />
          <button
            onClick={() => removePair(i)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 14, lineHeight: 1, padding: "0 2px" }}
          >×</button>
        </div>
      ))}
      {pairs.length < 3 && (
        <button
          onClick={addPair}
          style={{ fontSize: 10, padding: "2px 8px", background: "none", border: "1px dashed #ccd0da", borderRadius: 3, cursor: "pointer", color: "#8c8fa1", alignSelf: "flex-start" }}
        >+ Add stat</button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77" }}>{label}</label>
      {children}
    </div>
  );
}
function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}
const inp: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12, border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69", width: "100%", boxSizing: "border-box",
};
const evInp: React.CSSProperties = {
  padding: "3px 6px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3,
  background: "#fff", color: "#4c4f69", boxSizing: "border-box",
};
