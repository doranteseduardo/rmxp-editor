/**
 * PbsFieldEditor — right panel: key/value table for the selected section.
 * Shows asset previews for Pokémon sprite files at the top.
 */
import { useState, useCallback } from "react";
import type { PbsSection } from "../../types/pbsTypes";
import { getFieldMeta, POKEMON_SPRITE_FILES } from "../../services/pbsMeta";
import { usePbsContext } from "./PbsContext";
import { PbsFieldRow } from "./PbsFieldRow";

interface Props {
  filename: string;
  section: PbsSection | null;
  onUpdateField: (key: string, value: string) => void;
  onAddField: (key: string) => void;
  onDeleteField: (key: string) => void;
}

function buildAssetUrl(path: string): string {
  return `asset://localhost/${encodeURIComponent(path)}`;
}

function PokemonHeader({ header, projectPath }: { header: string; projectPath: string }) {
  const baseName = header.includes(",") ? header.split(",")[0] : header;
  const [shiny, setShiny] = useState(false);
  const [frontFailed, setFrontFailed] = useState(false);
  const [shinyFailed, setShinyFailed] = useState(false);

  const frontDir = shiny ? "Graphics/Pokemon/Front shiny" : "Graphics/Pokemon/Front";
  const frontPath = `${projectPath}/${frontDir}/${baseName}.png`;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 12px", background: "#e6e9ef", borderBottom: "1px solid #ccd0da",
    }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        {!frontFailed && !shinyFailed && (
          <img
            src={buildAssetUrl(frontPath)}
            alt={baseName}
            onError={() => {
              if (shiny) setShinyFailed(true);
              else setFrontFailed(true);
            }}
            style={{ width: 80, height: 80, imageRendering: "pixelated", objectFit: "contain" }}
          />
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#4c4f69" }}>{header}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
          <label style={{ fontSize: 10, color: "#8c8fa1", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={shiny}
              onChange={(e) => { setShiny(e.target.checked); setShinyFailed(false); }}
            />
            Shiny
          </label>
        </div>
      </div>
    </div>
  );
}

export function PbsFieldEditor({ filename, section, onUpdateField, onAddField, onDeleteField }: Props) {
  const { projectPath } = usePbsContext();
  const [newKey, setNewKey] = useState("");

  const handleAddField = useCallback(() => {
    const k = newKey.trim();
    if (!k) return;
    onAddField(k);
    setNewKey("");
  }, [newKey, onAddField]);

  if (!section) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8fa1", fontSize: 12 }}>
        Select a section to edit
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Pokémon sprite header */}
      {POKEMON_SPRITE_FILES.has(filename) && (
        <PokemonHeader header={section.header} projectPath={projectPath} />
      )}

      {/* Section header label (for non-pokemon files) */}
      {!POKEMON_SPRITE_FILES.has(filename) && (
        <div style={{
          padding: "6px 12px", background: "#e6e9ef", borderBottom: "1px solid #ccd0da",
          fontSize: 13, fontWeight: 700, color: "#4c4f69",
        }}>
          [{section.header}]
        </div>
      )}

      {/* Field rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {section.fields.map((field) => (
          <PbsFieldRow
            key={field.key}
            fieldKey={field.key}
            value={field.value}
            meta={getFieldMeta(filename, field.key)}
            onChange={(v) => onUpdateField(field.key, v)}
            onDelete={() => onDeleteField(field.key)}
          />
        ))}
        {section.fields.length === 0 && (
          <div style={{ padding: 12, fontSize: 11, color: "#8c8fa1" }}>No fields — add one below</div>
        )}
      </div>

      {/* Add field */}
      <div style={{
        padding: "6px 8px", borderTop: "1px solid #ccd0da",
        display: "flex", gap: 4, background: "#eff1f5",
      }}>
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddField(); }}
          placeholder="FieldName"
          style={{
            flex: 1, padding: "3px 6px", fontSize: 11,
            border: "1px solid #ccd0da", borderRadius: 3,
            background: "#fff", color: "#4c4f69",
          }}
        />
        <button
          onClick={handleAddField}
          disabled={!newKey.trim()}
          style={{
            padding: "3px 8px", fontSize: 11,
            background: "#1e66f5", color: "#fff",
            border: "none", borderRadius: 3, cursor: "pointer",
          }}
        >
          + Add field
        </button>
      </div>
    </div>
  );
}
