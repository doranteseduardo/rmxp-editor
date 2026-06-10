import { useId } from "react";
import type { LearnMove } from "../../../../types/pbsEntityTypes";

export function LearnsetTable({
  moves,
  moveNames,
  onChange,
}: {
  moves: LearnMove[];
  moveNames: string[];
  onChange: (m: LearnMove[]) => void;
}) {
  const dlId = useId();
  // Display sorted by level, but keep each row's identity tied to its index in
  // the backing `moves` array. Editing operates on that original index, and rows
  // are keyed by it, so a re-sort never reassigns an edit to a different move.
  const order = moves.map((m, i) => ({ m, i })).sort((a, b) => a.m.level - b.m.level);

  const updateMove = (origIdx: number, patch: Partial<LearnMove>) => {
    onChange(moves.map((m, i) => (i === origIdx ? { ...m, ...patch } : m)));
  };

  const removeMove = (origIdx: number) => {
    onChange(moves.filter((_, i) => i !== origIdx));
  };

  const addMove = () => {
    onChange([...moves, { level: 1, move: "" }]);
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
            {order.map(({ m, i }, row) => (
              <tr key={i} style={{ borderTop: "1px solid #e6e9ef", background: row % 2 ? "#f8f9fb" : "#fff" }}>
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
