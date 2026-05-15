import { useId, useState } from "react";

export const DEFAULT_LABEL_OPTIONS = ["mvp", "frontend", "backend", "api", "ux", "security"];
const DEFAULT_VERIFICATION_OPTIONS = ["pending", "ready", "passed", "failed", "blocked"];

function normalizeChoices(values: string[]): string[] {
  return Array.from(
    new Set(values.flatMap((value) => { const v = value.trim(); return v ? [v] : []; }))
  );
}

type ChoiceOrAddFieldProps = {
  label: string;
  value: string;
  options?: string[];
  onChange: (value: string) => void;
};

export function ChoiceOrAddField({
  label,
  value,
  options = DEFAULT_VERIFICATION_OPTIONS,
  onChange,
}: ChoiceOrAddFieldProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const selectOptions = normalizeChoices([...options, value]);

  function addCustomValue() {
    const nextValue = customValue.trim();
    if (!nextValue) return;
    onChange(nextValue);
    setCustomValue("");
    setIsAdding(false);
  }

  return (
    <div className="sr-field">
      <label className="sr-field-label">{label}</label>
      <select
        className="sr-field-input"
        aria-label={label}
        value={isAdding ? "__add__" : value}
        onChange={(event) => {
          if (event.target.value === "__add__") {
            setIsAdding(true);
            return;
          }
          setIsAdding(false);
          onChange(event.target.value);
        }}
      >
        <option value="">None</option>
        {selectOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__add__">Add custom…</option>
      </select>

      {isAdding && (
        <div className="choice-add-row">
          <input
            className="sr-field-input"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            aria-label={`New ${label}`}
          />
          <button type="button" className="btn btn-primary" onClick={addCustomValue}>
            Add
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setIsAdding(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

type LabelsFieldProps = {
  value: string[];
  options?: string[];
  onChange: (value: string[]) => void;
  onAddCustom?: (label: string) => void;
};

export function LabelsField({
  value,
  options = DEFAULT_LABEL_OPTIONS,
  onChange,
  onAddCustom,
}: LabelsFieldProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const labels = normalizeChoices(value);
  const availableOptions = normalizeChoices([...options, ...labels]).filter((option) => !labels.includes(option));

  function addLabel(label: string) {
    const nextLabel = label.trim().toLowerCase();
    if (!nextLabel) return;
    // If this label is not in the current options pool, bubble up so App can add it globally
    if (!availableOptions.includes(nextLabel) && !labels.includes(nextLabel)) {
      onAddCustom?.(nextLabel);
    }
    onChange(normalizeChoices([...labels, nextLabel]));
    setCustomValue("");
    setIsAdding(false);
  }

  function removeLabel(label: string) {
    onChange(labels.filter((currentLabel) => currentLabel !== label));
  }

  const labelsId = useId();

  return (
    <div className="sr-field">
      <label className="sr-field-label" htmlFor={labelsId}>Labels</label>
      <select
        id={labelsId}
        className="sr-field-input"
        aria-label="Labels"
        value={isAdding ? "__add__" : ""}
        onChange={(event) => {
          if (event.target.value === "__add__") {
            setIsAdding(true);
            return;
          }
          addLabel(event.target.value);
        }}
      >
        <option value="">Select label</option>
        {availableOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__add__">Add custom…</option>
      </select>

      {isAdding && (
        <div className="choice-add-row">
          <input
            className="sr-field-input"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            aria-label="New label"
          />
          <button type="button" className="btn btn-primary" onClick={() => addLabel(customValue)}>
            Add
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setIsAdding(false)}>
            Cancel
          </button>
        </div>
      )}

      {labels.length > 0 && (
        <div className="editable-label-list">
          {labels.map((label) => (
            <button
              key={label}
              type="button"
              className="editable-label-chip"
              onClick={() => removeLabel(label)}
              aria-label={`Remove ${label} label`}
            >
              {label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
