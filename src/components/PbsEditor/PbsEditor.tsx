/**
 * PbsEditor — standalone modal window for editing Pokémon Essentials PBS files.
 *
 * Follows the same pattern as DatabaseEditor.tsx:
 * - All tabs always mounted, hidden via CSS to preserve state
 * - Unified Apply/Cancel/OK bottom bar operating on "pbs-" prefixed editors
 * - Each tab's usePbsFile hook registers itself with ProjectSaveContext
 */
import { useState, useEffect, useCallback } from "react";
import { listPbsFiles } from "../../services/tauriApi";
import { buildPbsIndex } from "../../services/pbsIndex";
import { useProjectSave } from "../../context/ProjectSaveContext";
import { PbsContext } from "./PbsContext";
import { PbsFileTab } from "./PbsFileTab";
import type { PbsIndex } from "../../services/pbsIndex";
import "./PbsEditor.css";

interface Props {
  projectPath: string;
  onClose: () => void;
}

/** Friendly tab label from filename */
function tabLabel(filename: string): string {
  const stem = filename.replace(/\.txt$/i, "");
  // Convert snake_case to Title Case
  return stem
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PbsEditor({ projectPath, onClose }: Props) {
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [pbsIndex, setPbsIndex] = useState<PbsIndex>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { dirtyIds, saveAll, discardAll } = useProjectSave();

  const hasDirty = Array.from(dirtyIds).some((id) => id.startsWith("pbs-"));

  // Load file list and build names index on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      listPbsFiles(projectPath),
      buildPbsIndex(projectPath),
    ]).then(([files, index]) => {
      if (cancelled) return;
      setTabs(files);
      setPbsIndex(index);
      if (files.length > 0) setActiveTab(files[0]);
    }).catch((err) => {
      console.error("[PbsEditor] Failed to load PBS files:", err);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
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
    <PbsContext.Provider value={{ pbsIndex, projectPath }}>
      <div className="pbs-editor">
        {/* Header */}
        <div className="pbs-header">
          <span className="pbs-title">PBS Data Editor</span>
          <button className="pbs-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tab bar */}
        <div className="pbs-tabs">
          {tabs.map((filename) => {
            const isDirty = dirtyIds.has(`pbs-${filename}`);
            return (
              <button
                key={filename}
                className={`pbs-tab${activeTab === filename ? " active" : ""}`}
                onClick={() => setActiveTab(filename)}
              >
                {tabLabel(filename)}
                {isDirty && <span className="pbs-tab-dirty">●</span>}
              </button>
            );
          })}
          {loading && <span className="pbs-loading">Loading...</span>}
          {!loading && tabs.length === 0 && (
            <span className="pbs-no-files">No PBS files found in this project</span>
          )}
        </div>

        {/* Tab content — always mounted, hidden via CSS */}
        <div className="pbs-body">
          {tabs.map((filename) => (
            <div
              key={filename}
              style={{ display: activeTab === filename ? "contents" : "none" }}
            >
              <PbsFileTab projectPath={projectPath} filename={filename} />
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pbs-bottom-bar">
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
    </PbsContext.Provider>
  );
}
