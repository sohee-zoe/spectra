import type { ProjectData, TraceabilityWarning } from "../domain/types";

type Props = {
  project: ProjectData["project"];
  warnings: TraceabilityWarning[];
  storageError: boolean;
  onNameChange: (name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterWarningOnly: boolean;
  onFilterWarningChange: (filter: boolean) => void;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  viewMode: "list" | "graph";
  onViewModeToggle: () => void;
  onYamlExport: () => void;
  onMarkdownExport: () => void;
  onImport: () => void;
  onNewProject: () => void;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TopBar({
  project,
  warnings,
  storageError,
  onNameChange,
  searchQuery,
  onSearchChange,
  filterWarningOnly,
  onFilterWarningChange,
  theme,
  onThemeToggle,
  viewMode,
  onViewModeToggle,
  onYamlExport,
  onMarkdownExport,
  onImport,
  onNewProject,
}: Props) {
  return (
    <header className="topbar">
      <input
        className="topbar-name"
        value={project.name}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="Project name"
      />
      <span className="topbar-status">
        {storageError ? (
          <span style={{ color: "var(--error)" }}>⚠ Storage error</span>
        ) : (
          <>saved {formatTime(project.updatedAt)}</>
        )}
      </span>
      <div className="topbar-actions">
        <input
          type="text"
          className="topbar-search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search items"
        />

        {warnings.length > 0 && (
          <button
            className={`btn btn-ghost warning-filter-btn ${filterWarningOnly ? "active" : ""}`}
            onClick={() => onFilterWarningChange(!filterWarningOnly)}
            aria-label="Filter by review issues"
            aria-pressed={filterWarningOnly}
          >
            <span className="warning-badge">
              {warnings.length} issue{warnings.length !== 1 ? "s" : ""}
            </span>
          </button>
        )}

        <div className="topbar-divider" />
        <button className="btn btn-ghost" onClick={onNewProject} aria-label="Start new project">
          New
        </button>
        <button className="btn btn-ghost" onClick={onImport} aria-label="Load YAML file">
          Load
        </button>
        <div className="topbar-divider" />
        <button className="btn btn-ghost" onClick={onViewModeToggle} aria-label="Toggle view mode">
          {viewMode === "list" ? "⌘ Graph" : "☷ List"}
        </button>
        <button className="btn btn-ghost" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
        <button className="btn" onClick={onYamlExport} aria-label="Export YAML">
          YAML ↓
        </button>
        <button className="btn" onClick={onMarkdownExport} aria-label="Export Markdown">
          MD ↓
        </button>
      </div>
    </header>
  );
}
