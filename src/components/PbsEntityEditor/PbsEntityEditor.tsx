/**
 * PbsEntityEditor — entity-based PBS editor.
 * Replaces the file-based PbsEditor with a sidebar-navigated shell
 * where each section (Pokémon, Moves, Abilities, Items, Types, Trainers,
 * Encounters, World, Settings) loads/saves its own set of PBS files.
 */
import { useState, useEffect, useCallback } from "react";
import { buildPbsIndex } from "../../services/pbsIndex";
import { useProjectSave } from "../../context/ProjectSaveContext";
import { PbsEntityContext } from "./PbsEntityContext";
import { PokemonPanel } from "./panels/PokemonPanel";
import { MovesPanel } from "./panels/MovesPanel";
import { AbilitiesPanel } from "./panels/AbilitiesPanel";
import { ItemsPanel } from "./panels/ItemsPanel";
import { TypesPanel } from "./panels/TypesPanel";
import { TrainersPanel } from "./panels/TrainersPanel";
import { EncountersPanel } from "./panels/EncountersPanel";
import { WorldPanel } from "./panels/WorldPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import type { PbsIndex } from "../../services/pbsIndex";
import "./PbsEntityEditor.css";

interface Props {
  projectPath: string;
  mapNames: Map<number, string>;
  onClose: () => void;
}

type SectionId =
  | "pokemon" | "moves" | "abilities" | "items" | "types"
  | "trainers" | "encounters" | "world" | "settings";

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
  dirtyPrefix: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "pokemon",    label: "Pokémon",   icon: "🐾", dirtyPrefix: "pbs-pokemon" },
  { id: "moves",      label: "Moves",     icon: "⚡", dirtyPrefix: "pbs-moves" },
  { id: "abilities",  label: "Abilities", icon: "✨", dirtyPrefix: "pbs-abilities" },
  { id: "items",      label: "Items",     icon: "🎒", dirtyPrefix: "pbs-items" },
  { id: "types",      label: "Types",     icon: "🔷", dirtyPrefix: "pbs-types" },
  { id: "trainers",   label: "Trainers",  icon: "👤", dirtyPrefix: "pbs-trainer" },
  { id: "encounters", label: "Encounters",icon: "🌿", dirtyPrefix: "pbs-encounters" },
  { id: "world",      label: "World",     icon: "🗺",  dirtyPrefix: "pbs-world" },
  { id: "settings",   label: "Settings",  icon: "⚙",  dirtyPrefix: "pbs-settings" },
];

export function PbsEntityEditor({ projectPath, mapNames, onClose }: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>("pokemon");
  const [pbsIndex, setPbsIndex] = useState<PbsIndex>(new Map());
  const [saving, setSaving] = useState(false);
  const { dirtyIds, saveAll, discardAll } = useProjectSave();

  const hasDirty = Array.from(dirtyIds).some((id) => id.startsWith("pbs-"));

  // Build cross-reference index on mount
  useEffect(() => {
    buildPbsIndex(projectPath).then(setPbsIndex).catch(() => {});
  }, [projectPath]);

  const handleApply = useCallback(async () => {
    setSaving(true);
    try {
      await saveAll("pbs-");
    } finally {
      setSaving(false);
    }
  }, [saveAll]);

  const handleCancel = useCallback(() => {
    discardAll("pbs-");
  }, [discardAll]);

  return (
    <PbsEntityContext.Provider value={{ pbsIndex, projectPath, mapNames }}>
      <div className="pbs-entity-editor">
        {/* Header */}
        <div className="pbs-entity-header">
          <span className="pbs-entity-title">PBS Data Editor</span>
          {hasDirty && <span className="pbs-entity-dirty-badge">Unsaved changes</span>}
          <button className="pbs-entity-close" onClick={onClose}>×</button>
        </div>

        <div className="pbs-entity-body">
          {/* Sidebar navigation */}
          <nav className="pbs-entity-sidebar">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              const isDirty = Array.from(dirtyIds).some((id) => id.startsWith(item.dirtyPrefix));
              return (
                <button
                  key={item.id}
                  className={`pbs-entity-nav-item${isActive ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span className="pbs-entity-nav-icon">{item.icon}</span>
                  <span className="pbs-entity-nav-label">{item.label}</span>
                  {isDirty && <span className="pbs-entity-nav-dirty" />}
                </button>
              );
            })}
          </nav>

          {/* Section panels — all always mounted, toggled via display:none */}
          <div className="pbs-entity-panels">
            <div style={{ display: activeSection === "pokemon"    ? "contents" : "none" }}><PokemonPanel /></div>
            <div style={{ display: activeSection === "moves"      ? "contents" : "none" }}><MovesPanel /></div>
            <div style={{ display: activeSection === "abilities"  ? "contents" : "none" }}><AbilitiesPanel /></div>
            <div style={{ display: activeSection === "items"      ? "contents" : "none" }}><ItemsPanel /></div>
            <div style={{ display: activeSection === "types"      ? "contents" : "none" }}><TypesPanel /></div>
            <div style={{ display: activeSection === "trainers"   ? "contents" : "none" }}><TrainersPanel /></div>
            <div style={{ display: activeSection === "encounters" ? "contents" : "none" }}><EncountersPanel /></div>
            <div style={{ display: activeSection === "world"      ? "contents" : "none" }}><WorldPanel /></div>
            <div style={{ display: activeSection === "settings"   ? "contents" : "none" }}><SettingsPanel /></div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pbs-entity-bottom-bar">
          <button
            className="pbs-btn pbs-btn-primary"
            onClick={async () => { await handleApply(); onClose(); }}
            disabled={saving}
          >
            OK
          </button>
          <button
            className="pbs-btn"
            onClick={() => { handleCancel(); onClose(); }}
          >
            Cancel
          </button>
          <button
            className="pbs-btn pbs-btn-primary"
            onClick={handleApply}
            disabled={!hasDirty || saving}
          >
            {saving ? "Saving..." : "Apply"}
          </button>
        </div>
      </div>
    </PbsEntityContext.Provider>
  );
}
