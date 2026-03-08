/**
 * ProjectSaveContext — global coordination of save/cancel across all editors.
 *
 * Each editor (database tab, script editor, map editor) registers itself
 * with save/cancel callbacks. The context aggregates dirty state and
 * exposes saveAll / discardAll for the global toolbar.
 */
import { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface EditorCallbacks {
  save: () => Promise<void>;
  cancel: () => void;
}

interface EditorEntry extends EditorCallbacks {
  isDirty: boolean;
}

interface ProjectSaveContextType {
  /** Number of editors with unsaved changes */
  dirtyCount: number;
  /** Save all dirty editors */
  saveAll: () => Promise<void>;
  /** Discard all unsaved changes */
  discardAll: () => void;
  /** Register an editor (call from useEditorRegistration) */
  register: (id: string, entry: EditorEntry) => void;
  /** Unregister an editor */
  unregister: (id: string) => void;
  /** Update dirty state for an editor */
  updateDirty: (id: string, isDirty: boolean) => void;
}

const ProjectSaveContext = createContext<ProjectSaveContextType>({
  dirtyCount: 0,
  saveAll: async () => {},
  discardAll: () => {},
  register: () => {},
  unregister: () => {},
  updateDirty: () => {},
});

export function useProjectSave() {
  return useContext(ProjectSaveContext);
}

/**
 * Hook for editors to register themselves with the global save context.
 * Auto-registers on mount and unregisters on unmount.
 * Updates dirty state whenever it changes.
 */
export function useEditorRegistration(
  id: string,
  save: () => Promise<void>,
  cancel: () => void,
  isDirty: boolean
) {
  const ctx = useProjectSave();
  const saveRef = useRef(save);
  const cancelRef = useRef(cancel);
  saveRef.current = save;
  cancelRef.current = cancel;

  useEffect(() => {
    ctx.register(id, {
      save: () => saveRef.current(),
      cancel: () => cancelRef.current(),
      isDirty,
    });
    return () => ctx.unregister(id);
    // Only register/unregister on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    ctx.updateDirty(id, isDirty);
  }, [id, isDirty, ctx]);
}

export function ProjectSaveProvider({ children }: { children: ReactNode }) {
  const editorsRef = useRef(new Map<string, EditorEntry>());
  const [dirtyCount, setDirtyCount] = useState(0);

  const recalcDirty = useCallback(() => {
    let count = 0;
    editorsRef.current.forEach((e) => { if (e.isDirty) count++; });
    setDirtyCount(count);
  }, []);

  const register = useCallback((id: string, entry: EditorEntry) => {
    editorsRef.current.set(id, entry);
    recalcDirty();
  }, [recalcDirty]);

  const unregister = useCallback((id: string) => {
    editorsRef.current.delete(id);
    recalcDirty();
  }, [recalcDirty]);

  const updateDirty = useCallback((id: string, isDirty: boolean) => {
    const entry = editorsRef.current.get(id);
    if (entry) {
      entry.isDirty = isDirty;
      recalcDirty();
    }
  }, [recalcDirty]);

  const saveAll = useCallback(async () => {
    const promises: Promise<void>[] = [];
    editorsRef.current.forEach((entry) => {
      if (entry.isDirty) promises.push(entry.save());
    });
    await Promise.all(promises);
    recalcDirty();
  }, [recalcDirty]);

  const discardAll = useCallback(() => {
    editorsRef.current.forEach((entry) => {
      if (entry.isDirty) entry.cancel();
    });
    recalcDirty();
  }, [recalcDirty]);

  return (
    <ProjectSaveContext.Provider value={{ dirtyCount, saveAll, discardAll, register, unregister, updateDirty }}>
      {children}
    </ProjectSaveContext.Provider>
  );
}
