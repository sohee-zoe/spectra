import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownView } from "../MarkdownView";

describe("MarkdownView", () => {
  it("renders headings, lists, and bold text", () => {
    render(
      <MarkdownView
        content={[
          "## 기능 설명",
          "",
          "고객은 **음성 주문**을 사용할 수 있다.",
          "",
          "- 상품 선택",
          "- 수량 선택",
        ].join("\n")}
      />
    );

    expect(screen.getByRole("heading", { name: "기능 설명" })).toBeInTheDocument();
    expect(screen.getByText("음성 주문")).toBeInTheDocument();
    expect(screen.getByText("상품 선택")).toBeInTheDocument();
    expect(screen.getByText("수량 선택")).toBeInTheDocument();
  });
});
