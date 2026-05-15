import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "../TopBar";

describe("TopBar", () => {
  it("formats the last edited timestamp and applies the project name on enter", () => {
    const onNameChange = vi.fn();

    render(
      <TopBar
        project={{
          id: "project-1",
          name: "A very long project title for layout checks",
          version: "1.0.0",
          updatedAt: "2026-05-16T01:45:00",
        }}
        warnings={[]}
        storageError={false}
        onNameChange={onNameChange}
        searchQuery=""
        onSearchChange={() => {}}
        filterWarningOnly={false}
        onFilterWarningChange={() => {}}
        theme="dark"
        onThemeToggle={() => {}}
        viewMode="list"
        onViewModeToggle={() => {}}
        onYamlExport={() => {}}
        onMarkdownExport={() => {}}
        onImport={() => {}}
        onNewProject={() => {}}
      />
    );

    expect(screen.getByText("Last edited 26-05-16 01:45")).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toHaveStyle({ width: "calc(49ch + 24px)" });

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Commerce Order Flow Demo" },
    });

    expect(onNameChange).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByLabelText("Project name"), {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    expect(onNameChange).toHaveBeenCalledWith("Commerce Order Flow Demo");
  });
});
