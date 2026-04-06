/**
 * Hook for loading / editing / saving a single PBS file.
 * Analogous to useDatabase.ts for .rxdata files.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import type { PbsSection } from "../../types/pbsTypes";
import { loadPbsFile, savePbsFile } from "../../services/tauriApi";
import { useEditorRegistration } from "../../context/ProjectSaveContext";

export interface UsePbsFileResult {
  sections: PbsSection[];
  selectedHeader: string | null;
  selected: PbsSection | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  select: (header: string) => void;
  updateField: (key: string, value: string) => void;
  addField: (key: string) => void;
  deleteField: (key: string) => void;
  addSection: (header: string) => void;
  deleteSection: (header: string) => void;
  save: () => Promise<void>;
  cancel: () => void;
}

export function usePbsFile(
  projectPath: string,
  filename: string
): UsePbsFileResult {
  const [sections, setSections] = useState<PbsSection[]>([]);
  const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshotRef = useRef<PbsSection[]>([]);
  const sectionsRef = useRef<PbsSection[]>([]);
  const filenameRef = useRef(filename);
  filenameRef.current = filename;
  sectionsRef.current = sections;

  // Load on mount / filename change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedHeader(null);
    setDirty(false);

    loadPbsFile(projectPath, filename)
      .then((data) => {
        if (cancelled) return;
        setSections(data);
        snapshotRef.current = data;
        if (data.length > 0) setSelectedHeader(data[0].header);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [projectPath, filename]);

  const selected = selectedHeader !== null
    ? sections.find((s) => s.header === selectedHeader) ?? null
    : null;

  const select = useCallback((header: string) => {
    setSelectedHeader(header);
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    setSections((prev) => {
      if (selectedHeader === null) return prev;
      return prev.map((s) => {
        if (s.header !== selectedHeader) return s;
        const fieldIdx = s.fields.findIndex((f) => f.key === key);
        if (fieldIdx === -1) return s;
        const newFields = [...s.fields];
        newFields[fieldIdx] = { key, value };
        return { ...s, fields: newFields };
      });
    });
    setDirty(true);
  }, [selectedHeader]);

  const addField = useCallback((key: string) => {
    setSections((prev) => {
      if (selectedHeader === null) return prev;
      return prev.map((s) => {
        if (s.header !== selectedHeader) return s;
        if (s.fields.some((f) => f.key === key)) return s; // no duplicates
        return { ...s, fields: [...s.fields, { key, value: "" }] };
      });
    });
    setDirty(true);
  }, [selectedHeader]);

  const deleteField = useCallback((key: string) => {
    setSections((prev) => {
      if (selectedHeader === null) return prev;
      return prev.map((s) => {
        if (s.header !== selectedHeader) return s;
        return { ...s, fields: s.fields.filter((f) => f.key !== key) };
      });
    });
    setDirty(true);
  }, [selectedHeader]);

  const addSection = useCallback((header: string) => {
    setSections((prev) => {
      if (prev.some((s) => s.header === header)) return prev; // no duplicates
      const newSection: PbsSection = { header, fields: [{ key: "Name", value: header }] };
      return [...prev, newSection];
    });
    setSelectedHeader(header);
    setDirty(true);
  }, []);

  const deleteSection = useCallback((header: string) => {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.header !== header);
      return filtered;
    });
    setSelectedHeader((prev) => {
      if (prev !== header) return prev;
      const remaining = sectionsRef.current.filter((s) => s.header !== header);
      return remaining.length > 0 ? remaining[0].header : null;
    });
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await savePbsFile(projectPath, filenameRef.current, sectionsRef.current);
      snapshotRef.current = sectionsRef.current;
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const cancel = useCallback(() => {
    setSections(snapshotRef.current);
    setDirty(false);
  }, []);

  // Register with global save context so Ctrl+S and PBS Apply work
  useEditorRegistration(`pbs-${filename}`, save, cancel, dirty);

  return {
    sections, selectedHeader, selected, dirty, loading, error,
    select, updateField, addField, deleteField, addSection, deleteSection,
    save, cancel,
  };
}
