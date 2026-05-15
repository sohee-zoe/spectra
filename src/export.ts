import yaml from "js-yaml";
import type { ProjectData } from "./domain/types";
import {
  getLabel,
  normalizeTags,
  validateStructure,
  validateTraceability,
} from "./domain/projectHelpers";

// ── Helpers ────────────────────────────────────────────────────────────────

// Preserves non-ASCII characters (Korean, etc.) — only strips filesystem-unsafe chars
function slugify(name: string): string {
  const safe = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\/\\:*?"<>|]/g, "");
  return safe || "requirements";
}

// Format: yy-mm-dd-hh-mm
function formatDatePrefix(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${yy}-${mo}-${dd}-${hh}-${mm}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so the browser has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const WARNING_MESSAGES: Record<string, string> = {
  UR_WITHOUT_SR: "User requirement has no linked system requirement.",
  SR_WITHOUT_UR: "System requirement has no linked user requirement.",
  SR_WITHOUT_FEATURE: "System requirement has no linked feature.",
  FEATURE_WITHOUT_SR: "Feature has no linked system requirement.",
};

// ── YAML Export ────────────────────────────────────────────────────────────

export function exportYaml(data: ProjectData): void {
  const warnings = validateTraceability(data);

  // Sort items: UR → SR → FEATURE, then by index
  const typeOrder = ["UR", "SR", "FEATURE"];
  const sortedItems = data.items.toSorted((a, b) => {
    const ta = typeOrder.indexOf(a.type);
    const tb = typeOrder.indexOf(b.type);
    return ta !== tb ? ta - tb : a.index - b.index;
  });

  // Sort links: by type, then sourceId label, then targetId label
  const labelMap = new Map(data.items.map((i) => [i.id, getLabel(i)]));
  const sortedLinks = data.links.toSorted((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    const sa = labelMap.get(a.sourceId) ?? "";
    const sb = labelMap.get(b.sourceId) ?? "";
    if (sa !== sb) return sa.localeCompare(sb);
    const ta = labelMap.get(a.targetId) ?? "";
    const tb = labelMap.get(b.targetId) ?? "";
    return ta.localeCompare(tb);
  });

  // Sort warnings: by code (severity), then label
  const sortedWarnings = warnings.toSorted((a, b) =>
    a.code.localeCompare(b.code) || a.label.localeCompare(b.label)
  );

  const doc = {
    project: data.project,
    items: sortedItems,
    links: sortedLinks,
    traceability_warnings: sortedWarnings.map((w) => ({
      severity: "warning",
      code: w.code,
      item_id: w.itemId,
      message: WARNING_MESSAGES[w.code] ?? w.code,
    })),
  };

  const content = yaml.dump(doc, {
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
  });

  const filename = `${formatDatePrefix()}-${slugify(data.project.name)}.yaml`;
  downloadFile(content, filename, "application/yaml");
}

// ── Markdown Export ────────────────────────────────────────────────────────

function markdownTableCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

function formatTags(tags?: string[]): string | null {
  if (!tags || tags.length === 0) return null;
  return `Labels: ${tags.map((tag) => `\`${tag}\``).join(", ")}`;
}

export function projectToMarkdown(data: ProjectData): string {
  const warnings = validateTraceability(data);
  const items = data.items;
  const links = data.links;

  const urs = items.filter((i) => i.type === "UR").toSorted((a, b) => a.index - b.index);
  const srs = items.filter((i) => i.type === "SR").toSorted((a, b) => a.index - b.index);
  const features = items.filter((i) => i.type === "FEATURE").toSorted((a, b) => a.index - b.index);

  const labelMap = new Map(items.map((i) => [i.id, getLabel(i)]));
  const itemMap = new Map(items.map((i) => [i.id, i]));

  function getLinkedLabels(itemId: string, linkType: string, side: "source" | "target"): string[] {
    return links
      .reduce<string[]>((acc, l) => {
        if (l.type === linkType && (side === "source" ? l.sourceId === itemId : l.targetId === itemId)) {
          acc.push(labelMap.get(side === "source" ? l.targetId : l.sourceId) ?? "?");
        }
        return acc;
      }, [])
      .sort();
  }

  const lines: string[] = [];

  // Title + project info
  lines.push(`# ${data.project.name} Requirements`);
  lines.push("");
  lines.push(`Version: ${data.project.version}`);
  lines.push(`Updated: ${data.project.updatedAt}`);
  lines.push("");

  // Traceability summary
  lines.push("## Traceability Summary");
  lines.push("");
  lines.push(`- User Requirements: ${urs.length}`);
  lines.push(`- System Requirements: ${srs.length}`);
  lines.push(`- Features: ${features.length}`);
  lines.push(`- Warnings: ${warnings.length}`);
  lines.push(`- Errors: 0`);
  lines.push("");

  // User Requirements
  lines.push("## User Requirements");
  lines.push("");
  if (urs.length === 0) {
    lines.push("_No user requirements._");
    lines.push("");
  } else {
    for (const ur of urs) {
      const label = getLabel(ur);
      const linkedSrs = getLinkedLabels(ur.id, "UR_TO_SR", "source");
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(ur.content);
      lines.push("");
      const tags = formatTags(ur.tags);
      if (tags) {
        lines.push(tags);
        lines.push("");
      }
      lines.push(`Linked SR: ${linkedSrs.length > 0 ? linkedSrs.join(", ") : "_None_"}`);
      lines.push("");
    }
  }

  // System Requirements
  lines.push("## System Requirements");
  lines.push("");
  if (srs.length === 0) {
    lines.push("_No system requirements._");
    lines.push("");
  } else {
    for (const sr of srs) {
      const label = getLabel(sr);
      const linkedUrs = getLinkedLabels(sr.id, "UR_TO_SR", "target");
      const linkedFts = getLinkedLabels(sr.id, "SR_TO_FEATURE", "source");
      lines.push(`### ${label}${sr.name ? ` - ${sr.name}` : ""}`);
      lines.push("");
      
      const meta = [];
      if (sr.priority) meta.push(`**Priority:** ${sr.priority === "R" ? "Required" : "Optional"}`);
      if (sr.protocol) meta.push(`**Protocol:** \`${sr.protocol}\``);
      if (sr.dataFormat) meta.push(`**Data Format:** \`${sr.dataFormat}\``);
      
      if (meta.length > 0) {
        lines.push(meta.join(" | "));
        lines.push("");
      }

      lines.push(sr.content);
      lines.push("");

      const tags = formatTags(sr.tags);
      if (tags) {
        lines.push(tags);
        lines.push("");
      }

      if (sr.payload) {
        lines.push("**Payload / Schema:**");
        lines.push("```");
        lines.push(sr.payload);
        lines.push("```");
        lines.push("");
      }

      if (sr.acceptanceCriteria) {
        lines.push("**Acceptance Criteria:**");
        lines.push("");
        lines.push(sr.acceptanceCriteria);
        lines.push("");
      }

      if (sr.constraints) {
        lines.push("**Constraints / Notes:**");
        lines.push("");
        lines.push(sr.constraints);
        lines.push("");
      }

      lines.push(`Linked UR: ${linkedUrs.length > 0 ? linkedUrs.join(", ") : "_None_"}`);
      lines.push(`Linked Features: ${linkedFts.length > 0 ? linkedFts.join(", ") : "_None_"}`);
      lines.push("");
    }
  }

  // Features
  lines.push("## Features");
  lines.push("");
  if (features.length === 0) {
    lines.push("_No features._");
    lines.push("");
  } else {
    for (const ft of features) {
      const label = getLabel(ft);
      const linkedSrs = getLinkedLabels(ft.id, "SR_TO_FEATURE", "target");
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(ft.content);
      lines.push("");
      const tags = formatTags(ft.tags);
      if (tags) {
        lines.push(tags);
        lines.push("");
      }
      lines.push(`Linked SR: ${linkedSrs.length > 0 ? linkedSrs.join(", ") : "_None_"}`);
      lines.push("");
    }
  }

  // Traceability Matrix
  lines.push("## Traceability Matrix");
  lines.push("");
  lines.push("| UR | Content | SR | Feature | Status |");
  lines.push("| --- | --- | --- | --- | --- |");

  if (urs.length === 0) {
    lines.push("| — | — | — | — | — |");
  } else {
    for (const ur of urs) {
      const urLabel = getLabel(ur);
      const linkedSrIds = links.reduce<string[]>((acc, l) => {
        if (l.type === "UR_TO_SR" && l.sourceId === ur.id) acc.push(l.targetId);
        return acc;
      }, []);

      if (linkedSrIds.length === 0) {
        const hasWarning = warnings.some((w) => w.itemId === ur.id);
        lines.push(
          `| ${urLabel} | ${markdownTableCell(ur.content)} | _None_ | — | ${hasWarning ? "⚠ Warning" : "OK"} |`
        );
      } else {
        for (const srId of linkedSrIds) {
          const sr = itemMap.get(srId);
          if (!sr) continue;
          const srLabel = getLabel(sr);
          const linkedFtIds = links.reduce<string[]>((acc, l) => {
            if (l.type === "SR_TO_FEATURE" && l.sourceId === srId) acc.push(l.targetId);
            return acc;
          }, []);

          const ftLabels = linkedFtIds
            .map((ftId) => {
              const ft = itemMap.get(ftId);
              return ft ? getLabel(ft) : "?";
            })
            .sort()
            .join(", ");

          const hasWarning =
            warnings.some((w) => w.itemId === ur.id) ||
            warnings.some((w) => w.itemId === srId) ||
            linkedFtIds.some((ftId) => warnings.some((w) => w.itemId === ftId));

          lines.push(
            `| ${urLabel} | ${markdownTableCell(ur.content)} | ${srLabel} | ${ftLabels || "_None_"} | ${hasWarning ? "⚠ Warning" : "OK"} |`
          );
        }
      }
    }
  }
  lines.push("");

  // Warnings
  lines.push("## Warnings");
  lines.push("");
  if (warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const w of warnings) {
      lines.push(`- **${w.label}**: ${WARNING_MESSAGES[w.code] ?? w.code}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

export function exportMarkdown(data: ProjectData): void {
  const content = projectToMarkdown(data);
  const filename = `${formatDatePrefix()}-${slugify(data.project.name)}.md`;
  downloadFile(content, filename, "text/markdown");
}
// ── YAML Import ────────────────────────────────────────────────────────────

export type ImportResult =
  | { ok: true; data: ProjectData }
  | { ok: false; error: string };

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number";
}

export function validateProjectData(raw: unknown): ImportResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "File is not a valid YAML object." };
  }

  const r = raw as Record<string, unknown>;

  // Validate project
  const p = r.project as Record<string, unknown> | undefined;
  if (!p || !isString(p.id) || !isString(p.name) || !isString(p.version) || !isString(p.updatedAt)) {
    return { ok: false, error: "Missing or invalid 'project' fields." };
  }

  // Validate items
  if (!Array.isArray(r.items)) {
    return { ok: false, error: "Missing or invalid 'items' array." };
  }
  const VALID_ITEM_TYPES = new Set(["UR", "SR", "FEATURE"]);
  const VALID_REVIEW_STATUSES = new Set(["stable", "approved", "needs review", "in review"]);
  for (const item of r.items) {
    const i = item as Record<string, unknown>;
    if (
      !isString(i.id) ||
      !VALID_ITEM_TYPES.has(i.type as string) ||
      !isNumber(i.index) ||
      !isString(i.content) ||
      !isString(i.createdAt) ||
      !isString(i.updatedAt) ||
      (i.reviewStatus !== undefined &&
        !VALID_REVIEW_STATUSES.has(i.reviewStatus as string)) ||
      (i.reporter !== undefined && !isString(i.reporter)) ||
      (i.acceptanceCriteria !== undefined && !isString(i.acceptanceCriteria)) ||
      (i.constraints !== undefined && !isString(i.constraints)) ||
      (i.owner !== undefined && !isString(i.owner)) ||
      (i.verificationStatus !== undefined && !isString(i.verificationStatus)) ||
      (i.tags !== undefined &&
        (!Array.isArray(i.tags) || !i.tags.every((tag) => isString(tag))))
    ) {
      return { ok: false, error: `Invalid item: ${JSON.stringify(item)}` };
    }
  }

  // Validate links
  if (!Array.isArray(r.links)) {
    return { ok: false, error: "Missing or invalid 'links' array." };
  }
  const VALID_LINK_TYPES = new Set(["UR_TO_SR", "SR_TO_FEATURE"]);
  for (const link of r.links) {
    const l = link as Record<string, unknown>;
    if (
      !isString(l.id) ||
      !VALID_LINK_TYPES.has(l.type as string) ||
      !isString(l.sourceId) ||
      !isString(l.targetId) ||
      !isString(l.createdAt)
    ) {
      return { ok: false, error: `Invalid link: ${JSON.stringify(link)}` };
    }
  }

  const data: ProjectData = {
    project: {
      id: p.id as string,
      name: p.name as string,
      version: p.version as string,
      updatedAt: p.updatedAt as string,
    },
    items: (r.items as ProjectData["items"]).map((item) => ({
      ...item,
      tags: normalizeTags(item.tags),
    })),
    links: r.links as ProjectData["links"],
  };

  const structuralErrors = validateStructure(data);
  if (structuralErrors.length > 0) {
    return {
      ok: false,
      error: `Invalid traceability structure: ${structuralErrors
        .map((e) => `${e.kind}:${e.linkId}`)
        .join(", ")}`,
    };
  }

  return {
    ok: true,
    data,
  };
}

export function parseProjectYaml(text: string): ImportResult {
  try {
    const parsed = yaml.load(text);
    return validateProjectData(parsed);
  } catch (err) {
    return { ok: false, error: `YAML parse error: ${String(err)}` };
  }
}

export function importYamlFile(onLoad: (result: ImportResult) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".yaml,.yml";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onLoad(parseProjectYaml(text));
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}
