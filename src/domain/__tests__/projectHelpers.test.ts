import { describe, it, expect } from "vitest";
import {
  createEmptyProject,
  createItem,
  deleteItem,
  reorderItem,
  addLink,
  removeLink,
  getLabel,
  validateTraceability,
  validateStructure,
} from "../projectHelpers";
import type { ProjectData } from "../types";

function makeProject(): ProjectData {
  let p = createEmptyProject("Test");
  p = createItem(p, "UR", "UR content A");
  p = createItem(p, "UR", "UR content B");
  p = createItem(p, "SR", "SR content A");
  p = createItem(p, "SR", "SR content B");
  p = createItem(p, "FEATURE", "FT content A");
  return p;
}

describe("createEmptyProject", () => {
  it("has empty items and links", () => {
    const p = createEmptyProject();
    expect(p.items).toHaveLength(0);
    expect(p.links).toHaveLength(0);
  });
});

describe("createItem", () => {
  it("assigns one-based indexes per type", () => {
    const p = makeProject();
    const urs = p.items.filter((i) => i.type === "UR");
    const srs = p.items.filter((i) => i.type === "SR");
    expect(urs.map((i) => i.index)).toEqual([1, 2]);
    expect(srs.map((i) => i.index)).toEqual([1, 2]);
  });

  it("trims content", () => {
    let p = createEmptyProject();
    p = createItem(p, "UR", "  trimmed  ");
    expect(p.items[0]!.content).toBe("trimmed");
  });

  it("normalizes tags", () => {
    let p = createEmptyProject();
    p = createItem(p, "UR", "Tagged", {
      tags: [" auth ", "security", "auth", "", " SECURITY "],
    });
    expect(p.items[0]!.tags).toEqual(["auth", "security"]);
  });

  it("assigns unique UUIDs", () => {
    const p = makeProject();
    const ids = p.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("deleteItem", () => {
  it("removes item and reindexes type", () => {
    let p = makeProject();
    const ur1Id = p.items.find((i) => i.type === "UR" && i.index === 1)!.id;
    p = deleteItem(p, ur1Id);
    const urs = p.items.filter((i) => i.type === "UR");
    expect(urs).toHaveLength(1);
    expect(urs[0]!.index).toBe(1);
  });

  it("removes links referencing deleted item", () => {
    let p = makeProject();
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    expect(p.links).toHaveLength(1);
    p = deleteItem(p, ur.id);
    expect(p.links).toHaveLength(0);
  });

  it("does not affect items of other types", () => {
    let p = makeProject();
    const ur1Id = p.items.find((i) => i.type === "UR" && i.index === 1)!.id;
    const srsBefore = p.items.filter((i) => i.type === "SR").length;
    p = deleteItem(p, ur1Id);
    expect(p.items.filter((i) => i.type === "SR")).toHaveLength(srsBefore);
  });
});

describe("reorderItem", () => {
  it("preserves UUIDs after reorder", () => {
    let p = makeProject();
    const ur1Id = p.items.find((i) => i.type === "UR" && i.index === 1)!.id;
    const ur2Id = p.items.find((i) => i.type === "UR" && i.index === 2)!.id;
    p = reorderItem(p, ur1Id, 1);
    const urs = p.items.filter((i) => i.type === "UR");
    const ids = urs.map((i) => i.id);
    expect(ids).toContain(ur1Id);
    expect(ids).toContain(ur2Id);
  });

  it("reassigns indexes after reorder", () => {
    let p = makeProject();
    const ur1Id = p.items.find((i) => i.type === "UR" && i.index === 1)!.id;
    p = reorderItem(p, ur1Id, 1);
    const urs = p.items
      .filter((i) => i.type === "UR")
      .sort((a, b) => a.index - b.index);
    expect(urs[0]!.index).toBe(1);
    expect(urs[1]!.index).toBe(2);
  });

  it("links stay valid after reorder", () => {
    let p = makeProject();
    const ur = p.items.find((i) => i.type === "UR" && i.index === 1)!;
    const sr = p.items.find((i) => i.type === "SR" && i.index === 1)!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    const linkBefore = p.links[0]!;
    p = reorderItem(p, ur.id, 1);
    const linkAfter = p.links.find((l) => l.id === linkBefore.id)!;
    expect(linkAfter.sourceId).toBe(ur.id);
    expect(linkAfter.targetId).toBe(sr.id);
  });
});

describe("addLink", () => {
  it("creates UR_TO_SR link", () => {
    let p = makeProject();
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    expect(p.links).toHaveLength(1);
    expect(p.links[0]!.sourceId).toBe(ur.id);
  });

  it("rejects duplicate link", () => {
    let p = makeProject();
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    expect(p.links).toHaveLength(1);
  });

  it("rejects wrong type combination", () => {
    let p = makeProject();
    const ur = p.items.find((i) => i.type === "UR")!;
    const ft = p.items.find((i) => i.type === "FEATURE")!;
    p = addLink(p, "UR_TO_SR", ur.id, ft.id);
    expect(p.links).toHaveLength(0);
  });
});

describe("removeLink", () => {
  it("removes link by id", () => {
    let p = makeProject();
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    const linkId = p.links[0]!.id;
    p = removeLink(p, linkId);
    expect(p.links).toHaveLength(0);
  });
});

describe("getLabel", () => {
  it("formats labels correctly", () => {
    const p = makeProject();
    const ur = p.items.find((i) => i.type === "UR" && i.index === 1)!;
    const sr = p.items.find((i) => i.type === "SR" && i.index === 2)!;
    const ft = p.items.find((i) => i.type === "FEATURE")!;
    expect(getLabel(ur)).toBe("UR-1");
    expect(getLabel(sr)).toBe("SR-2");
    expect(getLabel(ft)).toBe("FT-1");
  });
});

describe("validateTraceability", () => {
  it("warns for unlinked UR", () => {
    const p = makeProject();
    const warnings = validateTraceability(p);
    const urWarnings = warnings.filter((w) => w.code === "UR_WITHOUT_SR");
    expect(urWarnings).toHaveLength(2);
  });

  it("no warning when all linked", () => {
    let p = createEmptyProject();
    p = createItem(p, "UR", "UR A");
    p = createItem(p, "SR", "SR A");
    p = createItem(p, "FEATURE", "FT A");
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    const ft = p.items.find((i) => i.type === "FEATURE")!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    p = addLink(p, "SR_TO_FEATURE", sr.id, ft.id);
    const warnings = validateTraceability(p);
    expect(warnings).toHaveLength(0);
  });
});

describe("validateStructure", () => {
  it("detects dangling links after delete via direct mutation", () => {
    const p = makeProject();
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    const linked = addLink(p, "UR_TO_SR", ur.id, sr.id);
    const corrupted: ProjectData = {
      ...linked,
      items: linked.items.filter((i) => i.id !== ur.id),
    };
    const errors = validateStructure(corrupted);
    expect(errors.some((e) => e.kind === "DANGLING_LINK")).toBe(true);
  });

  it("no errors on clean project", () => {
    let p = createEmptyProject();
    p = createItem(p, "UR", "UR A");
    p = createItem(p, "SR", "SR A");
    const ur = p.items.find((i) => i.type === "UR")!;
    const sr = p.items.find((i) => i.type === "SR")!;
    p = addLink(p, "UR_TO_SR", ur.id, sr.id);
    expect(validateStructure(p)).toHaveLength(0);
  });
});
