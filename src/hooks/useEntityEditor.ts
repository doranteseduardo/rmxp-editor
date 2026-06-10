/**
 * Generic entity editor hook.
 * Replaces usePbsFile.ts with a typed, entity-centric approach.
 * Modelled on useDatabase.ts — snapshot ref for cancel, useEditorRegistration for global save.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useEditorRegistration } from "../context/ProjectSaveContext";

export interface UseEntityEditorResult<T> {
  items: T[];
  selectedId: string | null;
  selected: T | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  update: (id: string, patch: Partial<T>) => void;
  add: (item: T) => void;
  remove: (id: string) => void;
  doSave: () => Promise<void>;
  doCancel: () => void;
}

/**
 * @param registrationId  e.g. "pbs-pokemon" — registered with ProjectSaveContext
 * @param getId           extract the entity's unique string key
 * @param load            async function that returns the full entity array
 * @param save            async function that persists the full entity array
 */
export function useEntityEditor<T>(
  registrationId: string,
  getId: (item: T) => string,
  load: () => Promise<T[]>,
  save: (items: T[]) => Promise<void>
): UseEntityEditorResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshotRef = useRef<T[]>([]);
  const itemsRef = useRef<T[]>([]);
  itemsRef.current = items;
  // True only after a successful load. Guards doSave so a failed load can never
  // persist an empty array over the real file.
  const loadedRef = useRef(false);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setDirty(false);
    loadedRef.current = false;

    load()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        snapshotRef.current = data;
        loadedRef.current = true;
        if (data.length > 0) setSelectedId(getId(data[0]));
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // load/getId/save are stable references passed from the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId]);

  const selected = useMemo(
    () => selectedId !== null
      ? items.find((item) => getId(item) === selectedId) ?? null
      : null,
    [items, selectedId, getId]
  );

  const select = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const update = useCallback((id: string, patch: Partial<T>) => {
    // If the patch renames the entity's key, the selection (which tracks the old
    // id) would otherwise point at nothing and the detail panel would vanish.
    const current = itemsRef.current.find((item) => getId(item) === id);
    const newId = current ? getId({ ...current, ...patch }) : null;
    setItems((prev) =>
      prev.map((item) => getId(item) === id ? { ...item, ...patch } : item)
    );
    if (newId !== null && newId !== id) {
      setSelectedId((cur) => (cur === id ? newId : cur));
    }
    setDirty(true);
  }, [getId]);

  const add = useCallback((item: T) => {
    setItems((prev) => [...prev, item]);
    setSelectedId(getId(item));
    setDirty(true);
  }, [getId]);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const filtered = prev.filter((item) => getId(item) !== id);
      return filtered;
    });
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      const remaining = itemsRef.current.filter((item) => getId(item) !== id);
      return remaining.length > 0 ? getId(remaining[0]) : null;
    });
    setDirty(true);
  }, [getId]);

  const doSave = useCallback(async () => {
    if (!loadedRef.current) {
      const msg = "Cannot save: the data failed to load. Resolve the load error first to avoid overwriting the file with empty data.";
      setError(msg);
      throw new Error(msg);
    }
    try {
      setLoading(true);
      setError(null);
      await save(itemsRef.current);
      snapshotRef.current = itemsRef.current;
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [save]);

  const doCancel = useCallback(() => {
    setItems(snapshotRef.current);
    setDirty(false);
  }, []);

  useEditorRegistration(registrationId, doSave, doCancel, dirty);

  return {
    items, selectedId, selected, dirty, loading, error,
    select, update, add, remove, doSave, doCancel,
  };
}
