import { useCallback, useMemo, useRef, useState } from "react";
import type { MapInfo, MapTreeNode } from "../../types";
import "./MapTreePanel.css";

interface Props {
  mapInfos: Record<number, MapInfo>;
  currentMapId: number | null;
  onSelectMap: (id: number) => void;
  onCreateMap: (parentId: number) => void;
  onDeleteMap: (id: number, name: string) => void;
  onRenameMap: (id: number, currentName: string) => void;
  onMapProperties: (id: number) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  mapId: number;
  mapName: string;
}

/**
 * Hierarchical map tree panel with context menu.
 */
export function MapTreePanel({
  mapInfos,
  currentMapId,
  onSelectMap,
  onCreateMap,
  onDeleteMap,
  onRenameMap,
  onMapProperties,
}: Props) {
  const tree = useMemo(() => buildTree(mapInfos), [mapInfos]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, mapId: number, mapName: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, mapId, mapName });
    },
    []
  );

  const closeMenu = useCallback(() => setContextMenu(null), []);

  const handleMenuAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;
      closeMenu();
      switch (action) {
        case "open":
          onSelectMap(contextMenu.mapId);
          break;
        case "properties":
          onMapProperties(contextMenu.mapId);
          break;
        case "create":
          onCreateMap(contextMenu.mapId);
          break;
        case "rename":
          onRenameMap(contextMenu.mapId, contextMenu.mapName);
          break;
        case "delete":
          onDeleteMap(contextMenu.mapId, contextMenu.mapName);
          break;
      }
    },
    [contextMenu, closeMenu, onSelectMap, onCreateMap, onDeleteMap, onRenameMap, onMapProperties]
  );

  return (
    <div className="map-tree-panel" onClick={closeMenu}>
      <div className="map-tree-header">
        <span>Maps</span>
        <button
          className="map-tree-add-btn"
          title="Create new map"
          onClick={(e) => {
            e.stopPropagation();
            onCreateMap(0);
          }}
        >
          +
        </button>
      </div>
      <div className="map-tree-list">
        {tree.map((node) => (
          <MapTreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            currentMapId={currentMapId}
            onSelectMap={onSelectMap}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="map-tree-context-overlay"
          onClick={closeMenu}
          onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
        >
          <div
            ref={menuRef}
            className="map-tree-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => handleMenuAction("open")}>Open Map</button>
            <button onClick={() => handleMenuAction("properties")}>Properties...</button>
            <div className="map-tree-context-separator" />
            <button onClick={() => handleMenuAction("create")}>New Child Map...</button>
            <button onClick={() => handleMenuAction("rename")}>Rename...</button>
            <div className="map-tree-context-separator" />
            <button className="map-tree-context-danger" onClick={() => handleMenuAction("delete")}>
              Delete Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MapTreeNodeItem({
  node,
  depth,
  currentMapId,
  onSelectMap,
  onContextMenu,
}: {
  node: MapTreeNode;
  depth: number;
  currentMapId: number | null;
  onSelectMap: (id: number) => void;
  onContextMenu: (e: React.MouseEvent, id: number, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(node.expanded);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === currentMapId;

  return (
    <div className="map-tree-node">
      <div
        className={`map-tree-item ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectMap(node.id)}
        onContextMenu={(e) => onContextMenu(e, node.id, node.name)}
        onDoubleClick={() => onSelectMap(node.id)}
      >
        {hasChildren && (
          <span
            className="map-tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "▾" : "▸"}
          </span>
        )}
        {!hasChildren && <span className="map-tree-toggle-spacer" />}
        <span className="map-tree-icon">🗺</span>
        <span className="map-tree-name">
          [{String(node.id).padStart(3, "0")}] {node.name}
        </span>
      </div>
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <MapTreeNodeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            currentMapId={currentMapId}
            onSelectMap={onSelectMap}
            onContextMenu={onContextMenu}
          />
        ))}
    </div>
  );
}

/**
 * Build a tree structure from flat MapInfos.
 */
function buildTree(mapInfos: Record<number, MapInfo>): MapTreeNode[] {
  const nodes: Map<number, MapTreeNode> = new Map();

  // Create nodes
  for (const [idStr, info] of Object.entries(mapInfos)) {
    const id = Number(idStr);
    nodes.set(id, {
      id,
      name: info.name,
      parent_id: info.parent_id,
      order: info.order,
      expanded: info.expanded,
      children: [],
    });
  }

  // Build tree
  const roots: MapTreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id === 0) {
      roots.push(node);
    } else {
      const parent = nodes.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  // Sort by order
  const sortNodes = (nodes: MapTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}
