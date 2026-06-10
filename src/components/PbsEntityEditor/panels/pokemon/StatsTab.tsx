import type { BaseStats } from "../../../../types/pbsEntityTypes";
import { RadarChart } from "./RadarChart";

// PE v21.1 stat display order: HP, Atk, Def, Spe, SpA, SpD
const STAT_LABELS = ["HP", "Atk", "Def", "Spe", "SpA", "SpD"] as const;
const STAT_KEYS = ["hp", "atk", "def", "spe", "spa", "spd"] as const;

export function StatsTab({ stats, onChange }: { stats: BaseStats; onChange: (s: BaseStats) => void }) {
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
