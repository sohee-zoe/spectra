import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  MarkerType,
  Position,
  useNodesState,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { RequirementItem, RequirementLink } from '../domain/types';
import { getLabel } from '../domain/projectHelpers';
import { getStatusLabel, getItemAttributeChips, getItemTagChips, chipClassName } from './reviewPresentation';
import { MarkdownView } from './MarkdownView';

type Props = {
  items: RequirementItem[];
  links: RequirementLink[];
  selectedId: string | null;
  connectedIds: Set<string>;
  onSelect: (id: string | null) => void;
};

const COL_X: Record<string, number> = { UR: 75, SR: 600, FEATURE: 1125 };

function nodeLabel(item: RequirementItem, links: RequirementLink[]) {
  const attrChips = getItemAttributeChips(item, [], links);
  const tagChips = getItemTagChips(item);
  const status = getStatusLabel(item, []);
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span className="item-label">{getLabel(item)}</span>
        <span className={`item-status ${status === 'needs review' ? 'warning' : ''}`}>{status}</span>
      </div>
      {item.name && (
        <div style={{ marginTop: 3, fontWeight: 600, fontSize: '12px', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.3 }}>
          {item.name}
        </div>
      )}
      <div style={{ marginTop: 5, fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
        <MarkdownView content={item.content} />
      </div>
      {(attrChips.length > 0 || tagChips.length > 0) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {attrChips.map(chip => <span key={chip.label} className={chipClassName(chip)}>{chip.label}</span>)}
          {tagChips.map(chip => <span key={chip.label} className={chipClassName(chip)}>{chip.label}</span>)}
        </div>
      )}
    </div>
  );
}

function nodeStyle(id: string, selectedId: string | null, connectedIds: Set<string>) {
  const isSelected = selectedId === id;
  const isLinked = connectedIds.has(id);
  const isDimmed = selectedId !== null && !isSelected && !isLinked;
  return {
    background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)',
    color: 'var(--text)',
    border: `1px solid ${isSelected ? 'var(--accent)' : isLinked ? 'var(--link-color)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    width: 360,
    opacity: isDimmed ? 0.45 : 1,
    boxShadow: isSelected
      ? '0 0 0 1px var(--accent), 0 4px 8px -2px rgba(0,0,0,0.1)'
      : isLinked
      ? '0 0 0 1px var(--link-color), 0 4px 8px -2px rgba(0,0,0,0.1)'
      : '0 4px 8px -2px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
  };
}

export function GraphView({ items, links, selectedId, connectedIds, onSelect }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const layoutDone = useRef(false);

  // Reset layout when structural data changes
  useEffect(() => {
    const byType: Record<string, RequirementItem[]> = { UR: [], SR: [], FEATURE: [] };
    items.forEach(i => byType[i.type]?.push(i));

    const initial: Node[] = Object.entries(byType).flatMap(([type, list]) =>
      list.map((item, idx) => ({
        id: item.id,
        position: { x: COL_X[type], y: 75 + idx * 240 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: nodeLabel(item, links),
          itemType: type,
        },
        style: nodeStyle(item.id, null, new Set()),
      }))
    );

    layoutDone.current = false;
    setNodes(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, links]);

  // Apply selection styles without resetting layout
  useEffect(() => {
    setNodes(prev =>
      prev.map(n => ({ ...n, style: nodeStyle(n.id, selectedId, connectedIds) }))
    );
  }, [selectedId, connectedIds, setNodes]);

  // After ReactFlow measures node heights, recompute Y positions
  const handleNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    onNodesChange(changes);
    if (layoutDone.current) return;

    const dimChanges = changes.filter(
      (c): c is NodeChange<Node> & { type: 'dimensions'; dimensions: { width: number; height: number } } =>
        c.type === 'dimensions' && !!(c as any).dimensions
    );
    if (dimChanges.length === 0) return;

    setNodes(prev => {
      const withDims = prev.map(n => {
        const change = dimChanges.find(c => c.id === n.id) as any;
        return change?.dimensions ? { ...n, measured: { ...n.measured, ...change.dimensions } } : n;
      });

      if (!withDims.every(n => (n as any).measured?.height)) return withDims;

      layoutDone.current = true;

      const byType: Record<string, typeof withDims> = { UR: [], SR: [], FEATURE: [] };
      withDims.forEach(n => {
        const t = (n.data as any).itemType as string;
        byType[t]?.push(n);
      });

      return Object.entries(byType).flatMap(([type, col]) => {
        let y = 75;
        return col
          .sort((a, b) => a.position.y - b.position.y)
          .map(n => {
            const node = { ...n, position: { x: COL_X[type], y } };
            y += ((n as any).measured.height as number) + 24;
            return node;
          });
      });
    });
  }, [onNodesChange, setNodes]);

  const edges = useMemo<Edge[]>(() =>
    links.map(link => ({
      id: link.id,
      source: link.sourceId,
      target: link.targetId,
      animated: true,
      style: { stroke: 'var(--link-color)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--link-color)' },
    })),
  [links]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="var(--border)" gap={24} />
        <Controls style={{ fill: 'var(--text)' }} />
      </ReactFlow>
    </div>
  );
}
