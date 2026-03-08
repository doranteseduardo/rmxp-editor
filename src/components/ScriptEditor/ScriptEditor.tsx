import { useCallback, useEffect, useRef, useState } from "react";
import type { ScriptEntry, ScriptData } from "../../types";
import {
  loadScriptList,
  loadScriptSource,
  saveAllScripts,
  createScript,
  deleteScript,
} from "../../services/tauriApi";
import { ScriptListPanel } from "./ScriptListPanel";
import { CodeEditorPanel } from "./CodeEditorPanel";
import "./ScriptEditor.css";

interface Props {
  projectPath: string;
}

export function ScriptEditor({ projectPath }: Props) {
  const [scripts, setScripts] = useState<ScriptEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentSource, setCurrentSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cache: scriptId → source (both loaded originals and edits)
  const cacheRef = useRef<Map<number, string>>(new Map());
  // Track which scripts have been modified
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  // Track original sources for dirty detection
  const originalsRef = useRef<Map<number, string>>(new Map());

  // Load script list on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadScriptList(projectPath)
      .then((list) => {
        if (!cancelled) {
          setScripts(list);
          setLoading(false);
          cacheRef.current.clear();
          originalsRef.current.clear();
          setDirtyIds(new Set());
          setSelectedId(null);
          setCurrentSource(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Select a script: load from cache or backend
  const handleSelect = useCallback(
    async (id: number) => {
      // Save current editor state to cache before switching
      if (selectedId !== null && currentSource !== null) {
        cacheRef.current.set(selectedId, currentSource);
      }

      setSelectedId(id);

      // Check cache first
      const cached = cacheRef.current.get(id);
      if (cached !== undefined) {
        setCurrentSource(cached);
        return;
      }

      // Load from backend
      setLoadingSource(true);
      try {
        const source = await loadScriptSource(projectPath, id);
        cacheRef.current.set(id, source);
        originalsRef.current.set(id, source);
        setCurrentSource(source);
      } catch (err) {
        setCurrentSource(`# Error loading script: ${err}`);
      } finally {
        setLoadingSource(false);
      }
    },
    [projectPath, selectedId, currentSource]
  );

  // Handle source changes from the editor
  const handleSourceChange = useCallback(
    (newSource: string) => {
      setCurrentSource(newSource);
      if (selectedId !== null) {
        cacheRef.current.set(selectedId, newSource);
        // Check if actually dirty
        const original = originalsRef.current.get(selectedId);
        setDirtyIds((prev) => {
          const next = new Set(prev);
          if (original !== undefined && newSource === original) {
            next.delete(selectedId);
          } else {
            next.add(selectedId);
          }
          return next;
        });
      }
    },
    [selectedId]
  );

  // Save all dirty scripts
  const handleSave = useCallback(async () => {
    // Update cache with latest editor content
    if (selectedId !== null && currentSource !== null) {
      cacheRef.current.set(selectedId, currentSource);
    }

    if (dirtyIds.size === 0) return;

    setSaving(true);
    try {
      // Build the full script list with sources
      const allScripts: ScriptData[] = [];
      for (const script of scripts) {
        const source = cacheRef.current.get(script.id);
        if (source !== undefined) {
          allScripts.push({ id: script.id, title: script.title, source });
        } else {
          // Load from backend if we haven't cached this one
          const s = await loadScriptSource(projectPath, script.id);
          allScripts.push({ id: script.id, title: script.title, source: s });
        }
      }

      await saveAllScripts(projectPath, allScripts);

      // Update originals and clear dirty state
      for (const script of allScripts) {
        originalsRef.current.set(script.id, script.source);
      }
      setDirtyIds(new Set());
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setSaving(false);
    }
  }, [projectPath, scripts, selectedId, currentSource, dirtyIds]);

  // Create a new script
  const handleCreate = useCallback(
    async (afterId: number) => {
      try {
        const updated = await createScript(projectPath, "New Script", afterId);
        setScripts(updated);
      } catch (err) {
        setError(`Create failed: ${err}`);
      }
    },
    [projectPath]
  );

  // Delete a script
  const handleDelete = useCallback(
    async (id: number) => {
      const script = scripts.find((s) => s.id === id);
      const title = script?.title ?? `#${id}`;
      if (!window.confirm(`Delete script "${title}"?`)) return;
      try {
        const updated = await deleteScript(projectPath, id);
        setScripts(updated);
        cacheRef.current.delete(id);
        originalsRef.current.delete(id);
        setDirtyIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (selectedId === id) {
          setSelectedId(null);
          setCurrentSource(null);
        }
      } catch (err) {
        setError(`Delete failed: ${err}`);
      }
    },
    [projectPath, scripts, selectedId]
  );

  // Rename a script (local only — saved with next save_all)
  const handleRename = useCallback(
    (id: number, newTitle: string) => {
      setScripts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
      );
      // Mark dirty so it gets saved
      setDirtyIds((prev) => new Set(prev).add(id));
    },
    []
  );

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  if (loading) {
    return (
      <div className="script-editor">
        <div className="script-editor-message">Loading scripts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="script-editor">
        <div className="script-editor-message error">{error}</div>
      </div>
    );
  }

  return (
    <div className="script-editor">
      <ScriptListPanel
        scripts={scripts}
        selectedId={selectedId}
        dirtyIds={dirtyIds}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onRename={handleRename}
      />
      <CodeEditorPanel
        source={currentSource}
        loading={loadingSource}
        onSourceChange={handleSourceChange}
      />
      {saving && <div className="script-saving-indicator">Saving...</div>}
    </div>
  );
}
