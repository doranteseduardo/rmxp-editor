/**
 * Shared hook for loading / saving / selecting items in a database .rxdata file.
 *
 * All 12 array-based database tabs (everything except System) use this hook.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type { DatabaseFilename, DatabaseFiles } from "../../types";
import { loadDatabase, saveDatabase } from "../../services/tauriApi";

export interface UseDatabaseResult<T> {
  items: (T | null)[];           // raw array (index 0 = null)
  selectedId: number | null;
  selected: T | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  select: (id: number) => void;
  /** Update a field on the currently selected item */
  update: (patch: Partial<T>) => void;
  /** Replace the entire selected item */
  replace: (item: T) => void;
  save: () => Promise<void>;
  /** Add a new entry at the end */
  addNew: (template: T) => void;
  /** Delete the selected entry (sets to null) */
  deleteSelected: () => void;
  /** Change the max count (resize array) */
  changeMaxEntries: (count: number) => void;
}

export function useDatabase<K extends DatabaseFilename>(
  projectPath: string,
  filename: K
): UseDatabaseResult<DatabaseFiles[K]> {
  type T = DatabaseFiles[K];

  const [items, setItems] = useState<(T | null)[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filenameRef = useRef(filename);

  // Load on mount or filename change
  useEffect(() => {
    filenameRef.current = filename;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setDirty(false);

    loadDatabase(projectPath, filename)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        // Auto-select first real item
        for (let i = 1; i < data.length; i++) {
          if (data[i] != null) {
            setSelectedId(i);
            break;
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [projectPath, filename]);

  const selected = selectedId != null ? items[selectedId] ?? null : null;

  const select = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const update = useCallback((patch: Partial<T>) => {
    setItems((prev) => {
      if (selectedId == null || prev[selectedId] == null) return prev;
      const copy = [...prev];
      copy[selectedId] = { ...copy[selectedId]!, ...patch };
      return copy;
    });
    setDirty(true);
  }, [selectedId]);

  const replace = useCallback((item: T) => {
    setItems((prev) => {
      if (selectedId == null) return prev;
      const copy = [...prev];
      copy[selectedId] = item;
      return copy;
    });
    setDirty(true);
  }, [selectedId]);

  const save = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await saveDatabase(projectPath, filenameRef.current, items);
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [projectPath, items]);

  const addNew = useCallback((template: T) => {
    setItems((prev) => {
      const newId = prev.length;
      const entry = { ...template, id: newId } as T;
      const copy = [...prev, entry];
      setSelectedId(newId);
      return copy;
    });
    setDirty(true);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedId == null) return;
    setItems((prev) => {
      const copy = [...prev];
      copy[selectedId] = null;
      return copy;
    });
    setDirty(true);
  }, [selectedId]);

  const changeMaxEntries = useCallback((count: number) => {
    setItems((prev) => {
      if (count + 1 <= prev.length) return prev.slice(0, count + 1);
      const copy = [...prev];
      while (copy.length < count + 1) copy.push(null);
      return copy;
    });
    setDirty(true);
  }, []);

  return {
    items, selectedId, selected, dirty, loading, error,
    select, update, replace, save, addNew, deleteSelected, changeMaxEntries,
  };
}
