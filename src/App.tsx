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
import { SAMPLE_PROJECT } from "./domain/sampleData";
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
    // Corrupt data — fall through to sample
  }
  return SAMPLE_PROJECT;
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
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizingOutline = useCallback(() => {
    isResizingOutline.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resizeOutline = useCallback((event: MouseEvent) => {
    if (!isResizingOutline.current || !workspaceRef.current) return;
    const workspaceLeft = workspaceRef.current.getBoundingClientRect().left;
    const nextWidth = event.clientX - workspaceLeft;
    setOutlineWidth(Math.min(Math.max(nextWidth, 240), 520));
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resizeOutline);
    window.addEventListener("mouseup", stopResizingOutline);
    return () => {
      window.removeEventListener("mousemove", resizeOutline);
      window.removeEventListener("mouseup", stopResizingOutline);
    };
  }, [resizeOutline, stopResizingOutline]);

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

  const [lastSaved, setLastSaved] = useState<string>(new Date().toISOString());

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

  // ── SVG connector paths (responsive via ResizeObserver) ───────────────────
  const workspaceRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);

  const recomputePaths = useCallback(() => {
    if (!workspaceRef.current || !selectedId || connectedIds.size === 0) {
      setConnectorPaths([]);
      return;
    }
    const workspace = workspaceRef.current;
    const wRect = workspace.getBoundingClientRect();

    const getCenter = (id: string) => {
      const el = workspace.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.bottom < wRect.top || r.top > wRect.bottom) return null;
      return {
        left: r.left - wRect.left,
        right: r.right - wRect.left,
        centerY: r.top - wRect.top + r.height / 2,
      };
    };

    const activeNodes = new Set([...connectedIds, selectedId]);
    const paths: string[] = [];
    
    for (const link of visibleLinks) {
      if (!activeNodes.has(link.sourceId) || !activeNodes.has(link.targetId)) continue;
      
      const s = getCenter(link.sourceId);
      const t = getCenter(link.targetId);
      if (!s || !t) continue;
      
      const toRight = s.right < t.left;
      const x1 = toRight ? s.right : s.left;
      const x2 = toRight ? t.left : t.right;
      const y1 = s.centerY;
      const y2 = t.centerY;
      
      // Use exact midpoint for control points to prevent overlapping backwards loops (squiggly lines)
      const midX = x1 + (x2 - x1) / 2;
      paths.push(
        `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
      );
    }
    setConnectorPaths(paths);
  }, [selectedId, connectedIds]);

  // Recompute when selection / data changes
  useEffect(() => {
    const raf = requestAnimationFrame(recomputePaths);
    return () => cancelAnimationFrame(raf);
  }, [selectedId, connectedIds, data.items, recomputePaths]);

  // Recompute on window / workspace resize (responsive lines)
  useEffect(() => {
    const observer = new ResizeObserver(() => requestAnimationFrame(recomputePaths));
    if (workspaceRef.current) observer.observe(workspaceRef.current);
    if (columnsRef.current) observer.observe(columnsRef.current);

    // Also handle window resize for good measure
    window.addEventListener("resize", recomputePaths);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recomputePaths);
    };
  }, [recomputePaths]);

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
        <div className="workspace" ref={workspaceRef} onClick={handleWorkspaceClick}>
          {/* SVG connector overlay — plain bezier lines, no arrows */}
          {viewMode === "list" && connectorPaths.length > 0 && (
            <svg className="connector-svg" aria-hidden="true">
              {connectorPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="var(--link-color)"
                  strokeWidth="1.5"
                  strokeOpacity="0.65"
                />
              ))}
            </svg>
          )}

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
                <div className="columns" ref={columnsRef}>
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
    </div>
  );
}

export default App;
