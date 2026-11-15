import Link from "next/link";
import type { ReactNode } from "react";
import { safeHref } from "./schema";

/**
 * Light formatting for text sections, rendered as React elements (never
 * HTML), so nothing an editor types can run as code:
 *   ## Heading        ### Smaller heading
 *   - bullet          1. numbered
 *   **bold**          [link text](/courses)
 * A blank line starts a new paragraph.
 */
export const RICH_TEXT_HELP = "Blank line = new paragraph · ## Heading · - bullet · 1. numbered · **bold** · [link text](/courses)";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]{1,120})\]\(([^)\s]{1,300})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] !== undefined) {
      out.push(<strong key={key} className="font-semibold text-ink">{m[1]}</strong>);
    } else {
      const href = safeHref(m[3], "");
      if (!href) out.push(m[2]);
      else if (href.startsWith("/") || href.startsWith("#")) {
        out.push(<Link key={key} href={href} className="font-semibold text-brand underline underline-offset-4 hover:text-brand-hover">{m[2]}</Link>);
      } else {
        out.push(
          <a key={key} href={href} {...(href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-semibold text-brand underline underline-offset-4 hover:text-brand-hover">
            {m[2]}
          </a>,
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function withBreaks(lines: string[], keyBase: string): ReactNode[] {
  return lines.flatMap((line, i) => (i === 0 ? inline(line, `${keyBase}-${i}`) : [<br key={`${keyBase}-br-${i}`} />, ...inline(line, `${keyBase}-${i}`)]));
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((b) => b.split("\n").map((l) => l.trimEnd())).filter((b) => b.some(Boolean));
  return (
    <div className="flex flex-col gap-4 text-[17px] leading-relaxed text-ink-muted">
      {blocks.map((lines, b) => {
        const key = `b${b}`;
        const first = lines[0];
        if (lines.length === 1 && first.startsWith("### ")) return <h4 key={key} className="pt-2 text-lg font-bold text-ink">{inline(first.slice(4), key)}</h4>;
        if (lines.length === 1 && first.startsWith("## ")) return <h3 key={key} className="pt-3 text-xl font-bold tracking-[-0.01em] text-ink">{inline(first.slice(3), key)}</h3>;
        if (lines.every((l) => /^[-*] /.test(l))) {
          return (
            <ul key={key} className="flex list-disc flex-col gap-1.5 pl-6 marker:text-ink">
              {lines.map((l, i) => <li key={i}>{inline(l.slice(2), `${key}-${i}`)}</li>)}
            </ul>
          );
        }
        if (lines.every((l) => /^\d{1,2}\. /.test(l))) {
          return (
            <ol key={key} className="flex list-decimal flex-col gap-1.5 pl-6 marker:font-semibold marker:text-ink">
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\d{1,2}\. /, ""), `${key}-${i}`)}</li>)}
            </ol>
          );
        }
        return <p key={key}>{withBreaks(lines, key)}</p>;
      })}
    </div>
  );
}
