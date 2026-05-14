import { useState } from "react";
import { MarkdownView } from "./MarkdownView";

export function MarkdownEditor({
  value,
  onChange,
  minRows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  return (
    <div className="markdown-editor">
      <div className="markdown-editor-tabs">
        <button
          type="button"
          className={`tab ${mode === "write" ? "active" : ""}`}
          onClick={() => setMode("write")}
        >
          Write
        </button>
        <button
          type="button"
          className={`tab ${mode === "preview" ? "active" : ""}`}
          onClick={() => setMode("preview")}
        >
          Preview
        </button>
      </div>
      {mode === "write" ? (
        <textarea
          className="sr-field-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={minRows}
          style={{ resize: "vertical" }}
        />
      ) : (
        <div className="markdown-editor-preview">
          <MarkdownView content={value || "_No content_"} />
        </div>
      )}
    </div>
  );
}
