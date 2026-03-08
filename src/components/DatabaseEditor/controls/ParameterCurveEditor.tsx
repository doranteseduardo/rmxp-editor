/**
 * ParameterCurveEditor — editable grid + mini sparkline for Actor parameters.
 *
 * Actor parameters is a Table(6, 100) — 6 stats × 100 levels.
 * Stats: 0=Max HP, 1=Max SP, 2=STR, 3=DEX, 4=AGI, 5=INT
 *
 * Provides:
 * - A compact grid showing values at levels 1, 10, 20, ..., 99
 * - Inline editing of any level's value
 * - SVG sparkline per stat
 */
import { useState, useMemo, useCallback } from "react";

const STAT_NAMES = ["Max HP", "Max SP", "STR", "DEX", "AGI", "INT"];
const STAT_COLORS = ["#a6e3a1", "#89b4fa", "#f38ba8", "#f9e2af", "#fab387", "#cba6f7"];
const PREVIEW_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99];

interface Props {
  /** Flat array of 6×100 values: params[stat * 100 + (level-1)] */
  values: number[];
  onChange: (values: number[]) => void;
}

function Sparkline({ data, color, width = 120, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
    </svg>
  );
}

export function ParameterCurveEditor({ values, onChange }: Props) {
  const [editingStat, setEditingStat] = useState<number | null>(null);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);

  const getVal = useCallback((stat: number, level: number) => {
    const idx = stat * 100 + (level - 1);
    return values[idx] ?? 0;
  }, [values]);

  const setVal = useCallback((stat: number, level: number, val: number) => {
    const copy = [...values];
    while (copy.length < 600) copy.push(0);
    copy[stat * 100 + (level - 1)] = val;
    onChange(copy);
  }, [values, onChange]);

  // Get all 99 values for a stat (for sparkline)
  const statData = useMemo(() => {
    return STAT_NAMES.map((_, stat) => {
      const arr: number[] = [];
      for (let lv = 1; lv <= 99; lv++) arr.push(getVal(stat, lv));
      return arr;
    });
  }, [getVal]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 70, textAlign: "left" }}>Stat</th>
            <th style={{ ...thStyle, width: 120 }}>Curve</th>
            {PREVIEW_LEVELS.map((lv) => (
              <th key={lv} style={thStyle}>Lv{lv}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAT_NAMES.map((name, stat) => (
            <tr key={stat}>
              <td style={{ ...tdStyle, color: STAT_COLORS[stat], fontWeight: 600 }}>{name}</td>
              <td style={tdStyle}>
                <Sparkline data={statData[stat]} color={STAT_COLORS[stat]} />
              </td>
              {PREVIEW_LEVELS.map((lv) => (
                <td key={lv} style={tdStyle}>
                  {editingStat === stat && editingLevel === lv ? (
                    <input
                      type="number"
                      autoFocus
                      value={getVal(stat, lv)}
                      onChange={(e) => setVal(stat, lv, +e.target.value)}
                      onBlur={() => { setEditingStat(null); setEditingLevel(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { setEditingStat(null); setEditingLevel(null); } }}
                      style={{
                        width: 50, padding: "1px 2px", fontSize: 11,
                        background: "#11111b", border: "1px solid #89b4fa",
                        borderRadius: 2, color: "#cdd6f4", textAlign: "center",
                      }}
                    />
                  ) : (
                    <span
                      style={{ cursor: "pointer", padding: "2px 4px", borderRadius: 2 }}
                      onClick={() => { setEditingStat(stat); setEditingLevel(lv); }}
                      title={`Click to edit Lv${lv} ${name}`}
                    >
                      {getVal(stat, lv)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "3px 4px",
  borderBottom: "1px solid #313244",
  color: "#6c7086",
  fontSize: 10,
  fontWeight: 500,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "2px 4px",
  borderBottom: "1px solid #181825",
  textAlign: "center",
  color: "#a6adc8",
};
