import { useState } from "react";
import type { RequirementItem, RequirementLink, RequirementType, TraceabilityWarning } from "../domain/types";
import { getLabel } from "../domain/projectHelpers";
import {
  chipClassName,
  getItemAttributeChips,
  getItemTagChips,
  getItemSummary,
  getItemTitle,
  getStatusLabel,
} from "./reviewPresentation";

type Props = {
  items: RequirementItem[];
  warnings: TraceabilityWarning[];
  links: RequirementLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const GROUPS: Array<{ type: RequirementType; label: string }> = [
  { type: "UR", label: "UR" },
  { type: "SR", label: "SR" },
  { type: "FEATURE", label: "Feature" },
];

export function DocumentOutline({ items, warnings, links, selectedId, onSelect }: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<RequirementType>>(new Set());

  function toggleGroup(type: RequirementType) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  return (
    <nav className="document-outline" aria-label="Document outline">
      <div className="workspace-panel-header">
        <h2 className="workspace-panel-title">Document Outline</h2>
        <span className="workspace-panel-count">{items.length} items</span>
      </div>

      {GROUPS.map(({ type, label }) => {
        const groupItems = items.filter((item) => item.type === type);
        const isCollapsed = collapsedGroups.has(type);
        return (
          <section className="outline-group" key={type} aria-labelledby={`outline-${type}`}>
            <button
              type="button"
              className="outline-group-header"
              onClick={() => toggleGroup(type)}
              aria-label={`Toggle ${label} category`}
              aria-expanded={!isCollapsed}
              aria-controls={`outline-${type}-items`}
            >
              <span className="outline-group-title-wrap">
                <span className={`outline-group-chevron ${isCollapsed ? "collapsed" : ""}`} aria-hidden="true">
                  ▾
                </span>
                <h3 id={`outline-${type}`}>{label}</h3>
              </span>
              <span className="outline-group-count">{groupItems.length}</span>
            </button>

            {!isCollapsed && (
              <div id={`outline-${type}-items`}>
                {groupItems.length === 0 ? (
                  <div className="outline-empty">No {label} items</div>
                ) : (
                  groupItems.map((item) => {
                    const status = getStatusLabel(item, warnings);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`outline-card ${selectedId === item.id ? "selected" : ""}`}
                        onClick={() => onSelect(item.id)}
                        aria-label={`Select ${getLabel(item)}`}
                      >
                        <span className="outline-card-top">
                          <span className="item-label">
                            {getLabel(item)}
                          </span>
                          <span className={`item-status ${status === "needs review" ? "warning" : ""}`}>
                            {status}
                          </span>
                        </span>
                        <span className="outline-card-title">{getItemTitle(item)}</span>
                        <span className="outline-attributes">
                          {getItemAttributeChips(item, warnings, links).map((chip) => (
                            <span className={chipClassName(chip)} key={chip.label}>
                              {chip.label}
                            </span>
                          ))}
                          {getItemTagChips(item).map((chip) => (
                            <span className={chipClassName(chip)} key={chip.label}>
                              {chip.label}
                            </span>
                          ))}
                        </span>
                        <span className="outline-summary">{getItemSummary(item)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </section>
        );
      })}
    </nav>
  );
}
