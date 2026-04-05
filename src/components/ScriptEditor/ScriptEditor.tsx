import { useCallback, useEffect, useRef, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import type { ScriptEntry, ScriptData } from "../../types";
import {
  loadScriptList,
  loadScriptSource,
  saveAllScripts,
  createScript,
  deleteScript,
} from "../../services/tauriApi";
import { useEditorRegistration } from "../../context/ProjectSaveContext";
import { ScriptListPanel } from "./ScriptListPanel";
import { CodeEditorPanel, type JumpTarget } from "./CodeEditorPanel";
import { GlobalSearchPanel, type SearchResult } from "./GlobalSearchPanel";
import "./ScriptEditor.css";

interface Props {
  projectPath: string;
  onClose?: () => void;
}

export function ScriptEditor({ projectPath, onClose }: Props) {
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

  // ── Global search state ────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchIdRef = useRef(0); // incremented to cancel in-flight searches

  // Jump target for CodeEditorPanel after search navigation
  const [jumpTo, setJumpTo] = useState<JumpTarget | null>(null);
  const jumpKeyRef = useRef(0);

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

  // Cancel all unsaved changes — restore dirty scripts from originals
  const handleCancel = useCallback(() => {
    for (const id of dirtyIds) {
      const original = originalsRef.current.get(id);
      if (original !== undefined) {
        cacheRef.current.set(id, original);
        // If this is the currently viewed script, update the editor
        if (id === selectedId) {
          setCurrentSource(original);
        }
      }
    }
    setDirtyIds(new Set());
  }, [dirtyIds, selectedId]);

  const isDirty = dirtyIds.size > 0;
  useEditorRegistration("scripts", handleSave, handleCancel, isDirty);

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
      if (!(await confirm(`Delete script "${title}"?`))) return;
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

  // ── Global search logic ────────────────────────────────────────

  /** Search all script sources for query (case-insensitive). Cancellable. */
  const runSearch = useCallback(async (query: string) => {
    const id = ++searchIdRef.current;
    setSearching(true);

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const script of scripts) {
      if (searchIdRef.current !== id) return; // cancelled by newer search

      let source = cacheRef.current.get(script.id);
      if (source === undefined) {
        try {
          source = await loadScriptSource(projectPath, script.id);
          if (searchIdRef.current !== id) return;
          cacheRef.current.set(script.id, source);
          originalsRef.current.set(script.id, source);
        } catch {
          continue;
        }
      }

      const lines = source.split("\n");
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const lower = line.toLowerCase();
        let idx = 0;
        while ((idx = lower.indexOf(lowerQuery, idx)) !== -1) {
          results.push({
            scriptId: script.id,
            scriptTitle: script.title,
            line: lineIdx + 1,
            ch: idx,
            lineContent: line,
            matchLength: lowerQuery.length,
          });
          idx += lowerQuery.length;
          if (results.length >= 1000) break;
        }
        if (results.length >= 1000) break;
      }
      if (results.length >= 1000) break;
    }

    if (searchIdRef.current === id) {
      setSearchResults(results);
      setSearching(false);
    }
  }, [projectPath, scripts]);

  /** Debounce: run search 300 ms after the user stops typing. */
  useEffect(() => {
    if (!searchActive) return;
    if (!searchQuery.trim()) {
      ++searchIdRef.current; // cancel any in-flight search
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(() => runSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchActive, runSearch]);

  /** Navigate to a search result: select the script then jump to the line. */
  const handleNavigate = useCallback(async (
    scriptId: number,
    line: number,
    ch: number,
    matchLength: number,
  ) => {
    setSearchActive(false);
    await handleSelect(scriptId);
    setJumpTo({ line, ch, length: matchLength, key: ++jumpKeyRef.current });
  }, [handleSelect]);

  // ── Keyboard shortcuts ─────────────────────────────────────────

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

  // Ctrl+Shift+F: open global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchActive(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
    <div className="script-editor-wrapper">
      <div className="script-editor">
        {searchActive ? (
          <GlobalSearchPanel
            query={searchQuery}
            results={searchResults}
            searching={searching}
            onQueryChange={setSearchQuery}
            onClose={() => setSearchActive(false)}
            onNavigate={handleNavigate}
          />
        ) : (
          <ScriptListPanel
            scripts={scripts}
            selectedId={selectedId}
            dirtyIds={dirtyIds}
            onSelect={handleSelect}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onRename={handleRename}
            onSearchOpen={() => setSearchActive(true)}
          />
        )}
        <CodeEditorPanel
          source={currentSource}
          loading={loadingSource}
          onSourceChange={handleSourceChange}
          jumpTo={jumpTo}
        />
        {saving && <div className="script-saving-indicator">Saving...</div>}
      </div>
      {/* Unified OK / Cancel / Apply bar */}
      <div className="db-bottom-bar">
        <button className="db-save-btn" onClick={async () => { await handleSave(); onClose?.(); }} disabled={saving}>
          OK
        </button>
        <button className="db-cancel-btn" onClick={() => { handleCancel(); onClose?.(); }}>
          Cancel
        </button>
        <button className="db-save-btn" onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? "Saving..." : "Apply"}
        </button>
      </div>
    </div>
  );
}
