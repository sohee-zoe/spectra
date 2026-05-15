import { useState, useRef, useEffect, useCallback } from "react";
import type {
  RequirementItem,
  RequirementLink,
  RequirementLinkType,
  TraceabilityWarning,
} from "../domain/types";
import { LinkEditor } from "./LinkEditor";
import { MarkdownView } from "./MarkdownView";
import {
  chipClassName,
  getItemAttributeChips,
  getItemTagChips,
  getItemTitle,
  getStatusLabel,
} from "./reviewPresentation";
import { getLabel } from "../domain/projectHelpers";

type Props = {
  warnings: TraceabilityWarning[];
  selectedItem: RequirementItem | null;
  allItems: RequirementItem[];
  links: RequirementLink[];
  onWarningClick: (itemId: string) => void;
  onAddLink: (type: RequirementLinkType, sourceId: string, targetId: string) => void;
  onRemoveLink: (linkId: string) => void;
};

const WARNING_MESSAGES: Record<string, string> = {
  UR_WITHOUT_SR: "No linked SR",
  SR_WITHOUT_UR: "No linked UR",
  SR_WITHOUT_FEATURE: "No linked Feature",
  FEATURE_WITHOUT_SR: "No linked SR",
};

export function RightPanel({
  warnings,
  selectedItem,
  allItems,
  links,
  onWarningClick,
  onAddLink,
  onRemoveLink,
}: Props) {
  const [width, setWidth] = useState(480); // Scaled default (320 * 1.5)
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    Object.assign(document.body.style, { cursor: "ew-resize", userSelect: "none" });
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    Object.assign(document.body.style, { cursor: "", userSelect: "" });
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 1200) {
        setWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <aside 
      className="right-panel" 
      aria-label="Document detail"
      style={{ width: `${width}px` }}
    >
      <div
        className="panel-resizer"
        onMouseDown={startResizing}
        role="separator"
        aria-label="Resize document detail"
        aria-orientation="vertical"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setWidth((w) => Math.min(w + 16, 1200));
          if (e.key === "ArrowRight") setWidth((w) => Math.max(w - 16, 300));
        }}
      />
      <div className="panel-section document-detail-section" style={{ flex: "0 0 auto" }}>
        <div className="workspace-panel-header panel-section-header document-detail-header" style={{ gap: 8 }}>
          <h2 className="workspace-panel-title" style={{ flex: 1 }}>Document Detail</h2>
          {selectedItem && <span className={`item-status ${getStatusLabel(selectedItem, warnings) === 'needs review' ? 'warning' : ''}`}>{getStatusLabel(selectedItem, warnings)}</span>}
        </div>
        <div className="panel-section-body">
          {selectedItem ? (
            <div className="detail-card">
              <div className="item-label" style={{ marginBottom: 4 }}>{getLabel(selectedItem)}</div>
              <h2>{getItemTitle(selectedItem)}</h2>
              <div className="detail-attributes">
                {getItemAttributeChips(selectedItem, warnings, links).map((chip) => (
                  <span key={chip.label} className={chipClassName(chip)}>{chip.label}</span>
                ))}
              </div>
              <div className="detail-field">
                <span className="detail-field-label">Description</span>
                <MarkdownView content={selectedItem.content} />
              </div>
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="detail-tags">
                  {getItemTagChips(selectedItem).map((chip) => (
                    <span key={chip.label} className={chipClassName(chip)}>{chip.label}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-selection">Select an item to review document detail</div>
          )}
        </div>
      </div>

      <div className="panel-section" style={{ maxHeight: "30%", flex: "0 0 auto" }}>
        <div className="panel-section-header">
          <span>Review Issues</span>
          {warnings.length > 0 && (
            <span className="warning-badge">{warnings.length}</span>
          )}
        </div>
        <div className="panel-section-body">
          {warnings.length === 0 ? (
            <div className="no-warnings">No review issues</div>
          ) : (
            warnings.map((w) => (
              <div
                key={`${w.code}-${w.itemId}`}
                className="warning-row"
                onClick={() => onWarningClick(w.itemId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onWarningClick(w.itemId)}
                aria-label={`${w.label}: ${WARNING_MESSAGES[w.code]}`}
              >
                <span className="warning-icon" aria-hidden="true">⚠</span>
                <span className="warning-label-chip">{w.label}</span>
                <span className="warning-text">{WARNING_MESSAGES[w.code]}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <span>Trace Links</span>
        </div>
        <div className="panel-section-body">
          {selectedItem ? (
            <LinkEditor
              selectedItem={selectedItem}
              allItems={allItems}
              links={links}
              onAddLink={onAddLink}
              onRemoveLink={onRemoveLink}
            />
          ) : (
            <div className="no-selection">Select an item to manage trace links</div>
          )}
        </div>
      </div>
    </aside>
  );
}
