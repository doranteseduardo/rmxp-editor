/**
 * PbsFieldRow — renders a single key/value pair with smart widgets
 * based on field metadata (cross-ref autocomplete, asset preview, stat inputs, etc.).
 */
import { useState, useCallback, useId } from "react";
import type { FieldMeta } from "../../types/pbsTypes";
import { usePbsContext } from "./PbsContext";
import { previewAudio } from "../../services/tauriApi";

interface Props {
  fieldKey: string;
  value: string;
  meta: FieldMeta;
  onChange: (value: string) => void;
  onDelete: () => void;
}

function buildAssetUrl(filePath: string): string {
  return `asset://localhost/${encodeURIComponent(filePath)}`;
}

// ── Stat list: 6 HP/Atk/Def/SpAtk/SpDef/Speed inputs ──────────────────────

const STAT_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

function StatListInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.split(",").map((v) => v.trim());
  while (parts.length < 6) parts.push("0");

  const handleChange = (idx: number, v: string) => {
    const next = [...parts];
    next[idx] = v;
    onChange(next.join(","));
  };

  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {STAT_LABELS.map((label, i) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <input
            type="number"
            value={parts[i] ?? "0"}
            onChange={(e) => handleChange(i, e.target.value)}
            style={{
              width: 42, padding: "2px 3px", fontSize: 11,
              border: "1px solid #ccd0da", borderRadius: 3,
              background: "#eff1f5", color: "#4c4f69", textAlign: "center",
            }}
          />
          <span style={{ fontSize: 9, color: "#8c8fa1" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Move list: level+move pairs ─────────────────────────────────────────────

function MoveListInput({
  value,
  refFile,
  onChange,
}: {
  value: string;
  refFile?: string;
  onChange: (v: string) => void;
}) {
  const { pbsIndex } = usePbsContext();
  const moveNames = refFile ? (pbsIndex.get(refFile) ?? []) : [];
  const datalistId = useId();

  // Parse "level,MOVE,level,MOVE,..." pairs
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  const pairs: Array<{ level: string; move: string }> = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    pairs.push({ level: parts[i], move: parts[i + 1] });
  }

  const serialize = (p: typeof pairs) =>
    p.map((x) => `${x.level},${x.move}`).join(",");

  const handleChange = (idx: number, field: "level" | "move", v: string) => {
    const next = [...pairs];
    next[idx] = { ...next[idx], [field]: v };
    onChange(serialize(next));
  };

  const handleAdd = () => {
    onChange(serialize([...pairs, { level: "1", move: "" }]));
  };

  const handleRemove = (idx: number) => {
    const next = pairs.filter((_, i) => i !== idx);
    onChange(serialize(next));
  };

  return (
    <div>
      <datalist id={datalistId}>
        {moveNames.map((n) => <option key={n} value={n} />)}
      </datalist>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {pairs.map((pair, i) => (
          <div key={i} style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <input
              type="number"
              value={pair.level}
              onChange={(e) => handleChange(i, "level", e.target.value)}
              style={{ width: 36, padding: "2px 3px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69", textAlign: "center" }}
            />
            <input
              list={datalistId}
              value={pair.move}
              onChange={(e) => handleChange(i, "move", e.target.value)}
              style={{ flex: 1, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
            />
            <button onClick={() => handleRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 12 }}>×</button>
          </div>
        ))}
        <button
          onClick={handleAdd}
          style={{ alignSelf: "flex-start", padding: "2px 8px", fontSize: 10, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", marginTop: 2 }}
        >
          + Add move
        </button>
      </div>
    </div>
  );
}

// ── Asset image preview ─────────────────────────────────────────────────────

function AssetPreview({ projectPath, assetDir, name, suffix }: { projectPath: string; assetDir: string; name: string; suffix: string }) {
  const [failed, setFailed] = useState(false);
  if (!name || failed) return <span style={{ fontSize: 10, color: "#8c8fa1" }}>—</span>;
  const path = `${projectPath}/${assetDir}/${name}${suffix}`;
  return (
    <img
      src={buildAssetUrl(path)}
      alt={name}
      onError={() => setFailed(true)}
      style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain", border: "1px solid #ccd0da", borderRadius: 2 }}
    />
  );
}

// ── Audio play button ───────────────────────────────────────────────────────

function AudioPlayButton({ projectPath, assetDir, name }: { projectPath: string; assetDir?: string; name: string }) {
  const [playing, setPlaying] = useState(false);
  if (!name) return null;

  const dir = assetDir ?? "Audio/BGM";
  // assetDir is like "Audio/BGM" — split into assetType="BGM" and the name
  const assetType = dir.split("/").pop() ?? "BGM";

  const handlePlay = useCallback(async () => {
    setPlaying(true);
    try {
      await previewAudio(projectPath, assetType, name, 0.8);
    } finally {
      setTimeout(() => setPlaying(false), 2000);
    }
  }, [projectPath, assetType, name]);

  return (
    <button
      onClick={handlePlay}
      disabled={playing}
      title={`Play ${name}`}
      style={{
        padding: "2px 6px", fontSize: 10,
        background: playing ? "#40a02b" : "#1e66f5",
        color: "#fff", border: "none", borderRadius: 3, cursor: "pointer",
      }}
    >
      {playing ? "▶ Playing" : "▶"}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function PbsFieldRow({ fieldKey, value, meta, onChange, onDelete }: Props) {
  const { pbsIndex, projectPath } = usePbsContext();
  const datalistId = useId();
  const refNames = meta.refFile ? (pbsIndex.get(meta.refFile) ?? []) : [];

  const renderInput = () => {
    switch (meta.type) {
      case "statList":
        return <StatListInput value={value} onChange={onChange} />;

      case "moveList":
        return <MoveListInput value={value} refFile={meta.refFile} onChange={onChange} />;

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 80, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
          />
        );

      case "ref":
        return (
          <>
            <datalist id={datalistId}>
              {refNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            <input
              list={datalistId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
            />
          </>
        );

      case "refList":
        return (
          <>
            <datalist id={datalistId}>
              {refNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            <input
              list={datalistId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              title="Comma-separated list"
              style={{ flex: 1, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
            />
          </>
        );

      case "asset":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
            />
            {meta.assetDir && (
              <AssetPreview
                projectPath={projectPath}
                assetDir={meta.assetDir}
                name={value}
                suffix={meta.assetSuffix ?? ".png"}
              />
            )}
          </div>
        );

      case "assetAudio":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
            />
            {value && (
              <AudioPlayButton projectPath={projectPath} assetDir={meta.assetDir} name={value} />
            )}
          </div>
        );

      case "csv":
      case "text":
      default:
        return (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, padding: "2px 4px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3, background: "#eff1f5", color: "#4c4f69" }}
          />
        );
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "4px 8px",
      borderBottom: "1px solid #e6e9ef",
    }}>
      {/* Key label */}
      <span style={{
        width: 140, flexShrink: 0, paddingTop: 3,
        fontSize: 11, color: "#5c5f77", fontWeight: 500,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }} title={fieldKey}>
        {fieldKey}
      </span>

      {/* Value widget */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
        {renderInput()}
      </div>

      {/* Delete field */}
      <button
        onClick={onDelete}
        title="Remove field"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#acb0be", fontSize: 13, padding: "0 2px", lineHeight: 1,
          flexShrink: 0, paddingTop: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}
