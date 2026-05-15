import { useEffect, useState } from "react";
import type { ProjectData, TraceabilityWarning } from "../domain/types";
import type { DemoLanguage } from "../domain/demoData";

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
  demoLanguage?: DemoLanguage | null;
  onDemoLanguageChange?: (language: DemoLanguage) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

function getProjectNameWidth(name: string): string {
  const widthInCh = Math.min(Math.max(name.trim().length + 6, 26), 104);
  return `calc(${widthInCh}ch + 24px)`;
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
  demoLanguage = null,
  onDemoLanguageChange,
}: Props) {
  const [draftProjectName, setDraftProjectName] = useState(project.name);

  useEffect(() => {
    setDraftProjectName(project.name);
  }, [project.name]);

  return (
    <header className="topbar">
      <input
        className="topbar-name"
        value={draftProjectName}
        onChange={(e) => setDraftProjectName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const nextName = draftProjectName.trim();
          if (nextName && nextName !== project.name) {
            onNameChange(nextName);
          }
          e.currentTarget.blur();
        }}
        aria-label="Project name"
        style={{ width: getProjectNameWidth(draftProjectName) }}
      />
      <span className="topbar-status">
        {storageError ? (
          <span style={{ color: "var(--error)" }}>⚠ Storage error</span>
        ) : (
          <>Last edited {formatTime(project.updatedAt)}</>
        )}
      </span>
      <div className="topbar-actions">
        <input
          type="text"
          className="topbar-search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search items…"
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
        {demoLanguage && onDemoLanguageChange && (
          <>
            <div className="topbar-divider" />
            <button
              className={`btn btn-ghost ${demoLanguage === "en" ? "active" : ""}`}
              onClick={() => onDemoLanguageChange("en")}
              aria-label="Use English demo data"
              aria-pressed={demoLanguage === "en"}
            >
              EN
            </button>
            <button
              className={`btn btn-ghost ${demoLanguage === "ko" ? "active" : ""}`}
              onClick={() => onDemoLanguageChange("ko")}
              aria-label="Use Korean demo data"
              aria-pressed={demoLanguage === "ko"}
            >
              KO
            </button>
          </>
        )}
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
