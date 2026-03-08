/**
 * RankTableEditor — grid for element_ranks / state_ranks Tables.
 *
 * RMXP ranks are stored as a Table(N) where each cell is 1-6 mapping to:
 * 1=A, 2=B, 3=C (default), 4=D, 5=E, 6=F
 *
 * Since Tables are binary and preserved by the smart merge, we store
 * ranks as a separate JSON array that gets merged back by the backend.
 * The component works with a simple number[] representation.
 */

interface Props {
  /** Rank values (1=A through 6=F), indexed starting at 1 */
  ranks: number[];
  /** Labels for each rank index (element or state names) */
  labels: string[];
  onChange: (ranks: number[]) => void;
}

const RANK_LABELS = ["", "A", "B", "C", "D", "E", "F"];
const RANK_COLORS: Record<number, string> = {
  1: "#a6e3a1", // A = green
  2: "#89b4fa", // B = blue
  3: "#a6adc8", // C = default gray
  4: "#f9e2af", // D = yellow
  5: "#fab387", // E = orange
  6: "#f38ba8", // F = red
};

export function RankTableEditor({ ranks, labels, onChange }: Props) {
  const setRank = (index: number, val: number) => {
    const copy = [...ranks];
    while (copy.length <= index) copy.push(3); // default C
    copy[index] = val;
    onChange(copy);
  };

  if (labels.length === 0) {
    return <div style={{ fontSize: 11, color: "#6c7086", padding: 4 }}>No entries to rank</div>;
  }

  return (
    <div className="db-sublist" style={{ maxHeight: 200, padding: 2 }}>
      {labels.map((label, i) => {
        const idx = i + 1; // ranks are 1-indexed
        const rank = ranks[idx] ?? 3;
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "1px 6px",
              fontSize: 11,
              borderBottom: "1px solid #11111b",
            }}
          >
            <span style={{ color: "#6c7086", width: 28, flexShrink: 0, fontSize: 10 }}>
              {String(idx).padStart(3, "0")}
            </span>
            <span style={{ flex: 1, color: "#a6adc8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {label || `#${idx}`}
            </span>
            <select
              value={rank}
              onChange={(e) => setRank(idx, +e.target.value)}
              style={{
                width: 44,
                padding: "1px 2px",
                fontSize: 11,
                fontWeight: 600,
                background: "#11111b",
                border: "1px solid #45475a",
                borderRadius: 2,
                color: RANK_COLORS[rank] ?? "#a6adc8",
                textAlign: "center",
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>{RANK_LABELS[v]}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
