interface ContextMenuState {
  x: number; // screen x
  y: number; // screen y
  tileX: number; // tile col
  tileY: number; // tile row
  event: { id: number; name: string } | null;
}

interface MapContextMenuProps {
  contextMenu: ContextMenuState;
  setContextMenu: (value: ContextMenuState | null) => void;
  hasClipboardEvent?: boolean;
  onOpenEvent?: (eventId: number, eventName: string) => void;
  onCopyEvent?: (eventId: number) => Promise<void>;
  onDeleteEvent?: (eventId: number, eventName: string) => void;
  onPasteEvent?: (x: number, y: number) => Promise<void>;
  onSetStartPosition?: (x: number, y: number) => Promise<void>;
}

export function MapContextMenu({
  contextMenu,
  setContextMenu,
  hasClipboardEvent,
  onOpenEvent,
  onCopyEvent,
  onDeleteEvent,
  onPasteEvent,
  onSetStartPosition,
}: MapContextMenuProps) {
  return (
    <div
      className="map-tree-context-overlay"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
    >
      <div
        className="map-tree-context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu.event && (
          <>
            <button
              onClick={() => {
                if (onOpenEvent) onOpenEvent(contextMenu.event!.id, contextMenu.event!.name);
                setContextMenu(null);
              }}
            >
              Open Event
            </button>
            <button
              onClick={async () => {
                if (onCopyEvent) await onCopyEvent(contextMenu.event!.id);
                setContextMenu(null);
              }}
            >
              Copy Event
            </button>
            <div className="map-tree-context-separator" />
            <button
              className="map-tree-context-danger"
              onClick={() => {
                if (onDeleteEvent) onDeleteEvent(contextMenu.event!.id, contextMenu.event!.name);
                setContextMenu(null);
              }}
            >
              Delete Event
            </button>
            <div className="map-tree-context-separator" />
          </>
        )}
        {!contextMenu.event && hasClipboardEvent && (
          <>
            <button
              onClick={async () => {
                if (onPasteEvent) await onPasteEvent(contextMenu.tileX, contextMenu.tileY);
                setContextMenu(null);
              }}
            >
              Paste Event
            </button>
            <div className="map-tree-context-separator" />
          </>
        )}
        <button
          onClick={async () => {
            if (onSetStartPosition) await onSetStartPosition(contextMenu.tileX, contextMenu.tileY);
            setContextMenu(null);
          }}
        >
          Set as Starting Point
        </button>
      </div>
    </div>
  );
}
