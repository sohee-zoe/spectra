import type { RequirementItem, RequirementLink, TraceabilityWarning } from "../domain/types";
import { getLabel } from "../domain/projectHelpers";

export function getItemTitle(item: RequirementItem): string {
  return item.name ?? item.content.split("\n")[0] ?? getLabel(item);
}

export function getItemSummary(item: RequirementItem): string {
  const summary = item.content.split("\n").find((line) => line.trim()) ?? "";
  return summary.length > 92 ? `${summary.slice(0, 89)}...` : summary;
}

export function getItemWarnings(item: RequirementItem, warnings: TraceabilityWarning[]) {
  return warnings.filter((warning) => warning.itemId === item.id);
}

export function getLinkCount(item: RequirementItem, links: RequirementLink[]): number {
  return links.filter((link) => link.sourceId === item.id || link.targetId === item.id).length;
}

export function getStatusLabel(item: RequirementItem, warnings: TraceabilityWarning[]): string {
  if (item.reviewStatus) return item.reviewStatus;
  if (getItemWarnings(item, warnings).length > 0) return "needs review";
  if (item.type === "SR") return "approved";
  if (item.type === "FEATURE") return "in review";
  return "stable";
}

// ── Unified chip system ───────────────────────────────────────────────────────
//
// All views use these chip types and CSS classes:
//   "attribute"  → .card-attribute          (dim, grey)
//   "required"   → .card-attribute + .card-attribute-required  (red, emphasis)
//   "tag"        → .tag-chip                (accent tinted)

export type ItemChip = {
  label: string;
  kind: "default" | "error" | "success" | "info" | "warning" | "tag";
};

export function chipClassName(chip: ItemChip): string {
  if (chip.kind === "tag") return "tag-chip";
  let cls = "card-attribute";
  if (chip.kind === "error") cls += " attr-error";
  if (chip.kind === "success") cls += " attr-success";
  if (chip.kind === "info") cls += " attr-info";
  if (chip.kind === "warning") cls += " attr-warning";
  return cls;
}

/** Returns attribute chips (metadata) for an item — shared by all views */
export function getItemAttributeChips(
  item: RequirementItem,
  _warnings: TraceabilityWarning[],
  links: RequirementLink[]
): ItemChip[] {
  const chips: ItemChip[] = [];

  if (item.type === "UR") {
    if (item.reporter) chips.push({ label: item.reporter, kind: "default" });
  } else if (item.type === "SR") {
    if (item.priority === "R") chips.push({ label: "Priority Required", kind: "error" });
    else if (item.priority === "O") chips.push({ label: "Priority Optional", kind: "default" });
    const lc = getLinkCount(item, links);
    chips.push(
      lc > 0
        ? { label: `Links ${lc}`, kind: "info" }
        : { label: "No links", kind: "default" }
    );
  } else {
    if (item.owner) chips.push({ label: `Owner ${item.owner}`, kind: "default" });
    if (item.verificationStatus) {
      const v = item.verificationStatus.toLowerCase();
      let kind: ItemChip["kind"] = "default";
      if (v === "passed") kind = "success";
      else if (v === "failed" || v === "blocked") kind = "error";
      else if (v === "pending") kind = "warning";
      else if (v === "ready") kind = "info";

      // Capitalize first letter
      const labelText = item.verificationStatus.charAt(0).toUpperCase() + item.verificationStatus.slice(1);
      
      chips.push({ 
        label: labelText, 
        kind 
      });
    }
  }

  return chips;
}

/** Returns user-defined label chips */
export function getItemTagChips(item: RequirementItem): ItemChip[] {
  return (item.tags ?? []).map((tag) => ({ label: tag, kind: "tag" as const }));
}

/** @deprecated Use getItemAttributeChips instead */
export function getAttributeLabels(
  item: RequirementItem,
  warnings: TraceabilityWarning[],
  links: RequirementLink[]
): string[] {
  return getItemAttributeChips(item, warnings, links).map((c) => c.label);
}
