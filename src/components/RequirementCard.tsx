import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ItemEditFields,
  RequirementItem,
  RequirementPriority,
  RequirementReviewStatus,
  TraceabilityWarning,
} from "../domain/types";
import { getLabel } from "../domain/projectHelpers";
import { chipClassName, getItemAttributeChips, getItemTagChips, getStatusLabel } from "./reviewPresentation";
import { MarkdownView } from "./MarkdownView";
import { MarkdownEditor } from "./MarkdownEditor";
import { ChoiceOrAddField, LabelsField } from "./EditableChoiceFields";

type Props = {
  item: RequirementItem;
  warnings: TraceabilityWarning[];
  linkCount: number;
  labelOptions: string[];
  isSelected: boolean;
  isLinked: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (fields: ItemEditFields) => void;
  onCancelEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onAddCustomLabel: (label: string) => void;
};

const STATUS_OPTIONS: RequirementReviewStatus[] = [
  "stable",
  "approved",
  "needs review",
  "in review",
];

function StatusField({
  value,
  onChange,
}: {
  value: RequirementReviewStatus | undefined;
  onChange: (value: RequirementReviewStatus | undefined) => void;
}) {
  return (
    <div className="sr-field">
      <label className="sr-field-label">Status</label>
      <select
        className="sr-field-input"
        aria-label="Status"
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || undefined) as RequirementReviewStatus | undefined)}
      >
        <option value="">Auto</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
}



function CardAttributeRow({
  item,
  warnings,
  linkCount,
}: {
  item: RequirementItem;
  warnings: TraceabilityWarning[];
  linkCount: number;
}) {
  // Build a fake links array from linkCount to reuse shared helper
  const fakeLinks = Array.from({ length: linkCount }, (_, i) => ({
    id: `fake-${i}`, sourceId: item.id, targetId: "", type: "UR_TO_SR" as const, createdAt: "",
  }));
  const attrChips = getItemAttributeChips(item, warnings, fakeLinks);
  const tagChips = getItemTagChips(item);
  if (attrChips.length === 0 && tagChips.length === 0) return null;
  return (
    <div className="card-attribute-row">
      {attrChips.map((chip) => (
        <span key={chip.label} className={chipClassName(chip)}>{chip.label}</span>
      ))}
      {tagChips.map((chip) => (
        <span key={chip.label} className={chipClassName(chip)}>{chip.label}</span>
      ))}
    </div>
  );
}

// ── SR edit form ────────────────────────────────────────────────────────────

function SREditForm({
  item,
  labelOptions,
  onSave,
  onCancel,
  onAddCustomLabel,
}: {
  item: RequirementItem;
  labelOptions: string[];
  onSave: (fields: ItemEditFields) => void;
  onCancel: () => void;
  onAddCustomLabel: (label: string) => void;
}) {
  const [name, setName] = useState(item.name ?? "");
  const [customPrefix, setCustomPrefix] = useState(item.customPrefix ?? "");
  const [reviewStatus, setReviewStatus] = useState<RequirementReviewStatus | undefined>(item.reviewStatus);
  const [priority, setPriority] = useState<RequirementPriority | undefined>(item.priority);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(item.acceptanceCriteria ?? "");
  const [constraints, setConstraints] = useState(item.constraints ?? "");
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [content, setContent] = useState(item.content);

  function togglePriority(p: RequirementPriority) {
    setPriority((prev) => (prev === p ? undefined : p));
  }

  return (
    <div className="sr-edit-form" onKeyDown={(e) => e.stopPropagation()}>
      <div className="sr-field">
        <label className="sr-field-label">Name</label>
        <input
          className="sr-field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Domain (for ID)</label>
        <input
          className="sr-field-input"
          value={customPrefix}
          onChange={(e) => setCustomPrefix(e.target.value)}
          placeholder="e.g. ORD, AUTH"
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Description</label>
        <MarkdownEditor value={content} onChange={setContent} minRows={4} />
      </div>

      <StatusField value={reviewStatus} onChange={setReviewStatus} />

      <div className="sr-field">
        <label className="sr-field-label">Priority</label>
        <div className="priority-group">
          <button
            type="button"
            className={`priority-btn ${priority === "R" ? "active-r" : ""}`}
            onClick={() => togglePriority("R")}
            title="Required"
          >
            Required
          </button>
          <button
            type="button"
            className={`priority-btn ${priority === "O" ? "active-o" : ""}`}
            onClick={() => togglePriority("O")}
            title="Optional"
          >
            Optional
          </button>
        </div>
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Acceptance Criteria</label>
        <MarkdownEditor value={acceptanceCriteria} onChange={setAcceptanceCriteria} minRows={3} />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Constraints / Notes</label>
        <MarkdownEditor value={constraints} onChange={setConstraints} minRows={2} />
      </div>

      <LabelsField value={tags} options={labelOptions} onChange={setTags} onAddCustom={onAddCustomLabel} />

      <div className="card-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            onSave({
              content,
              name: name.trim() || undefined,
              customPrefix: customPrefix.trim() || undefined,
              reviewStatus,
              priority,
              acceptanceCriteria: acceptanceCriteria.trim() || undefined,
              constraints: constraints.trim() || undefined,
              tags: tags.length > 0 ? tags : undefined,
            })
          }
          disabled={!content.trim()}
        >
          Save
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function GeneralEditForm({
  item,
  labelOptions,
  onSave,
  onCancel,
  onAddCustomLabel,
}: {
  item: RequirementItem;
  labelOptions: string[];
  onSave: (fields: ItemEditFields) => void;
  onCancel: () => void;
  onAddCustomLabel: (label: string) => void;
}) {
  const [content, setContent] = useState(item.content);
  const [name, setName] = useState(item.name ?? "");
  const [customPrefix, setCustomPrefix] = useState(item.customPrefix ?? "");
  const [reviewStatus, setReviewStatus] = useState<RequirementReviewStatus | undefined>(item.reviewStatus);
  const [reporter, setReporter] = useState(item.reporter ?? "");
  const [owner, setOwner] = useState(item.owner ?? "");
  const [verificationStatus, setVerificationStatus] = useState(item.verificationStatus ?? "");
  const [tags, setTags] = useState<string[]>(item.tags ?? []);

  return (
    <div className="sr-edit-form" onKeyDown={(e) => e.stopPropagation()}>
      <div className="sr-field">
        <label className="sr-field-label">Name</label>
        <input
          className="sr-field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Domain (for ID)</label>
        <input
          className="sr-field-input"
          value={customPrefix}
          onChange={(e) => setCustomPrefix(e.target.value)}
          placeholder="e.g. ORD, AUTH"
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Description</label>
        <MarkdownEditor value={content} onChange={setContent} minRows={4} />
      </div>

      <StatusField value={reviewStatus} onChange={setReviewStatus} />

      {item.type === "UR" && (
        <div className="sr-field">
          <label className="sr-field-label">Reporter</label>
          <input
            className="sr-field-input"
            value={reporter}
            onChange={(e) => setReporter(e.target.value)}
          />
        </div>
      )}

      {item.type === "FEATURE" && (
        <>
          <div className="sr-field">
            <label className="sr-field-label">Owner</label>
            <input
              className="sr-field-input"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <ChoiceOrAddField
            label="Verification"
            value={verificationStatus}
            onChange={setVerificationStatus}
          />
        </>
      )}

      <LabelsField value={tags} options={labelOptions} onChange={setTags} onAddCustom={onAddCustomLabel} />

      <div className="card-actions">
        <button
          className="btn btn-primary"
          onClick={() =>
            onSave({
              content,
              name: name.trim() || undefined,
              customPrefix: customPrefix.trim() || undefined,
              reviewStatus,
              reporter: reporter.trim() || undefined,
              owner: owner.trim() || undefined,
              verificationStatus: verificationStatus.trim() || undefined,
              tags: tags.length > 0 ? tags : undefined,
            })
          }
          disabled={!content.trim()}
        >
          Save
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── SR view ─────────────────────────────────────────────────────────────────

function SRView({ item }: { item: RequirementItem }) {
  return (
    <>
      {item.name && <div className="sr-name">{item.name}</div>}
      <div className="card-content">
        <MarkdownView content={item.content} />
      </div>
      {item.acceptanceCriteria && (
        <div className="sr-review-block">
          <div className="sr-review-block-title">Acceptance Criteria</div>
          <MarkdownView content={item.acceptanceCriteria} />
        </div>
      )}
      {item.constraints && (
        <div className="sr-review-block">
          <div className="sr-review-block-title">Constraints / Notes</div>
          <MarkdownView content={item.constraints} />
        </div>
      )}

    </>
  );
}

// ── Main card component ──────────────────────────────────────────────────────

export function RequirementCard({
  item,
  warnings,
  linkCount,
  labelOptions,
  isSelected,
  isLinked,
  isEditing,
  isConfirmingDelete,
  onSelect,
  onEdit,
  onSave,
  onCancelEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onAddCustomLabel,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isEditing || isConfirmingDelete,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  const label = getLabel(item);
  const hasWarning = warnings.length > 0;
  const isSR = item.type === "SR";
  const status = getStatusLabel(item, warnings);

  const cls = [
    "card",
    isSelected ? "selected" : "",
    isLinked ? "linked-highlight" : "",
    hasWarning ? "has-warning" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── Editing state ──────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className={cls} style={style} ref={setNodeRef} role="article" aria-label={label} data-item-id={item.id}>
        <div className="card-header">
          <span className="card-label">{label}</span>
        </div>
        {isSR ? (
          <SREditForm item={item} labelOptions={labelOptions} onSave={onSave} onCancel={onCancelEdit} onAddCustomLabel={onAddCustomLabel} />
        ) : (
          <GeneralEditForm item={item} labelOptions={labelOptions} onSave={onSave} onCancel={onCancelEdit} onAddCustomLabel={onAddCustomLabel} />
        )}
      </div>
    );
  }

  // ── Confirm delete state ───────────────────────────────────────────────────
  if (isConfirmingDelete) {
    return (
      <div className={cls} style={style} ref={setNodeRef} role="article" aria-label={label} data-item-id={item.id}>
        <div className="card-header">
          <span className="card-label">{label}</span>
        </div>
        <div className="card-content">
          <MarkdownView content={item.content} />
        </div>
        <div className="card-confirm">Delete {label}?</div>
        <div className="card-confirm-actions">
          <button className="btn btn-danger" onClick={onConfirmDelete}>Delete</button>
          <button className="btn btn-ghost" onClick={onCancelDelete}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── Normal view ────────────────────────────────────────────────────────────
  return (
    <div
      className={cls}
      style={style}
      ref={setNodeRef}
      onClick={onSelect}
      role="article"
      aria-label={label}
      aria-selected={isSelected}
      data-item-id={item.id}
    >
      <div className="card-header">
        <span
          className="drag-handle"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          aria-label={`Drag ${label} to reorder`}
        >
          ⠿
        </span>
        <span className="item-label">{label}</span>
        <span className={`item-status ${status === "needs review" ? "warning" : ""}`} style={{ marginLeft: "auto", flexShrink: 0 }}>{status}</span>
        <div className="card-badges">
          {linkCount > 0 && (
            <span className="badge badge-link" title={`${linkCount} link${linkCount !== 1 ? "s" : ""}`}>
              {linkCount}
            </span>
          )}
          {hasWarning && (
            <span className="badge badge-warning" title={warnings.map((w) => w.code).join(", ")}>
              !
            </span>
          )}
        </div>
      </div>
      <CardAttributeRow item={item} warnings={warnings} linkCount={linkCount} />

      {isSR ? (
        <SRView item={item} />
      ) : (
        <div className="card-content">
          <MarkdownView content={item.content} />
        </div>
      )}

      <div className="card-actions">
        <button
          className="btn btn-ghost"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label={`Edit ${label}`}
        >
          Edit
        </button>
        <button
          className="btn btn-ghost"
          onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
          aria-label={`Delete ${label}`}
          style={{ color: "var(--error)" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
