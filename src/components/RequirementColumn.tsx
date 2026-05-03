import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type {
  ItemEditFields,
  RequirementItem,
  RequirementLink,
  RequirementPriority,
  RequirementType,
  TraceabilityWarning,
} from "../domain/types";
import { RequirementCard } from "./RequirementCard";

type Props = {
  type: RequirementType;
  items: RequirementItem[];
  warnings: TraceabilityWarning[];
  links: RequirementLink[];
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
};

const TYPE_LABELS: Record<RequirementType, string> = {
  UR: "UR",
  SR: "SR",
  FEATURE: "Feature",
};

function parseTagsInput(value: string): string[] | undefined {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

// ── SR Add Form ─────────────────────────────────────────────────────────────

function SRAddForm({
  onAdd,
  onCancel,
}: {
  onAdd: (fields: ItemEditFields) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<RequirementPriority | undefined>(undefined);
  const [protocol, setProtocol] = useState("");
  const [dataFormat, setDataFormat] = useState("");
  const [payload, setPayload] = useState("");
  const [tags, setTags] = useState("");
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
          placeholder="SR 이름"
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

      <div className="sr-field">
        <label className="sr-field-label">Description</label>
        <textarea
          className="add-form-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="SR 상세 설명…"
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
              priority,
              protocol: protocol.trim() || undefined,
              dataFormat: dataFormat.trim() || undefined,
              payload: payload.trim() || undefined,
              tags: parseTagsInput(tags),
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

// ── Column ───────────────────────────────────────────────────────────────────

export function RequirementColumn({
  type,
  items,
  warnings,
  links,
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
}: Props) {
  const [draft, setDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  const typeItems = items.filter((i) => i.type === type);
  const label = TYPE_LABELS[type];

  function getLinkCount(itemId: string): number {
    return links.filter((l) => l.sourceId === itemId || l.targetId === itemId).length;
  }

  function getItemWarnings(itemId: string): TraceabilityWarning[] {
    return warnings.filter((w) => w.itemId === itemId);
  }

  function handleAdd() {
    if (!draft.trim()) return;
    onAdd({ content: draft, tags: parseTagsInput(tagDraft) });
    setDraft("");
    setTagDraft("");
  }

  function handleCancelAdd() {
    setDraft("");
    setTagDraft("");
    onCancelAdd();
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
            />
          ))}
        </SortableContext>

        {/* SR gets full structured form; UR/FEATURE get simple textarea */}
        {isAdding && type === "SR" && (
          <SRAddForm onAdd={onAdd} onCancel={onCancelAdd} />
        )}

        {isAdding && type !== "SR" && (
          <div className="add-form">
            <textarea
              className="add-form-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Enter ${label} content…`}
              autoFocus
              aria-label={`New ${label} content`}
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
            <div className="add-form-actions">
              <button className="btn btn-ghost" onClick={handleCancelAdd}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={!draft.trim()}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
