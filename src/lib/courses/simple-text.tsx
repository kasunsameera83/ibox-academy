import type { ReactNode } from "react";

/**
 * Renders lesson text safely (no HTML): "# " headings, "- " bullets,
 * blank lines between paragraphs. Content is escaped by React.
 */
export function SimpleText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p${blocks.length}`} className="leading-relaxed text-ink">{paragraph.join(" ")}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`u${blocks.length}`} className="list-disc space-y-1.5 pl-6 text-ink">
          {list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#{1,3}\s+/, "");
      blocks.push(
        level === 1 ? (
          <h2 key={`h${blocks.length}`} className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-ink">{content}</h2>
        ) : (
          <h3 key={`h${blocks.length}`} className="mt-3 text-xl font-bold text-ink">{content}</h3>
        ),
      );
    } else if (/^[-*]\s/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();

  return <div className="flex max-w-[68ch] flex-col gap-4">{blocks}</div>;
}
