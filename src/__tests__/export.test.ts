import { describe, expect, it, vi } from "vitest";
import {
  exportMarkdown,
  parseProjectYaml,
  projectToMarkdown,
} from "../export";
import type { ProjectData } from "../domain/types";

function baseProject(): ProjectData {
  return {
    project: {
      id: "project-1",
      name: "Export Test",
      version: "1.0.0",
      updatedAt: "2026-05-03T00:00:00.000Z",
    },
    items: [
      {
        id: "ur-1",
        type: "UR",
        index: 1,
        content: "Need value | with pipe\nand newline",
        createdAt: "2026-05-03T00:00:00.000Z",
        updatedAt: "2026-05-03T00:00:00.000Z",
      },
      {
        id: "sr-1",
        type: "SR",
        index: 1,
        content: "System response",
        tags: ["api", "security"],
        createdAt: "2026-05-03T00:00:00.000Z",
        updatedAt: "2026-05-03T00:00:00.000Z",
      },
      {
        id: "ft-1",
        type: "FEATURE",
        index: 1,
        content: "Feature response",
        createdAt: "2026-05-03T00:00:00.000Z",
        updatedAt: "2026-05-03T00:00:00.000Z",
      },
    ],
    links: [
      {
        id: "link-1",
        type: "UR_TO_SR",
        sourceId: "ur-1",
        targetId: "sr-1",
        createdAt: "2026-05-03T00:00:00.000Z",
      },
      {
        id: "link-2",
        type: "SR_TO_FEATURE",
        sourceId: "sr-1",
        targetId: "ft-1",
        createdAt: "2026-05-03T00:00:00.000Z",
      },
    ],
  };
}

describe("parseProjectYaml", () => {
  it("accepts imported item tags", () => {
    const result = parseProjectYaml(`
project:
  id: project-1
  name: Tagged
  version: "1.0.0"
  updatedAt: "2026-05-03T00:00:00.000Z"
items:
  - id: ur-1
    type: UR
    index: 1
    content: Tagged requirement
    tags:
      - auth
      - security
    createdAt: "2026-05-03T00:00:00.000Z"
    updatedAt: "2026-05-03T00:00:00.000Z"
links: []
`);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data.items[0]!.tags : []).toEqual(["auth", "security"]);
  });

  it("rejects imported item tags that are not strings", () => {
    const result = parseProjectYaml(`
project:
  id: project-1
  name: Broken
  version: "1.0.0"
  updatedAt: "2026-05-03T00:00:00.000Z"
items:
  - id: ur-1
    type: UR
    index: 1
    content: Tagged requirement
    tags:
      - auth
      - 123
    createdAt: "2026-05-03T00:00:00.000Z"
    updatedAt: "2026-05-03T00:00:00.000Z"
links: []
`);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("Invalid item");
  });

  it("rejects dangling imported links", () => {
    const result = parseProjectYaml(`
project:
  id: project-1
  name: Broken
  version: "1.0.0"
  updatedAt: "2026-05-03T00:00:00.000Z"
items: []
links:
  - id: link-1
    type: UR_TO_SR
    sourceId: missing-ur
    targetId: missing-sr
    createdAt: "2026-05-03T00:00:00.000Z"
`);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("DANGLING_LINK");
  });

  it("rejects imported links with invalid type direction", () => {
    const project = baseProject();
    const result = parseProjectYaml(`
project:
  id: project-1
  name: Broken
  version: "1.0.0"
  updatedAt: "2026-05-03T00:00:00.000Z"
items:
  - ${JSON.stringify(project.items[0])}
  - ${JSON.stringify(project.items[2])}
links:
  - id: link-1
    type: UR_TO_SR
    sourceId: ur-1
    targetId: ft-1
    createdAt: "2026-05-03T00:00:00.000Z"
`);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("INVALID_LINK_TYPES");
  });
});

describe("projectToMarkdown", () => {
  it("escapes requirement content inside traceability matrix cells", () => {
    const markdown = projectToMarkdown(baseProject());

    expect(markdown).toContain("Need value \\| with pipe and newline");
    expect(markdown).not.toContain("| Need value | with pipe\nand newline |");
  });

  it("includes item tags", () => {
    const markdown = projectToMarkdown(baseProject());

    expect(markdown).toContain("Tags: `api`, `security`");
  });
});

describe("exportMarkdown", () => {
  it("does not revoke the object URL before triggering download", () => {
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    exportMarkdown(baseProject());

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });
});
