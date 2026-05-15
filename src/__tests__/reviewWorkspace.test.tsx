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

    expect(screen.getByDisplayValue("Commerce Order Flow Demo")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /UR-AUTH-01/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /SR-CART-01/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /FT-SHIP-01/i })).toBeInTheDocument();
  });

  it("switches demo data language without changing app chrome", () => {
    window.history.replaceState({}, "", "/demo");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Use Korean demo data" }));

    expect(screen.getByDisplayValue("커머스 주문 흐름 데모")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /UR-AUTH-01/i })).toBeInTheDocument();
    expect(screen.getByText("회원 로그인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load YAML file" })).toBeInTheDocument();
  });

  it("collapses document outline categories", () => {
    render(<App />);

    const outline = screen.getByRole("navigation", { name: /document outline/i });
    fireEvent.click(within(outline).getByRole("button", { name: "Toggle UR category" }));

    expect(within(outline).queryByLabelText("Select UR-ORD-01")).not.toBeInTheDocument();
    expect(within(outline).getByRole("button", { name: "Toggle UR category" })).toHaveAttribute("aria-expanded", "false");
  });
});
