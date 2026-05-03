import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ItemEditFields,
  RequirementItem,
  RequirementPriority,
  TraceabilityWarning,
} from "../domain/types";
import { getLabel } from "../domain/projectHelpers";

type Props = {
  item: RequirementItem;
  warnings: TraceabilityWarning[];
  linkCount: number;
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
};

function parseTagsInput(value: string): string[] | undefined {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

function formatTagsInput(tags?: string[]): string {
  return tags?.join(", ") ?? "";
}

function TagChips({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
        </span>
      ))}
    </div>
  );
}

// ── SR edit form ────────────────────────────────────────────────────────────

function SREditForm({
  item,
  onSave,
  onCancel,
}: {
  item: RequirementItem;
  onSave: (fields: ItemEditFields) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name ?? "");
  const [priority, setPriority] = useState<RequirementPriority | undefined>(item.priority);
  const [protocol, setProtocol] = useState(item.protocol ?? "");
  const [dataFormat, setDataFormat] = useState(item.dataFormat ?? "");
  const [payload, setPayload] = useState(item.payload ?? "");
  const [tags, setTags] = useState(formatTagsInput(item.tags));
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
          placeholder="System Requirement Name"
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Description</label>
        <textarea
          className="card-edit-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
          placeholder="상세 설명"
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
            R
          </button>
          <button
            type="button"
            className={`priority-btn ${priority === "O" ? "active-o" : ""}`}
            onClick={() => togglePriority("O")}
            title="Optional"
          >
            O
          </button>
        </div>
      </div>

      <div className="sr-field-row">
        <div className="sr-field sr-field-half">
          <label className="sr-field-label">Protocol</label>
          <input
            className="sr-field-input"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            placeholder="REST, gRPC, WebSocket…"
          />
        </div>
        <div className="sr-field sr-field-half">
          <label className="sr-field-label">Data Format</label>
          <input
            className="sr-field-input"
            value={dataFormat}
            onChange={(e) => setDataFormat(e.target.value)}
            placeholder="JSON, Protobuf, XML…"
          />
        </div>
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Tags</label>
        <input
          className="sr-field-input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="auth, security, mvp"
        />
      </div>

      <div className="sr-field">
        <label className="sr-field-label">Payload / Schema</label>
        <textarea
          className="sr-field-input"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="데이터 스키마나 페이로드 설명..."
          rows={2}
          style={{ resize: "vertical", fontFamily: "monospace", fontSize: "17px" }}
        />
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            onSave({
              content,
              name: name.trim() || undefined,
              priority,
              protocol: protocol.trim() || undefined,
              dataFormat: dataFormat.trim() || undefined,
              payload: payload.trim() || undefined,
              tags: parseTagsInput(tags),
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

// ── SR view ─────────────────────────────────────────────────────────────────

function SRView({ item }: { item: RequirementItem }) {
  return (
    <>
      {item.name && <div className="sr-name">{item.name}</div>}
      <div className="card-content">{item.content}</div>
      {(item.protocol || item.dataFormat) && (
        <div className="sr-meta-row">
          {item.protocol && (
            <span className="sr-tag sr-tag-protocol" title="Protocol">
              ⇄ {item.protocol}
            </span>
          )}
          {item.dataFormat && (
            <span className="sr-tag sr-tag-format" title="Data Format">
              &#123;&#125; {item.dataFormat}
            </span>
          )}
        </div>
      )}
      {item.payload && (
        <div className="sr-payload">
          {item.payload}
        </div>
      )}
      <TagChips tags={item.tags} />
    </>
  );
}

// ── Main card component ──────────────────────────────────────────────────────

export function RequirementCard({
  item,
  warnings,
  linkCount,
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
}: Props) {
  const [draft, setDraft] = useState(item.content);
  const [tagDraft, setTagDraft] = useState(formatTagsInput(item.tags));

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

  useEffect(() => {
    if (isEditing) {
      setDraft(item.content);
      setTagDraft(formatTagsInput(item.tags));
    }
  }, [isEditing, item.content, item.tags]);

  const label = getLabel(item);
  const hasWarning = warnings.length > 0;
  const isSR = item.type === "SR";

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
          <SREditForm item={item} onSave={onSave} onCancel={onCancelEdit} />
        ) : (
          <>
            <textarea
              className="card-edit-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              aria-label={`Edit ${label}`}
            />
            <div className="sr-field">
              <label className="sr-field-label">Tags</label>
              <input
                className="sr-field-input"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder="auth, security, mvp"
              />
            </div>
            <div className="card-actions">
              <button
                className="btn btn-primary"
                onClick={() => onSave({ content: draft, tags: parseTagsInput(tagDraft) })}
                disabled={!draft.trim()}
              >
                Save
              </button>
              <button className="btn btn-ghost" onClick={onCancelEdit}>
                Cancel
              </button>
            </div>
          </>
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
        <div className="card-content">{item.content}</div>
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
        <span className="card-label">{label}</span>
        {isSR && item.priority && (
          <span className={`priority-badge priority-${item.priority.toLowerCase()}`} title={item.priority === "R" ? "Required" : "Optional"}>
            {item.priority}
          </span>
        )}
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

      {isSR ? (
        <SRView item={item} />
      ) : (
        <>
          <div className="card-content">{item.content}</div>
          <TagChips tags={item.tags} />
        </>
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
