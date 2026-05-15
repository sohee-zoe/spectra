import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import "./App.css";
import type {
  ItemEditFields,
  ProjectData,
  RequirementLinkType,
  RequirementType,
} from "./domain/types";
import {
  createItem,
  updateItemFields,
  deleteItem,
  reorderItem,
  addLink,
  removeLink,
  validateTraceability,
  getLabel,
} from "./domain/projectHelpers";
import { TopBar } from "./components/TopBar";
import { RequirementColumn } from "./components/RequirementColumn";
import { RightPanel } from "./components/RightPanel";
import { GraphView } from "./components/GraphView";
import { DocumentOutline } from "./components/DocumentOutline";
import { DEFAULT_LABEL_OPTIONS } from "./components/EditableChoiceFields";
import {
  exportYaml,
  exportMarkdown,
  importYamlFile,
  validateProjectData,
} from "./export";
import type { ImportResult } from "./export";

// ── Local Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY = "spectra.requirements.v1";

function emptyProject(): ProjectData {
  return {
    project: {
      id: crypto.randomUUID(),
      name: "새 프로젝트",
      version: "1.0.0",
      updatedAt: new Date().toISOString(),
    },
    items: [],
    links: [],
  };
}

function loadFromStorage(): ProjectData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProjectData;
      const validated = validateProjectData(parsed);
      if (validated.ok) {
        return validated.data;
      }
    }
  } catch {
    // Corrupt data — fall through to empty project
  }
  return emptyProject();
}

// ── UI state types ─────────────────────────────────────────────────────────

type AddingState = { type: RequirementType } | null;
type EditingState = { id: string } | null;
type ConfirmDeleteState = { id: string } | null;

const COLUMNS: RequirementType[] = ["UR", "SR", "FEATURE"];

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  const [data, setData] = useState<ProjectData>(loadFromStorage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null);
  const [adding, setAdding] = useState<AddingState>(null);
  const [storageError, setStorageError] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarningOnly, setFilterWarningOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const [outlineWidth, setOutlineWidth] = useState(320);
  const isResizingOutline = useRef(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("spectra.theme") as "dark" | "light") || "dark";
  });
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("spectra.theme", theme);
  }, [theme]);

  // ── Persist to LocalStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
      setLastSaved(new Date().toISOString());
    } catch {
      setStorageError(true);
    }
  }, [data]);

  // ── Warnings ──────────────────────────────────────────────────────────────
  const warnings = useMemo(() => validateTraceability(data), [data]);

  // ── Extra label options (custom labels added during editing sessions) ──────
  const [extraLabelOptions, setExtraLabelOptions] = useState<string[]>([]);

  const labelOptions = useMemo(() => {
    const options = new Set([...DEFAULT_LABEL_OPTIONS, ...extraLabelOptions]);
    for (const item of data.items) {
      for (const tag of item.tags ?? []) {
        options.add(tag);
      }
    }
    return Array.from(options).sort();
  }, [data.items, extraLabelOptions]);

  const handleAddCustomLabel = useCallback((label: string) => {
    setExtraLabelOptions((prev) => {
      const norm = label.trim().toLowerCase();
      return prev.includes(norm) ? prev : [...prev, norm];
    });
  }, []);

  // ── Clear selection on filter changes ─────────────────────────────────────
  useEffect(() => {
    setSelectedId(null);
    setEditing(null);
    setConfirmDelete(null);
  }, [searchQuery, filterWarningOnly]);

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeItem = data.items.find((i) => i.id === active.id);
    if (!activeItem) return;
    const typeItems = data.items.filter((i) => i.type === activeItem.type);
    const overIndex = typeItems.findIndex((i) => i.id === over.id);
    if (overIndex === -1) return;
    setData((d) => reorderItem(d, active.id as string, overIndex));
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function handleSelect(id: string | null) {
    if (id === null) {
      setSelectedId(null);
    } else {
      setSelectedId((prev) => (prev === id ? null : id));
    }
    setEditing(null);
    setConfirmDelete(null);
  }

  function handleWorkspaceClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("workspace") ||
      target.classList.contains("columns") ||
      target.classList.contains("column") ||
      target.classList.contains("column-body")
    ) {
      handleSelect(null);
    }
  }

  const startResizingOutline = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isResizingOutline.current = true;
    Object.assign(document.body.style, { cursor: "col-resize", userSelect: "none" });
  }, []);

  const resizeOutlineRef = useRef((event: MouseEvent) => {
    if (!isResizingOutline.current || !workspaceRef.current) return;
    const workspaceLeft = workspaceRef.current.getBoundingClientRect().left;
    const nextWidth = event.clientX - workspaceLeft;
    setOutlineWidth(Math.min(Math.max(nextWidth, 240), 520));
  });

  useEffect(() => {
    const onMove = (event: MouseEvent) => resizeOutlineRef.current(event);
    const onUp = () => {
      isResizingOutline.current = false;
      Object.assign(document.body.style, { cursor: "", userSelect: "" });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const dataItemsRef = useRef(data.items);
  useEffect(() => { dataItemsRef.current = data.items; });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dataItemsRef.current.length === 0) return;
      e.preventDefault();
      e.returnValue = '';
      // setTimeout fires after native dialog closes (JS is blocked during dialog).
      // If user clicks Leave, page unloads and this never runs.
      setTimeout(() => setShowExitModal(true), 0);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Add ───────────────────────────────────────────────────────────────────
  function handleStartAdd(type: RequirementType) {
    setAdding({ type });
    setEditing(null);
    setConfirmDelete(null);
    setSelectedId(null);
  }

  function handleAdd(fields: ItemEditFields) {
    if (!adding) return;
    const { content, ...extra } = fields;
    setData((d) => createItem(d, adding.type, content, extra));
    setAdding(null);
  }

  function handleCancelAdd() {
    setAdding(null);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function handleEdit(id: string) {
    setEditing({ id });
    setConfirmDelete(null);
    setSelectedId(id);
  }

  function handleSave(id: string, fields: ItemEditFields) {
    if (!fields.content.trim()) return;
    setData((d) => updateItemFields(d, id, fields));
    setEditing(null);
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleRequestDelete(id: string) {
    setConfirmDelete({ id });
    setEditing(null);
    setSelectedId(id);
  }

  function handleConfirmDelete(id: string) {
    setData((d) => deleteItem(d, id));
    setConfirmDelete(null);
    setSelectedId(null);
  }

  function handleCancelDelete() {
    setConfirmDelete(null);
  }

  // ── Links ─────────────────────────────────────────────────────────────────
  function handleAddLink(type: RequirementLinkType, sourceId: string, targetId: string) {
    setData((d) => addLink(d, type, sourceId, targetId));
  }

  function handleRemoveLink(linkId: string) {
    setData((d) => removeLink(d, linkId));
  }

  // ── Warning click ─────────────────────────────────────────────────────────
  function handleWarningClick(itemId: string) {
    setSelectedId(itemId);
    setEditing(null);
    setConfirmDelete(null);
    setAdding(null);
  }

  // ── Project name ──────────────────────────────────────────────────────────
  function handleNameChange(name: string) {
    setData((d) => ({
      ...d,
      project: { ...d.project, name, updatedAt: new Date().toISOString() },
    }));
  }

  const [lastSaved, setLastSaved] = useState(() => new Date().toISOString());

  // ── Project Lifecycle ─────────────────────────────────────────────────────
  const handleNewProject = useCallback(() => {
    if (!window.confirm("모든 데이터를 삭제하고 새 프로젝트를 시작하시겠습니까?")) return;
    
    // Generate a simple unique ID as fallback for crypto.randomUUID
    const newId = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
      ? globalThis.crypto.randomUUID()
      : `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newProject: ProjectData = {
      project: {
        id: newId,
        name: "새 프로젝트",
        version: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
      items: [],
      links: [],
    };
    setData(newProject);
    setSelectedId(null);
    setEditing(null);
    setConfirmDelete(null);
    setAdding(null);
  }, []);

  function handleImport() {
    importYamlFile((result: ImportResult) => {
      if (result.ok) {
        setData(result.data);
        setSelectedId(null);
        setEditing(null);
        setConfirmDelete(null);
        setAdding(null);
        setImportError(null);
      } else {
        setImportError(result.error);
        setTimeout(() => setImportError(null), 4000);
      }
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleYamlExport = useCallback(() => exportYaml(data), [data]);
  const handleMarkdownExport = useCallback(() => exportMarkdown(data), [data]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedItem = data.items.find((i) => i.id === selectedId) ?? null;

  const connectedIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    
    const adj = new Map<string, string[]>();
    for (const l of data.links) {
      if (!adj.has(l.sourceId)) adj.set(l.sourceId, []);
      if (!adj.has(l.targetId)) adj.set(l.targetId, []);
      adj.get(l.sourceId)!.push(l.targetId);
      adj.get(l.targetId)!.push(l.sourceId);
    }

    const set = new Set<string>();
    const queue = [selectedId];
    set.add(selectedId);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const neighbors = adj.get(current) || [];
      for (const n of neighbors) {
        if (!set.has(n)) {
          set.add(n);
          queue.push(n);
        }
      }
    }
    
    set.delete(selectedId);
    return set;
  }, [selectedId, data.links]);

  const visibleItems = useMemo(() => {
    let result = data.items;

    if (filterWarningOnly) {
      const warningIds = new Set(warnings.map(w => w.itemId));
      result = result.filter(i => warningIds.has(i.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => {
        const label = getLabel(i).toLowerCase();
        return label.includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.name?.toLowerCase().includes(q) ||
          i.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
          i.acceptanceCriteria?.toLowerCase().includes(q) ||
          i.constraints?.toLowerCase().includes(q) ||
          i.payload?.toLowerCase().includes(q) ||
          i.protocol?.toLowerCase().includes(q) ||
          i.dataFormat?.toLowerCase().includes(q);
      });
    }

    return result;
  }, [data.items, searchQuery, filterWarningOnly, warnings]);

  const visibleLinks = useMemo(() => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    return data.links.filter(
      (link) => visibleIds.has(link.sourceId) && visibleIds.has(link.targetId)
    );
  }, [visibleItems, data.links]);

  const workspaceRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app">
      <TopBar
        project={{ ...data.project, updatedAt: lastSaved }}
        warnings={warnings}
        storageError={storageError}
        onNameChange={handleNameChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterWarningOnly={filterWarningOnly}
        onFilterWarningChange={setFilterWarningOnly}
        viewMode={viewMode}
        onViewModeToggle={() => setViewMode(v => v === "list" ? "graph" : "list")}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === "dark" ? "light" : "dark")}
        onYamlExport={handleYamlExport}
        onMarkdownExport={handleMarkdownExport}
        onImport={handleImport}
        onNewProject={handleNewProject}
      />

      {importError && (
        <div className="import-error-toast" role="alert">
          ⚠ Import failed: {importError}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="workspace" role="main" ref={workspaceRef} onClick={handleWorkspaceClick} onKeyDown={(e) => { if (e.key === "Escape") handleWorkspaceClick(e as unknown as React.MouseEvent); }}>
          {viewMode === "list" ? (
            <div
              className="review-workspace"
              style={{ "--outline-width": `${outlineWidth}px` } as React.CSSProperties}
            >
              <DocumentOutline
                items={visibleItems}
                warnings={warnings}
                links={data.links}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
              <div
                className="outline-resizer"
                role="separator"
                aria-label="Resize document outline"
                aria-orientation="vertical"
                aria-valuemin={240}
                aria-valuemax={520}
                aria-valuenow={outlineWidth}
                onMouseDown={startResizingOutline}
              />
              <div className="trace-board" role="region" aria-label="Trace board">
                <div className="workspace-panel-header trace-board-header">
                  <h2 className="workspace-panel-title">Trace Board</h2>
                  <span className="workspace-panel-count">{visibleLinks.length} links</span>
                </div>
                <div className="columns">
                  {COLUMNS.map((type) => (
                    <RequirementColumn
                      key={type}
                      type={type}
                      items={visibleItems}
                      warnings={warnings}
                      links={data.links}
                      labelOptions={labelOptions}
                      selectedId={selectedId}
                      connectedIds={connectedIds}
                      editingId={editing?.id ?? null}
                      confirmDeleteId={confirmDelete?.id ?? null}
                      isAdding={adding?.type === type}
                      onSelect={handleSelect}
                      onEdit={handleEdit}
                      onSave={handleSave}
                      onCancelEdit={handleCancelEdit}
                      onRequestDelete={handleRequestDelete}
                      onConfirmDelete={handleConfirmDelete}
                      onCancelDelete={handleCancelDelete}
                      onStartAdd={() => handleStartAdd(type)}
                      onAdd={handleAdd}
                      onCancelAdd={handleCancelAdd}
                      onAddCustomLabel={handleAddCustomLabel}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, position: 'relative' }}>
              <GraphView
                items={visibleItems}
                links={visibleLinks}
                selectedId={selectedId}
                connectedIds={connectedIds}
                onSelect={(id) => handleSelect(id)}
              />
            </div>
          )}

          <RightPanel
            warnings={warnings}
            selectedItem={selectedItem}
            allItems={data.items}
            links={data.links}
            onWarningClick={handleWarningClick}
            onAddLink={handleAddLink}
            onRemoveLink={handleRemoveLink}
          />
        </div>
      </DndContext>

      {showExitModal && (
        <div className="exit-modal-overlay" role="presentation" onClick={() => setShowExitModal(false)} onKeyDown={(e) => { if (e.key === "Escape") setShowExitModal(false); }}>
          <div className="exit-modal" role="dialog" aria-modal="true" aria-labelledby="exit-modal-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <h2 id="exit-modal-title" className="exit-modal-title">저장하지 않으면 데이터가 삭제됩니다</h2>
            <p className="exit-modal-desc">
              YAML 파일로 다운로드한 뒤 다시 불러오면 이어서 편집할 수 있습니다.
            </p>
            <div className="exit-modal-actions">
              <button className="btn btn-primary" onClick={handleYamlExport}>YAML 다운로드</button>
              <button className="btn" onClick={handleMarkdownExport}>MD 다운로드</button>
              <button className="btn btn-ghost" onClick={() => setShowExitModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
