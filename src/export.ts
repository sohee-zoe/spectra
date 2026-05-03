import yaml from "js-yaml";
import type { ProjectData, TraceabilityWarning } from "./domain/types";
import { getLabel, validateTraceability } from "./domain/projectHelpers";

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
  const sortedItems = [...data.items].sort((a, b) => {
    const ta = typeOrder.indexOf(a.type);
    const tb = typeOrder.indexOf(b.type);
    return ta !== tb ? ta - tb : a.index - b.index;
  });

  // Sort links: by type, then sourceId label, then targetId label
  const labelMap = new Map(data.items.map((i) => [i.id, getLabel(i)]));
  const sortedLinks = [...data.links].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    const sa = labelMap.get(a.sourceId) ?? "";
    const sb = labelMap.get(b.sourceId) ?? "";
    if (sa !== sb) return sa.localeCompare(sb);
    const ta = labelMap.get(a.targetId) ?? "";
    const tb = labelMap.get(b.targetId) ?? "";
    return ta.localeCompare(tb);
  });

  // Sort warnings: by code (severity), then label
  const sortedWarnings = [...warnings].sort((a, b) =>
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

export function exportMarkdown(data: ProjectData): void {
  const warnings = validateTraceability(data);
  const items = data.items;
  const links = data.links;

  const urs = items.filter((i) => i.type === "UR").sort((a, b) => a.index - b.index);
  const srs = items.filter((i) => i.type === "SR").sort((a, b) => a.index - b.index);
  const features = items.filter((i) => i.type === "FEATURE").sort((a, b) => a.index - b.index);

  const labelMap = new Map(items.map((i) => [i.id, getLabel(i)]));

  function getLinkedLabels(itemId: string, linkType: string, side: "source" | "target"): string[] {
    return links
      .filter((l) => l.type === linkType && (side === "source" ? l.sourceId === itemId : l.targetId === itemId))
      .map((l) => labelMap.get(side === "source" ? l.targetId : l.sourceId) ?? "?")
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

      if (sr.payload) {
        lines.push("**Payload / Schema:**");
        lines.push("```");
        lines.push(sr.payload);
        lines.push("```");
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
      const linkedSrIds = links
        .filter((l) => l.type === "UR_TO_SR" && l.sourceId === ur.id)
        .map((l) => l.targetId);

      if (linkedSrIds.length === 0) {
        const hasWarning = warnings.some((w) => w.itemId === ur.id);
        lines.push(`| ${urLabel} | ${ur.content} | _None_ | — | ${hasWarning ? "⚠ Warning" : "OK"} |`);
      } else {
        for (const srId of linkedSrIds) {
          const sr = items.find((i) => i.id === srId);
          if (!sr) continue;
          const srLabel = getLabel(sr);
          const linkedFtIds = links
            .filter((l) => l.type === "SR_TO_FEATURE" && l.sourceId === srId)
            .map((l) => l.targetId);

          const ftLabels = linkedFtIds
            .map((ftId) => {
              const ft = items.find((i) => i.id === ftId);
              return ft ? getLabel(ft) : "?";
            })
            .sort()
            .join(", ");

          const hasWarning =
            warnings.some((w) => w.itemId === ur.id) ||
            warnings.some((w) => w.itemId === srId) ||
            linkedFtIds.some((ftId) => warnings.some((w) => w.itemId === ftId));

          lines.push(
            `| ${urLabel} | ${ur.content} | ${srLabel} | ${ftLabels || "_None_"} | ${hasWarning ? "⚠ Warning" : "OK"} |`
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

  const content = lines.join("\n");
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

function validateImport(raw: unknown): ImportResult {
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
  for (const item of r.items) {
    const i = item as Record<string, unknown>;
    if (
      !isString(i.id) ||
      !["UR", "SR", "FEATURE"].includes(i.type as string) ||
      !isNumber(i.index) ||
      !isString(i.content) ||
      !isString(i.createdAt) ||
      !isString(i.updatedAt)
    ) {
      return { ok: false, error: `Invalid item: ${JSON.stringify(item)}` };
    }
  }

  // Validate links
  if (!Array.isArray(r.links)) {
    return { ok: false, error: "Missing or invalid 'links' array." };
  }
  for (const link of r.links) {
    const l = link as Record<string, unknown>;
    if (
      !isString(l.id) ||
      !["UR_TO_SR", "SR_TO_FEATURE"].includes(l.type as string) ||
      !isString(l.sourceId) ||
      !isString(l.targetId) ||
      !isString(l.createdAt)
    ) {
      return { ok: false, error: `Invalid link: ${JSON.stringify(link)}` };
    }
  }

  return {
    ok: true,
    data: {
      project: {
        id: p.id as string,
        name: p.name as string,
        version: p.version as string,
        updatedAt: p.updatedAt as string,
      },
      items: r.items as ProjectData["items"],
      links: r.links as ProjectData["links"],
    },
  };
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
      try {
        const text = e.target?.result as string;
        const parsed = yaml.load(text);
        onLoad(validateImport(parsed));
      } catch (err) {
        onLoad({ ok: false, error: `YAML parse error: ${String(err)}` });
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}
