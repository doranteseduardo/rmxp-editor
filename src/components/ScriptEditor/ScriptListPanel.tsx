import { useCallback, useRef, useState } from "react";
import type { ScriptEntry } from "../../types";

interface Props {
  scripts: ScriptEntry[];
  selectedId: number | null;
  dirtyIds: Set<number>;
  onSelect: (id: number) => void;
  onCreate: (afterId: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, newTitle: string) => void;
}

export function ScriptListPanel({
  scripts,
  selectedId,
  dirtyIds,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    scriptId: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, scriptId: number) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, scriptId });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleStartRename = useCallback(
    (id: number) => {
      const script = scripts.find((s) => s.id === id);
      if (script) {
        setRenamingId(id);
        setRenameValue(script.title);
        setContextMenu(null);
        setTimeout(() => renameRef.current?.select(), 0);
      }
    },
    [scripts]
  );

  const handleFinishRename = useCallback(() => {
    if (renamingId !== null && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue, onRename]);

  const lastScriptId = scripts.length > 0 ? scripts[scripts.length - 1].id : 0;

  return (
    <div className="script-list-panel" onClick={closeContextMenu}>
      <div className="script-list-header">
        <span>Scripts</span>
        <button
          className="script-list-add-btn"
          title="New script"
          onClick={() => onCreate(selectedId ?? lastScriptId)}
        >
          +
        </button>
      </div>
      <div className="script-list-items">
        {scripts.map((script) => (
          <div
            key={script.id}
            className={`script-list-item${script.id === selectedId ? " selected" : ""}`}
            onClick={() => onSelect(script.id)}
            onContextMenu={(e) => handleContextMenu(e, script.id)}
            onDoubleClick={() => handleStartRename(script.id)}
          >
            {renamingId === script.id ? (
              <input
                ref={renameRef}
                className="script-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFinishRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
              />
            ) : (
              <>
                {dirtyIds.has(script.id) && (
                  <span className="script-dirty-dot" title="Unsaved changes" />
                )}
                <span className="script-list-title">{script.title}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="script-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              handleStartRename(contextMenu.scriptId);
            }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              onCreate(contextMenu.scriptId);
              closeContextMenu();
            }}
          >
            Insert Below
          </button>
          <hr />
          <button
            className="danger"
            onClick={() => {
              onDelete(contextMenu.scriptId);
              closeContextMenu();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
