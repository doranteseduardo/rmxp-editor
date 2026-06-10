import { evInp } from "./shared";

const EV_STATS = ["HP", "ATTACK", "DEFENSE", "SPEED", "SPECIAL_ATTACK", "SPECIAL_DEFENSE"] as const;

export function parseEvYield(raw: string): { stat: string; amount: number }[] {
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const pairs: { stat: string; amount: number }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    pairs.push({ stat: parts[i], amount: parseInt(parts[i + 1], 10) || 1 });
  }
  return pairs;
}

export function serializeEvYield(pairs: { stat: string; amount: number }[]): string {
  return pairs.map((p) => `${p.stat},${p.amount}`).join(",");
}

export function EvYieldEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
