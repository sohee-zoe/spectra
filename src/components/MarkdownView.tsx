type InlinePart =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "code"; value: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    const value = match[0];
    if (value.startsWith("**")) {
      parts.push({ type: "strong", value: value.slice(2, -2) });
    } else {
      parts.push({ type: "code", value: value.slice(1, -1) });
    }
    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => {
        if (part.type === "strong") return <strong key={index}>{part.value}</strong>;
        if (part.type === "code") return <code key={index}>{part.value}</code>;
        return <span key={index}>{part.value}</span>;
      })}
    </>
  );
}

export function MarkdownView({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`}>
        <InlineMarkdown text={text} />
      </p>
    );
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {list.map((item, index) => (
          <li key={index}>
            <InlineMarkdown text={item} />
          </li>
        ))}
      </ul>
    );
    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      if (level === 1) blocks.push(<h2 key={`h-${blocks.length}`}>{text}</h2>);
      if (level === 2) blocks.push(<h3 key={`h-${blocks.length}`}>{text}</h3>);
      if (level === 3) blocks.push(<h4 key={`h-${blocks.length}`}>{text}</h4>);
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className="markdown-view">{blocks}</div>;
}
