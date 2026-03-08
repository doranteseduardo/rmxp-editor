/**
 * Database Editor — the main shell with 13 tab navigation.
 *
 * Matches the official RMXP database editor layout:
 * Actors, Classes, Skills, Items, Weapons, Armors, Enemies, Troops,
 * States, Animations, Tilesets, Common Events, System.
 *
 * All tabs are always mounted (hidden via CSS) so that switching tabs
 * preserves in-memory edits. A unified Apply/Cancel bar at the bottom
 * saves or reverts all database tabs at once, matching the original
 * RMXP editor's window-level save behavior.
 */
import { useState, useCallback } from "react";
import { DatabaseNamesProvider } from "./DatabaseContext";
import { useProjectSave } from "../../context/ProjectSaveContext";
import { ActorsTab } from "./tabs/ActorsTab";
import { ClassesTab } from "./tabs/ClassesTab";
import { SkillsTab } from "./tabs/SkillsTab";
import { ItemsTab } from "./tabs/ItemsTab";
import { WeaponsTab } from "./tabs/WeaponsTab";
import { ArmorsTab } from "./tabs/ArmorsTab";
import { EnemiesTab } from "./tabs/EnemiesTab";
import { TroopsTab } from "./tabs/TroopsTab";
import { StatesTab } from "./tabs/StatesTab";
import { AnimationsTab } from "./tabs/AnimationsTab";
import { TilesetsTab } from "./tabs/TilesetsTab";
import { CommonEventsTab } from "./tabs/CommonEventsTab";
import { SystemTab } from "./tabs/SystemTab";
import "./DatabaseEditor.css";

/** Map tab label → the editor registration ID used by useEditorRegistration */
const TAB_EDITOR_IDS: Record<string, string> = {
  "Actors":        "db-Actors.rxdata",
  "Classes":       "db-Classes.rxdata",
  "Skills":        "db-Skills.rxdata",
  "Items":         "db-Items.rxdata",
  "Weapons":       "db-Weapons.rxdata",
  "Armors":        "db-Armors.rxdata",
  "Enemies":       "db-Enemies.rxdata",
  "Troops":        "db-Troops.rxdata",
  "States":        "db-States.rxdata",
  "Animations":    "db-Animations.rxdata",
  "Tilesets":      "db-Tilesets.rxdata",
  "Common Events": "db-CommonEvents.rxdata",
  "System":        "db-System",
};

const TABS = [
  "Actors", "Classes", "Skills", "Items", "Weapons", "Armors",
  "Enemies", "Troops", "States", "Animations", "Tilesets",
  "Common Events", "System",
] as const;

type TabName = (typeof TABS)[number];

interface Props {
  projectPath: string;
  onClose?: () => void;
}

export function DatabaseEditor({ projectPath, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabName>("Actors");
  const { dirtyIds, saveAll, discardAll } = useProjectSave();
  const [saving, setSaving] = useState(false);

  // Check if any database editor is dirty
  const hasAnyDirty = Array.from(dirtyIds).some(id => id.startsWith("db-"));

  const handleApply = useCallback(async () => {
    setSaving(true);
    try {
      await saveAll("db-");
    } finally {
      setSaving(false);
    }
  }, [saveAll]);

  const handleCancel = useCallback(() => {
    discardAll("db-");
  }, [discardAll]);

  return (
    <DatabaseNamesProvider projectPath={projectPath}>
      <div className="db-editor">
        <div className="db-tabs">
          {TABS.map((tab) => {
            const editorId = TAB_EDITOR_IDS[tab];
            const isDirty = editorId ? dirtyIds.has(editorId) : false;
            return (
              <button
                key={tab}
                className={`db-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {isDirty && <span className="db-tab-dirty">●</span>}
              </button>
            );
          })}
        </div>

        {/* All tabs always mounted, hidden via CSS to preserve state */}
        <div style={{ display: activeTab === "Actors" ? "contents" : "none" }}><ActorsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Classes" ? "contents" : "none" }}><ClassesTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Skills" ? "contents" : "none" }}><SkillsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Items" ? "contents" : "none" }}><ItemsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Weapons" ? "contents" : "none" }}><WeaponsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Armors" ? "contents" : "none" }}><ArmorsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Enemies" ? "contents" : "none" }}><EnemiesTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Troops" ? "contents" : "none" }}><TroopsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "States" ? "contents" : "none" }}><StatesTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Animations" ? "contents" : "none" }}><AnimationsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Tilesets" ? "contents" : "none" }}><TilesetsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "Common Events" ? "contents" : "none" }}><CommonEventsTab projectPath={projectPath} /></div>
        <div style={{ display: activeTab === "System" ? "contents" : "none" }}><SystemTab projectPath={projectPath} /></div>

        {/* Unified OK / Cancel / Apply bar */}
        <div className="db-bottom-bar">
          <button className="db-save-btn" onClick={async () => { await handleApply(); onClose?.(); }} disabled={saving}>
            OK
          </button>
          <button className="db-cancel-btn" onClick={() => { handleCancel(); onClose?.(); }}>
            Cancel
          </button>
          <button className="db-save-btn" onClick={handleApply} disabled={!hasAnyDirty || saving}>
            {saving ? "Saving..." : "Apply"}
          </button>
        </div>
      </div>
    </DatabaseNamesProvider>
  );
}
