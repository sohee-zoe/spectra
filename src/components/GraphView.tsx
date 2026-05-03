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

type Props = {
  items: RequirementItem[];
  links: RequirementLink[];
  onSelect: (id: string | null) => void;
};

export function GraphView({ items, links, onSelect }: Props) {
  const nodes = useMemo<Node[]>(() => {
    const urs = items.filter(i => i.type === 'UR');
    const srs = items.filter(i => i.type === 'SR');
    const fts = items.filter(i => i.type === 'FEATURE');

    const createNodes = (list: RequirementItem[], xPos: number) => {
      return list.map((item, idx) => ({
        id: item.id,
        position: { x: xPos, y: 75 + idx * 225 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { 
          label: (
            <div style={{ textAlign: "left" }}>
              <strong style={{ color: "var(--accent)", fontSize: "12px" }}>
                {getLabel(item)}
              </strong>
              {item.name && (
                <div style={{ marginTop: 4, fontWeight: 600, fontSize: "14px" }}>
                  {item.name}
                </div>
              )}
              <div style={{ marginTop: 6, color: "var(--text-dim)", fontSize: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.content}
              </div>
              {item.tags && item.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        color: "var(--text)",
                        fontSize: 11,
                        padding: "1px 5px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) 
        },
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: `1px solid var(--border)`,
          borderRadius: 'var(--radius)',
          padding: '18px',
          width: 360,
          boxShadow: '0 6px 9px -2px rgba(0, 0, 0, 0.1)'
        }
      }));
    };

    return [
      ...createNodes(urs, 75),
      ...createNodes(srs, 600),
      ...createNodes(fts, 1125)
    ];
  }, [items]);

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
