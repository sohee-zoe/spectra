import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

beforeEach(() => {
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

  it("shows status slots separately from attribute rows", () => {
    render(<App />);

    expect(screen.getAllByText("stable").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Reporter Sample/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
  });

  it("allows editing an item's status", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("article", { name: "UR-ORD-01" }));
    fireEvent.click(screen.getByLabelText("Edit UR-ORD-01"));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "approved" } });
    fireEvent.click(screen.getByText("Save"));

    expect(screen.getAllByText("approved").length).toBeGreaterThan(0);
  });

  it("collapses document outline categories", () => {
    render(<App />);

    const outline = screen.getByRole("navigation", { name: /document outline/i });
    fireEvent.click(within(outline).getByRole("button", { name: "Toggle UR category" }));

    expect(within(outline).queryByLabelText("Select UR-ORD-01")).not.toBeInTheDocument();
    expect(within(outline).getByRole("button", { name: "Toggle UR category" })).toHaveAttribute("aria-expanded", "false");
  });
});
