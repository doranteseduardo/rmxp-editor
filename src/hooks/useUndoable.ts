import { useCallback, useRef, useState } from "react";

/**
 * Hook that wraps a state value with undo/redo history.
 * Tracks changes as snapshots (deep-cloned JSON).
 *
 * @param initialValue The initial state value
 * @param maxHistory Max number of undo steps to keep (default 50)
 */
export function useUndoable<T>(initialValue: T | null, maxHistory = 50) {
  const [value, setValue] = useState<T | null>(initialValue);
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const skipRecordRef = useRef(false);

  /**
   * Set a new value and push current state to undo history.
   * Use this instead of direct setState for undoable changes.
   */
  const set = useCallback(
    (newValueOrUpdater: T | null | ((prev: T | null) => T | null)) => {
      setValue((prev) => {
        const next =
          typeof newValueOrUpdater === "function"
            ? (newValueOrUpdater as (prev: T | null) => T | null)(prev)
            : newValueOrUpdater;

        if (!skipRecordRef.current && prev !== null) {
          historyRef.current.push(JSON.stringify(prev));
          if (historyRef.current.length > maxHistory) {
            historyRef.current.shift();
          }
          futureRef.current = []; // Clear redo on new edit
        }
        skipRecordRef.current = false;

        return next;
      });
    },
    [maxHistory]
  );

  /**
   * Set value WITHOUT recording to undo history.
   * Use for initial loads, saves, or non-user-initiated changes.
   */
  const setWithoutHistory = useCallback((newValue: T | null) => {
    skipRecordRef.current = true;
    setValue(newValue);
    // Don't clear history/future on load
  }, []);

  /** Reset history (call when loading a new entity) */
  const resetHistory = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
  }, []);

  const undo = useCallback(() => {
    setValue((prev) => {
      if (historyRef.current.length === 0 || prev === null) return prev;
      futureRef.current.push(JSON.stringify(prev));
      const restored = historyRef.current.pop()!;
      return JSON.parse(restored) as T;
    });
  }, []);

  const redo = useCallback(() => {
    setValue((prev) => {
      if (futureRef.current.length === 0 || prev === null) return prev;
      historyRef.current.push(JSON.stringify(prev));
      const restored = futureRef.current.pop()!;
      return JSON.parse(restored) as T;
    });
  }, []);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return { value, set, setWithoutHistory, resetHistory, undo, redo, canUndo, canRedo };
}
