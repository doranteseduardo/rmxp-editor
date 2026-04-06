import { useState, useCallback } from "react";
import type { PbsSection } from "../../types/pbsTypes";
import { usePbsContext } from "./PbsContext";
import { POKEMON_SPRITE_FILES, TRAINER_SPRITE_FILES, ITEM_ICON_FILES } from "../../services/pbsMeta";

interface Props {
  filename: string;
  sections: PbsSection[];
  selectedHeader: string | null;
  onSelect: (header: string) => void;
  onAdd: (header: string) => void;
  onDelete: (header: string) => void;
}

function buildAssetUrl(filePath: string): string {
  return `asset://localhost/${encodeURIComponent(filePath)}`;
}

function SectionIcon({ filename, header, projectPath }: { filename: string; header: string; projectPath: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) return null;

  let assetPath: string | null = null;
  // Extract base name for forms (e.g. "VENUSAUR,1" → "VENUSAUR")
  const baseName = header.includes(",") ? header.split(",")[0] : header;

  if (POKEMON_SPRITE_FILES.has(filename)) {
    assetPath = `${projectPath}/Graphics/Pokemon/Icons/${baseName}.png`;
  } else if (TRAINER_SPRITE_FILES.has(filename)) {
    assetPath = `${projectPath}/Graphics/Trainers/${header}.png`;
  } else if (ITEM_ICON_FILES.has(filename)) {
    assetPath = `${projectPath}/Graphics/Icons/${header}.png`;
  }

  if (!assetPath) return null;

  return (
    <img
      src={buildAssetUrl(assetPath)}
      alt=""
      onError={() => setImgFailed(true)}
      style={{
        width: 24, height: 24,
        imageRendering: "pixelated",
        flexShrink: 0,
        objectFit: "contain",
      }}
    />
  );
}

export function PbsSectionList({ filename, sections, selectedHeader, onSelect, onAdd, onDelete }: Props) {
  const { projectPath } = usePbsContext();
  const [filter, setFilter] = useState("");
  const [newHeader, setNewHeader] = useState("");

  const filtered = filter
    ? sections.filter((s) => s.header.toLowerCase().includes(filter.toLowerCase()))
    : sections;

  const handleAdd = useCallback(() => {
    const h = newHeader.trim().toUpperCase();
    if (!h) return;
    onAdd(h);
    setNewHeader("");
  }, [newHeader, onAdd]);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: 180, flexShrink: 0,
      borderRight: "1px solid #ccd0da",
      background: "#e6e9ef",
    }}>
      {/* Search */}
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #ccd0da" }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter..."
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "3px 6px", fontSize: 11,
            border: "1px solid #ccd0da", borderRadius: 3,
            background: "#eff1f5", color: "#4c4f69",
          }}
        />
      </div>

      {/* Section list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map((section) => (
          <div
            key={section.header}
            onClick={() => onSelect(section.header)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 8px",
              background: section.header === selectedHeader ? "#1e66f5" : "transparent",
              color: section.header === selectedHeader ? "#fff" : "#4c4f69",
              cursor: "pointer",
              fontSize: 11,
              userSelect: "none",
            }}
          >
            <SectionIcon filename={filename} header={section.header} projectPath={projectPath} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {section.header}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(section.header); }}
              title="Delete section"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: section.header === selectedHeader ? "#cdd6f4" : "#8c8fa1",
                fontSize: 10, padding: "0 2px", lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 8, fontSize: 11, color: "#8c8fa1" }}>
            {filter ? "No matches" : "No sections"}
          </div>
        )}
      </div>

      {/* Add section */}
      <div style={{ padding: "6px 8px", borderTop: "1px solid #ccd0da", display: "flex", gap: 4 }}>
        <input
          value={newHeader}
          onChange={(e) => setNewHeader(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="NEW_ENTRY"
          style={{
            flex: 1, boxSizing: "border-box",
            padding: "3px 6px", fontSize: 11,
            border: "1px solid #ccd0da", borderRadius: 3,
            background: "#eff1f5", color: "#4c4f69",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newHeader.trim()}
          style={{
            padding: "3px 8px", fontSize: 11,
            background: "#1e66f5", color: "#fff",
            border: "none", borderRadius: 3, cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      <div style={{ padding: "2px 8px 4px", fontSize: 9, color: "#8c8fa1" }}>
        {sections.length} entries
      </div>
    </div>
  );
}
