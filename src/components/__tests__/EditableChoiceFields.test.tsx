import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChoiceOrAddField, LabelsField } from "../EditableChoiceFields";

describe("EditableChoiceFields", () => {
  it("adds and removes labels through a selectable list", () => {
    const onChange = vi.fn();

    render(<LabelsField value={[]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Labels"), { target: { value: "mvp" } });

    expect(onChange).toHaveBeenCalledWith(["mvp"]);
    expect(screen.queryByPlaceholderText(/./)).not.toBeInTheDocument();
  });

  it("adds a custom verification value from the select flow", () => {
    const onChange = vi.fn();

    render(<ChoiceOrAddField label="Verification" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Verification"), { target: { value: "__add__" } });
    fireEvent.change(screen.getByLabelText("New Verification"), { target: { value: "manual QA" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith("manual QA");
  });

  it("adds a custom label to the shared label catalog", () => {
    function Harness() {
      const [catalog, setCatalog] = useState(["mvp"]);
      const [firstValue, setFirstValue] = useState<string[]>([]);
      const [secondValue] = useState<string[]>([]);

      return (
        <>
          <LabelsField
            value={firstValue}
            options={catalog}
            onChange={(next) => {
              setFirstValue(next);
              setCatalog((current) => Array.from(new Set([...current, ...next])));
            }}
          />
          <LabelsField value={secondValue} options={catalog} onChange={() => {}} />
        </>
      );
    }

    render(<Harness />);

    fireEvent.change(screen.getAllByLabelText("Labels")[0]!, { target: { value: "__add__" } });
    fireEvent.change(screen.getByLabelText("New label"), { target: { value: "custom" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    const secondSelect = screen.getAllByLabelText("Labels")[1] as HTMLSelectElement;
    expect(within(secondSelect).getByRole("option", { name: "custom" })).toBeInTheDocument();
  });
});
