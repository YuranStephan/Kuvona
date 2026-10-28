import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown subset for lesson bodies, rendered as React elements (no raw HTML):
 * ## / ### headings, paragraphs, - / 1. lists, [ ] task items, **bold**, *italic*, `code`, [text](https://link).
 */
export function Markdown({ text, className = "prose" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Block key={i} block={block.trim()} />
      ))}
    </div>
  );
}

function Block({ block }: { block: string }) {
  if (!block) return null;
  const lines = block.split("\n");
  if (/^###\s/.test(block) && lines.length === 1) return <h3>{inline(block.replace(/^###\s+/, ""))}</h3>;
  if (/^##\s/.test(block) && lines.length === 1) return <h2>{inline(block.replace(/^##\s+/, ""))}</h2>;
  if (lines.every((l) => /^\s*([-*]|\[\s?[xX ]?\])\s+/.test(l) || /^\s*\[\s?[xX ]?\]/.test(l))) {
    return (
      <ul>
        {lines.map((l, i) => {
          const task = l.match(/^\s*(?:[-*]\s+)?\[( |x|X)?\]\s*(.*)$/);
          if (task) {
            return (
              <li key={i} className="task-item">
                <span className="task-box" aria-hidden="true" />
                <span>{inline(task[2] ?? "")}</span>
              </li>
            );
          }
          return <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ""))}</li>;
        })}
      </ul>
    );
  }
  if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
    return (
      <ol>
        {lines.map((l, i) => (
          <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>
        ))}
      </ol>
    );
  }
  // Mixed block: a heading line followed by content.
  if (/^#{2,3}\s/.test(lines[0] ?? "")) {
    const [head, ...rest] = lines;
    const Tag = head!.startsWith("###") ? "h3" : "h2";
    return (
      <>
        <Tag>{inline(head!.replace(/^#{2,3}\s+/, ""))}</Tag>
        <Block block={rest.join("\n")} />
      </>
    );
  }
  return (
    <p>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inline(l)}
        </Fragment>
      ))}
    </p>
  );
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer nofollow" className="link">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
