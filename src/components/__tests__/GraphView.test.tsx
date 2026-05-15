import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RequirementItem } from "../../domain/types";
import { GraphView } from "../GraphView";

vi.mock("@xyflow/react", async () => {
  const { useState } = await import("react");
  return {
    ReactFlow: ({ nodes }: { nodes: Array<{ data: { label: React.ReactNode } }> }) => (
      <div>
        {nodes.map((node, index) => (
          <div key={index}>{node.data.label}</div>
        ))}
      </div>
    ),
    Controls: () => null,
    Background: () => null,
    MarkerType: { ArrowClosed: "arrowclosed" },
    Position: { Right: "right", Left: "left" },
    useNodesState: (initial: unknown[]) => {
      const [nodes, setNodes] = useState(initial);
      return [nodes, setNodes, () => {}];
    },
  };
});

const longItem: RequirementItem = {
  id: "ur-long-01",
  type: "UR",
  index: 1,
  name: "긴 요구사항",
  content:
    "고객이 매우 긴 요구사항 설명을 작성하더라도 그래프 노드 안에서 줄바꿈되어 읽을 수 있어야 한다.",
  tags: ["checkout"],
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
};

describe("GraphView", () => {
  it("renders long content in a wrapping text container and hides raw metadata tags", () => {
    render(<GraphView items={[longItem]} links={[]} selectedId={null} connectedIds={new Set()} onSelect={() => {}} />);

    expect(screen.getByText("stable")).toBeInTheDocument();
    const content = screen.getByText(/매우 긴 요구사항 설명/);
    const wrapper = content.closest("div[style]");
    expect(wrapper).toHaveStyle({ whiteSpace: "normal" });
    expect(wrapper).toHaveStyle({ overflowWrap: "anywhere" });
    expect(screen.getByText("checkout").closest(".graph-node-chip-row")).toBeInTheDocument();
    expect(screen.queryByText(/Reporter Sample/)).not.toBeInTheDocument();
    expect(screen.queryByText("reporter:Sample")).not.toBeInTheDocument();
  });
});
