import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type {
  ItemEditFields,
  RequirementItem,
  RequirementLink,
  RequirementPriority,
  RequirementReviewStatus,
  RequirementType,
  TraceabilityWarning,
} from "../domain/types";
import { RequirementCard } from "./RequirementCard";
import { ChoiceOrAddField, LabelsField } from "./EditableChoiceFields";

type Props = {
  type: RequirementType;
  items: RequirementItem[];
  warnings: TraceabilityWarning[];
  links: RequirementLink[];
  labelOptions: string[];
  selectedId: string | null;
  connectedIds: Set<string>;
  editingId: string | null;
  confirmDeleteId: string | null;
  isAdding: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onSave: (id: string, fields: ItemEditFields) => void;
  onCancelEdit: () => void;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onStartAdd: () => void;
  onAdd: (fields: ItemEditFields) => void;
  onCancelAdd: () => void;
  onAddCustomLabel: (label: string) => void;
};

const TYPE_LABELS: Record<RequirementType, string> = {
  UR: "UR",
  SR: "SR",
  FEATURE: "Feature",
};

const STATUS_OPTIONS: RequirementReviewStatus[] = [
  "stable",
  "approved",
  "needs review",
  "in review",
];

// ── SR Add Form ─────────────────────────────────────────────────────────────

function SRAddForm({
  labelOptions,
  onAdd,
  onCancel,
  onAddCustomLabel,
}: {
  labelOptions: string[];
  onAdd: (fields: ItemEditFields) => void;
  onCancel: () => void;
  onAddCustomLabel: (label: string) => void;
}) {
  const [name, setName] = useState("");
  const [reviewStatus, setReviewStatus] = useState<RequirementReviewStatus | undefined>("approved");
  const [priority, setPriority] = useState<RequirementPriority | undefined>(undefined);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [constraints, setConstraints] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState("");

  function togglePriority(p: RequirementPriority) {
    setPriority((prev) => (prev === p ? undefined : p));
  }

  return (
    <div className="add-form sr-edit-form">
      <div className="sr-field">
        <label className="sr-field-label">Name</label>
        <input
          className="sr-field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

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
        <label className="sr-field-label">Status</label>
        <select
          className="sr-field-input"
          aria-label="Status"
          value={reviewStatus ?? ""}
          onChange={(e) => setReviewStatus((e.target.value || undefined) as RequirementReviewStatus | undefined)}
        >
          <option value="">Auto</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Acceptance Criteria</label>
        <textarea
          className="sr-field-input"
          value={acceptanceCriteria}
          onChange={(e) => setAcceptanceCriteria(e.target.value)}
          rows={3}
          style={{ resize: "vertical" }}
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Constraints / Notes</label>
        <textarea
          className="sr-field-input"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          rows={2}
          style={{ resize: "vertical" }}
        />
      </div>

      <LabelsField value={tags} options={labelOptions} onChange={setTags} onAddCustom={onAddCustomLabel} />

      <div className="sr-field">
        <label className="sr-field-label">Description</label>
        <textarea
          className="add-form-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="New SR description"
        />
      </div>

      <div className="add-form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            onAdd({
              content,
              name: name.trim() || undefined,
              reviewStatus,
              priority,
              acceptanceCriteria: acceptanceCriteria.trim() || undefined,
              constraints: constraints.trim() || undefined,
              tags: tags.length > 0 ? tags : undefined,
            })
          }
          disabled={!content.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function GeneralAddForm({
  type,
  label,
  labelOptions,
  onAdd,
  onCancel,
  onAddCustomLabel,
}: {
  type: Exclude<RequirementType, "SR">;
  label: string;
  labelOptions: string[];
  onAdd: (fields: ItemEditFields) => void;
  onCancel: () => void;
  onAddCustomLabel: (label: string) => void;
}) {
  const [name, setName] = useState("");
  const [reviewStatus, setReviewStatus] = useState<RequirementReviewStatus | undefined>(
    type === "UR" ? "stable" : "in review"
  );
  const [reporter, setReporter] = useState("");
  const [owner, setOwner] = useState("");
  const [verificationStatus, setVerificationStatus] = useState(type === "FEATURE" ? "pending" : "");
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState("");

  function handleAdd() {
    if (!content.trim()) return;
    onAdd({
      content,
      name: name.trim() || undefined,
      reviewStatus,
      reporter: reporter.trim() || undefined,
      owner: owner.trim() || undefined,
      verificationStatus: verificationStatus.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return (
    <div className="add-form sr-edit-form">
      <div className="sr-field">
        <label className="sr-field-label">Name</label>
        <input
          className="sr-field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Description</label>
        <textarea
          className="add-form-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label={`New ${label} content`}
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Status</label>
        <select
          className="sr-field-input"
          aria-label="Status"
          value={reviewStatus ?? ""}
          onChange={(e) => setReviewStatus((e.target.value || undefined) as RequirementReviewStatus | undefined)}
        >
          <option value="">Auto</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {type === "UR" && (
        <div className="sr-field">
          <label className="sr-field-label">Reporter</label>
          <input
            className="sr-field-input"
            value={reporter}
            onChange={(e) => setReporter(e.target.value)}
          />
        </div>
      )}

      {type === "FEATURE" && (
        <div className="sr-field-row">
          <div className="sr-field sr-field-half">
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
        </div>
      )}

      <LabelsField value={tags} options={labelOptions} onChange={setTags} onAddCustom={onAddCustomLabel} />

      <div className="add-form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={!content.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────

export function RequirementColumn({
  type,
  items,
  warnings,
  links,
  labelOptions,
  selectedId,
  connectedIds,
  editingId,
  confirmDeleteId,
  isAdding,
  onSelect,
  onEdit,
  onSave,
  onCancelEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onStartAdd,
  onAdd,
  onCancelAdd,
  onAddCustomLabel,
}: Props) {
  const typeItems = items.filter((i) => i.type === type);
  const label = TYPE_LABELS[type];

  function getLinkCount(itemId: string): number {
    return links.filter((l) => l.sourceId === itemId || l.targetId === itemId).length;
  }

  function getItemWarnings(itemId: string): TraceabilityWarning[] {
    return warnings.filter((w) => w.itemId === itemId);
  }

  return (
    <section className="column" aria-label={`${label} column`}>
      <div className="column-header">
        <span className="column-title">{label}</span>
        <span className="column-count">{typeItems.length}</span>
        <button
          className="btn btn-ghost"
          onClick={onStartAdd}
          disabled={isAdding}
          aria-label={`Add ${label}`}
        >
          + Add
        </button>
      </div>

      <div className="column-body">
        {typeItems.length === 0 && !isAdding && (
          <div className="empty-state">No {label} items</div>
        )}

        <SortableContext
          items={typeItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {typeItems.map((item) => (
            <RequirementCard
              key={item.id}
              item={item}
              warnings={getItemWarnings(item.id)}
              linkCount={getLinkCount(item.id)}
              labelOptions={labelOptions}
              isSelected={selectedId === item.id}
              isLinked={connectedIds.has(item.id)}
              isEditing={editingId === item.id}
              isConfirmingDelete={confirmDeleteId === item.id}
              onSelect={() => onSelect(item.id)}
              onEdit={() => onEdit(item.id)}
              onSave={(fields) => onSave(item.id, fields)}
              onCancelEdit={onCancelEdit}
              onRequestDelete={() => onRequestDelete(item.id)}
              onConfirmDelete={() => onConfirmDelete(item.id)}
              onCancelDelete={onCancelDelete}
              onAddCustomLabel={onAddCustomLabel}
            />
          ))}
        </SortableContext>

        {/* SR gets full structured form; UR/FEATURE get simple textarea */}
        {isAdding && type === "SR" && (
          <SRAddForm labelOptions={labelOptions} onAdd={onAdd} onCancel={onCancelAdd} onAddCustomLabel={onAddCustomLabel} />
        )}

        {isAdding && type !== "SR" && (
          <GeneralAddForm
            type={type}
            label={label}
            labelOptions={labelOptions}
            onAdd={onAdd}
            onCancel={onCancelAdd}
            onAddCustomLabel={onAddCustomLabel}
          />
        )}
      </div>
    </section>
  );
}
