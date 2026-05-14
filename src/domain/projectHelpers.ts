import type {
  ProjectData,
  ItemEditFields,
  RequirementItem,
  RequirementLink,
  RequirementLinkType,
  RequirementType,
  TraceabilityWarning,
  ValidationError,
} from "./types";

function uuid(): string {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function createEmptyProject(name = "New Project"): ProjectData {
  return {
    project: { id: uuid(), name, version: "1.0.0", updatedAt: now() },
    items: [],
    links: [],
  };
}

function touch(data: ProjectData): ProjectData {
  return { ...data, project: { ...data.project, updatedAt: now() } };
}

function nextIndex(items: RequirementItem[], type: RequirementType): number {
  const ofType = items.filter((i) => i.type === type);
  return ofType.length + 1;
}

export function normalizeTags(tags?: string[]): string[] | undefined {
  if (!tags) return undefined;
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : undefined;
}

export function createItem(
  data: ProjectData,
  type: RequirementType,
  content: string,
  extraFields?: Omit<ItemEditFields, "content">
): ProjectData {
  const trimmed = content.trim();
  const item: RequirementItem = {
    id: uuid(),
    type,
    index: nextIndex(data.items, type),
    content: trimmed,
    name: extraFields?.name?.trim() || undefined,
    customPrefix: extraFields?.customPrefix?.trim() || undefined,
    reviewStatus: extraFields?.reviewStatus,
    reporter: extraFields?.reporter?.trim() || undefined,
    priority: extraFields?.priority,
    protocol: extraFields?.protocol?.trim() || undefined,
    dataFormat: extraFields?.dataFormat?.trim() || undefined,
    payload: extraFields?.payload?.trim() || undefined,
    acceptanceCriteria: extraFields?.acceptanceCriteria?.trim() || undefined,
    constraints: extraFields?.constraints?.trim() || undefined,
    owner: extraFields?.owner?.trim() || undefined,
    verificationStatus: extraFields?.verificationStatus?.trim() || undefined,
    tags: normalizeTags(extraFields?.tags),
    createdAt: now(),
    updatedAt: now(),
  };
  const newItems = [...data.items, item];
  return touch({ ...data, items: recomputeIndexes(newItems, type) });
}

export function updateItemContent(
  data: ProjectData,
  itemId: string,
  content: string
): ProjectData {
  const trimmed = content.trim();
  const items = data.items.map((i) =>
    i.id === itemId ? { ...i, content: trimmed, updatedAt: now() } : i
  );
  return touch({ ...data, items });
}

export function updateItemFields(
  data: ProjectData,
  itemId: string,
  fields: ItemEditFields
): ProjectData {
  const items = data.items.map((i) =>
    i.id === itemId
      ? {
          ...i,
          content: fields.content.trim(),
          name: fields.name?.trim() || undefined,
          customPrefix: fields.customPrefix?.trim() || undefined,
          reviewStatus: fields.reviewStatus,
          reporter: fields.reporter?.trim() || undefined,
          priority: fields.priority,
          protocol: fields.protocol?.trim() || undefined,
          dataFormat: fields.dataFormat?.trim() || undefined,
          payload: fields.payload?.trim() || undefined,
          acceptanceCriteria: fields.acceptanceCriteria?.trim() || undefined,
          constraints: fields.constraints?.trim() || undefined,
          owner: fields.owner?.trim() || undefined,
          verificationStatus: fields.verificationStatus?.trim() || undefined,
          tags: normalizeTags(fields.tags),
          updatedAt: now(),
        }
      : i
  );
  
  const targetItem = items.find(i => i.id === itemId);
  const finalItems = targetItem ? recomputeIndexes(items, targetItem.type) : items;
  
  return touch({ ...data, items: finalItems });
}

export function recomputeIndexes(
  items: RequirementItem[],
  type: RequirementType
): RequirementItem[] {
  let idx = 1;
  const domainCounters = new Map<string, number>();

  return items.map((i) => {
    if (i.type !== type) return i;
    
    // Calculate global index within type
    const currentIndex = idx++;
    
    // Calculate per-domain index
    let domain = "default";
    if (i.customPrefix) {
      domain = i.customPrefix.toUpperCase().replace(/^(UR|SR|FT)-?/, "");
    } else {
      const defaultPrefix = i.type === "FEATURE" ? "FT" : i.type;
      const domainIdPattern = new RegExp(`^${defaultPrefix.toLowerCase()}-([a-z0-9]+)-[a-z0-9]+$`);
      const match = i.id.toLowerCase().match(domainIdPattern);
      if (match) {
        domain = match[1].toUpperCase();
      }
    }
    const currentDomainIdx = (domainCounters.get(domain) || 0) + 1;
    domainCounters.set(domain, currentDomainIdx);

    return { ...i, index: currentIndex, domainIndex: currentDomainIdx };
  });
}

export function deleteItem(data: ProjectData, itemId: string): ProjectData {
  const target = data.items.find((i) => i.id === itemId);
  if (!target) return data;

  const filtered = data.items.filter((i) => i.id !== itemId);
  const reindexed = recomputeIndexes(filtered, target.type);
  const links = data.links.filter(
    (l) => l.sourceId !== itemId && l.targetId !== itemId
  );
  return touch({ ...data, items: reindexed, links });
}

export function reorderItem(
  data: ProjectData,
  itemId: string,
  newPosition: number
): ProjectData {
  const target = data.items.find((i) => i.id === itemId);
  if (!target) return data;

  const ofType = data.items.filter((i) => i.type === target.type);

  const without = ofType.filter((i) => i.id !== itemId);
  const clamped = Math.max(0, Math.min(newPosition, without.length));
  without.splice(clamped, 0, target);

  const reindexed = recomputeIndexes(without, target.type);
  const merged = data.items
    .filter((i) => i.type !== target.type)
    .concat(reindexed)
    .sort((a, b) => {
      const typeOrder: RequirementType[] = ["UR", "SR", "FEATURE"];
      const ta = typeOrder.indexOf(a.type);
      const tb = typeOrder.indexOf(b.type);
      return ta !== tb ? ta - tb : a.index - b.index;
    });

  return touch({ ...data, items: merged });
}

function isDuplicateLink(
  links: RequirementLink[],
  type: RequirementLinkType,
  sourceId: string,
  targetId: string
): boolean {
  return links.some(
    (l) => l.type === type && l.sourceId === sourceId && l.targetId === targetId
  );
}

function assertLinkTypes(
  data: ProjectData,
  type: RequirementLinkType,
  sourceId: string,
  targetId: string
): boolean {
  const source = data.items.find((i) => i.id === sourceId);
  const target = data.items.find((i) => i.id === targetId);
  if (!source || !target) return false;
  if (type === "UR_TO_SR") return source.type === "UR" && target.type === "SR";
  return source.type === "SR" && target.type === "FEATURE";
}

export function addLink(
  data: ProjectData,
  type: RequirementLinkType,
  sourceId: string,
  targetId: string
): ProjectData {
  if (!assertLinkTypes(data, type, sourceId, targetId)) return data;
  if (isDuplicateLink(data.links, type, sourceId, targetId)) return data;

  const link: RequirementLink = {
    id: uuid(),
    type,
    sourceId,
    targetId,
    createdAt: now(),
  };
  return touch({ ...data, links: [...data.links, link] });
}

export function removeLink(data: ProjectData, linkId: string): ProjectData {
  const links = data.links.filter((l) => l.id !== linkId);
  return touch({ ...data, links });
}

export function getLabel(item: RequirementItem): string {
  const defaultPrefix = item.type === "FEATURE" ? "FT" : item.type;
  
  let domainPart = item.customPrefix;
  let usePadding = true;

  if (!domainPart) {
    const domainIdPattern = new RegExp(`^${defaultPrefix.toLowerCase()}-([a-z0-9]+)-[a-z0-9]+$`);
    const match = item.id.toLowerCase().match(domainIdPattern);
    if (match) {
      domainPart = match[1].toUpperCase();
    } else {
      domainPart = "";
      usePadding = false;
    }
  } else {
    domainPart = domainPart.toUpperCase().replace(/^(UR|SR|FT)-?/, "");
  }

  const prefix = domainPart ? `${defaultPrefix}-${domainPart}` : defaultPrefix;
  const suffixIndex = item.domainIndex ?? item.index;
  const suffix = usePadding ? String(suffixIndex).padStart(2, "0") : suffixIndex;
  return `${prefix}-${suffix}`;
}

export function validateTraceability(
  data: ProjectData
): TraceabilityWarning[] {
  const warnings: TraceabilityWarning[] = [];

  const linkedUrIds = new Set(
    data.links.filter((l) => l.type === "UR_TO_SR").map((l) => l.sourceId)
  );
  const linkedSrIds_fromUr = new Set(
    data.links.filter((l) => l.type === "UR_TO_SR").map((l) => l.targetId)
  );
  const linkedSrIds_toFeature = new Set(
    data.links
      .filter((l) => l.type === "SR_TO_FEATURE")
      .map((l) => l.sourceId)
  );
  const linkedFeatureIds = new Set(
    data.links.filter((l) => l.type === "SR_TO_FEATURE").map((l) => l.targetId)
  );

  for (const item of data.items) {
    if (item.type === "UR" && !linkedUrIds.has(item.id)) {
      warnings.push({ code: "UR_WITHOUT_SR", itemId: item.id, label: getLabel(item) });
    }
    if (item.type === "SR" && !linkedSrIds_fromUr.has(item.id)) {
      warnings.push({ code: "SR_WITHOUT_UR", itemId: item.id, label: getLabel(item) });
    }
    if (item.type === "SR" && !linkedSrIds_toFeature.has(item.id)) {
      warnings.push({ code: "SR_WITHOUT_FEATURE", itemId: item.id, label: getLabel(item) });
    }
    if (item.type === "FEATURE" && !linkedFeatureIds.has(item.id)) {
      warnings.push({ code: "FEATURE_WITHOUT_SR", itemId: item.id, label: getLabel(item) });
    }
  }

  return warnings;
}

export function validateStructure(data: ProjectData): ValidationError[] {
  const errors: ValidationError[] = [];
  const itemIds = new Set(data.items.map((i) => i.id));

  const seen = new Set<string>();
  for (const link of data.links) {
    if (!itemIds.has(link.sourceId) || !itemIds.has(link.targetId)) {
      errors.push({ kind: "DANGLING_LINK", linkId: link.id });
      continue;
    }
    if (!assertLinkTypes(data, link.type, link.sourceId, link.targetId)) {
      errors.push({ kind: "INVALID_LINK_TYPES", linkId: link.id });
      continue;
    }
    const key = `${link.type}:${link.sourceId}:${link.targetId}`;
    if (seen.has(key)) {
      errors.push({ kind: "DUPLICATE_LINK", linkId: link.id });
    } else {
      seen.add(key);
    }
  }

  return errors;
}
