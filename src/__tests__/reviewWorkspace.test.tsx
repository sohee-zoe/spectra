import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

describe("review workspace", () => {
  it("renders categorized document outline and document detail regions", () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: /document outline/i })).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: /resize document outline/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /trace board/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /document detail/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "UR" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SR" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Feature" })).toBeInTheDocument();
  });

  it("starts with an empty project on the main route", () => {
    render(<App />);

    expect(screen.getByDisplayValue("새 프로젝트")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getAllByText(/No .* items/).length).toBeGreaterThan(0);
  });

  it("loads the demo dataset on the demo route", () => {
    window.history.replaceState({}, "", "/demo");

    render(<App />);

    expect(screen.getByDisplayValue("Release Readiness Tracker")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /UR-REL-01/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /SR-WF-01/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /FT-API-01/i })).toBeInTheDocument();
  });

  it("collapses document outline categories", () => {
    render(<App />);

    const outline = screen.getByRole("navigation", { name: /document outline/i });
    fireEvent.click(within(outline).getByRole("button", { name: "Toggle UR category" }));

    expect(within(outline).queryByLabelText("Select UR-ORD-01")).not.toBeInTheDocument();
    expect(within(outline).getByRole("button", { name: "Toggle UR category" })).toHaveAttribute("aria-expanded", "false");
  });
});
