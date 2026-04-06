/**
 * Generic entity editor hook.
 * Replaces usePbsFile.ts with a typed, entity-centric approach.
 * Modelled on useDatabase.ts — snapshot ref for cancel, useEditorRegistration for global save.
 */
import { useState, useEffect, useCallback, useRef } from "react";
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

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setDirty(false);

    load()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        snapshotRef.current = data;
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

  const selected = selectedId !== null
    ? items.find((item) => getId(item) === selectedId) ?? null
    : null;

  const select = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const update = useCallback((id: string, patch: Partial<T>) => {
    setItems((prev) =>
      prev.map((item) => getId(item) === id ? { ...item, ...patch } : item)
    );
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
    try {
      setLoading(true);
      setError(null);
      await save(itemsRef.current);
      snapshotRef.current = itemsRef.current;
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
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
