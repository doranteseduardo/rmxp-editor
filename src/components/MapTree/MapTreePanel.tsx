import { useMemo, useState } from "react";
import type { MapInfo, MapTreeNode } from "../../types";
import "./MapTreePanel.css";

interface Props {
  mapInfos: Record<number, MapInfo>;
  currentMapId: number | null;
  onSelectMap: (id: number) => void;
}

/**
 * Hierarchical map tree panel.
 *
 * Builds a tree from the flat MapInfos hash using parent_id relationships.
 * Root nodes have parent_id === 0.
 */
export function MapTreePanel({ mapInfos, currentMapId, onSelectMap }: Props) {
  const tree = useMemo(() => buildTree(mapInfos), [mapInfos]);

  return (
    <div className="map-tree-panel">
      <div className="map-tree-header">Maps</div>
      <div className="map-tree-list">
        {tree.map((node) => (
          <MapTreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            currentMapId={currentMapId}
            onSelectMap={onSelectMap}
          />
        ))}
      </div>
    </div>
  );
}

function MapTreeNodeItem({
  node,
  depth,
  currentMapId,
  onSelectMap,
}: {
  node: MapTreeNode;
  depth: number;
  currentMapId: number | null;
  onSelectMap: (id: number) => void;
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
