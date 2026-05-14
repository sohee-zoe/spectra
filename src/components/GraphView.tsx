import { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  MarkerType,
  Position
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

export function GraphView({ items, links, selectedId, connectedIds, onSelect }: Props) {
  const nodes = useMemo(() => {
    const urs = items.filter(i => i.type === 'UR');
    const srs = items.filter(i => i.type === 'SR');
    const fts = items.filter(i => i.type === 'FEATURE');

    const createNodes = (list: RequirementItem[], xPos: number) => {
      return list.map((item, idx) => {
        const attrChips = getItemAttributeChips(item, [], links);
        const tagChips = getItemTagChips(item);
        const isSelected = selectedId === item.id;
        const isLinked = connectedIds.has(item.id);
        const isDimmed = selectedId !== null && !isSelected && !isLinked;
        const status = getStatusLabel(item, []);
        
        return {
          id: item.id,
          position: { x: xPos, y: 75 + idx * 225 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: (
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span className="item-label">
                    {getLabel(item)}
                  </span>
                  <span className={`item-status ${status === 'needs review' ? 'warning' : ''}`}>
                    {status}
                  </span>
                </div>
                {item.name && (
                  <div style={{ marginTop: 3, fontWeight: 600, fontSize: "12px", whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3 }}>
                    {item.name}
                  </div>
                )}
                <div style={{ marginTop: 5, fontSize: "11px", color: "var(--text-dim)" }}>
                  <MarkdownView content={item.content} />
                </div>
                {(attrChips.length > 0 || tagChips.length > 0) && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                    {attrChips.map((chip) => (
                      <span key={chip.label} className={chipClassName(chip)}>
                        {chip.label}
                      </span>
                    ))}
                    {tagChips.map((chip) => (
                      <span key={chip.label} className={chipClassName(chip)}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          },
          style: {
            background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)',
            color: 'var(--text)',
            border: `1px solid ${isSelected ? 'var(--accent)' : isLinked ? 'var(--link-color)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            width: 360,
            opacity: isDimmed ? 0.45 : 1,
            boxShadow: isSelected 
              ? '0 0 0 1px var(--accent), 0 4px 8px -2px rgba(0, 0, 0, 0.1)'
              : isLinked 
              ? '0 0 0 1px var(--link-color), 0 4px 8px -2px rgba(0, 0, 0, 0.1)'
              : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }
        };
      });
    };

    return [
      ...createNodes(urs, 75),
      ...createNodes(srs, 600),
      ...createNodes(fts, 1125)
    ] as Node[];
  }, [items, links, selectedId, connectedIds]);

  const edges = useMemo<Edge[]>(() => {
    return links.map(link => ({
      id: link.id,
      source: link.sourceId,
      target: link.targetId,
      animated: true,
      style: { stroke: 'var(--link-color)', strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--link-color)',
      },
    }));
  }, [links]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="var(--border)" gap={24} />
        <Controls style={{ fill: "var(--text)" }} />
      </ReactFlow>
    </div>
  );
}
