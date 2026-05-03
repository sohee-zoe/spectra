import { useState, useRef, useEffect, useCallback } from "react";
import type {
  RequirementItem,
  RequirementLink,
  RequirementLinkType,
  TraceabilityWarning,
} from "../domain/types";
import { LinkEditor } from "./LinkEditor";

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
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
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
      aria-label="Traceability panel"
      style={{ width: `${width}px` }}
    >
      <div 
        className="panel-resizer" 
        onMouseDown={startResizing} 
      />
      <div className="panel-section" style={{ maxHeight: "40%", flex: "0 0 auto" }}>
        <div className="panel-section-header">
          <span>Warnings</span>
          {warnings.length > 0 && (
            <span className="warning-badge">{warnings.length}</span>
          )}
        </div>
        <div className="panel-section-body">
          {warnings.length === 0 ? (
            <div className="no-warnings">No traceability warnings</div>
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
          <span>Links</span>
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
            <div className="no-selection">Select an item to manage links</div>
          )}
        </div>
      </div>
    </aside>
  );
}
