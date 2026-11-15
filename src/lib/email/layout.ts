/**
 * Branded HTML email layout, matching the Supabase auth templates in
 * supabase/templates/. Tables and inline styles only, so it renders in
 * Gmail, Outlook and phone mail apps.
 *
 * Every piece of text passes through `esc`, so names, course titles and
 * support messages can never inject HTML.
 */

const INK = "#131418";
const YEL = "#FEC205";
const SOFT = "#FFF4CC";
const MUTED = "#5B5E66";
const LINE = "#E7E7E9";
const BG = "#F5F5F3";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** A run of text; `{ b }` is bold. */
export type Inline = string | { b: string };
export type Block =
  | { kind: "p"; parts: Inline[] }
  | { kind: "quote"; text: string; by?: string }
  | { kind: "rows"; rows: [string, string][] };

export type EmailContent = {
  subject: string;
  preheader: string;
  title: string;
  blocks: Block[];
  button?: { label: string; url: string };
  note?: string;
  footnote?: string;
};

export function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const p = (...parts: Inline[]): Block => ({ kind: "p", parts });

function inlineHtml(parts: Inline[]): string {
  return parts.map((x) => (typeof x === "string" ? esc(x) : `<strong>${esc(x.b)}</strong>`)).join("");
}
function inlineText(parts: Inline[]): string {
  return parts.map((x) => (typeof x === "string" ? x : x.b)).join("");
}

function blockHtml(b: Block): string {
  if (b.kind === "p") {
    return `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:25px;color:${INK};">${inlineHtml(b.parts)}</p>`;
  }
  if (b.kind === "quote") {
    const body = esc(b.text).replace(/\r?\n/g, "<br>");
    const by = b.by ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:700;color:${MUTED};">${esc(b.by)}</p>` : "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px;"><tr><td style="border-left:4px solid ${YEL};background:${BG};border-radius:8px;padding:14px 16px;">${by}<p style="margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${INK};">${body}</p></td></tr></table>`;
  }
  const rows = b.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;line-height:20px;color:${MUTED};">${esc(k)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${INK};">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;">${rows}</table>`;
}

function blockText(b: Block): string {
  if (b.kind === "p") return inlineText(b.parts);
  if (b.kind === "quote") return `${b.by ? `${b.by}:\n` : ""}${b.text.split(/\r?\n/).map((l) => `> ${l}`).join("\n")}`;
  return b.rows.map(([k, v]) => `${k}: ${v}`).join("\n");
}

export function renderEmail(c: EmailContent): { subject: string; html: string; text: string } {
  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;"><tr><td align="center" bgcolor="${YEL}" style="border-radius:999px;"><a href="${esc(c.button.url)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:700;line-height:20px;color:${INK};text-decoration:none;border-radius:999px;">${esc(c.button.label)}</a></td></tr></table>`
    : "";
  const note = c.note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr><td bgcolor="${SOFT}" style="background:${SOFT};border-radius:12px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:21px;color:${INK};">${esc(c.note)}</td></tr></table>`
    : "";
  const footnote = c.footnote ? `<p style="margin:0 0 10px;">${esc(c.footnote)}</p>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(c.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;"><a href="https://iboxacademy.com" target="_blank"><img src="https://iboxacademy.com/brand/logo-email.png" width="168" alt="iBox Academy" style="display:block;width:168px;height:auto;border:0;"></a></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:16px;border:1px solid ${LINE};overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" bgcolor="${YEL}" style="background:${YEL};font-size:0;line-height:0;">&nbsp;</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:36px 36px 34px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:800;color:${INK};">${esc(c.title)}</h1>
${c.blocks.map(blockHtml).join("\n")}
${button}
${note}
</td></tr></table>
</td></tr>
<tr><td style="padding:22px 8px 0;font-family:${FONT};font-size:12px;line-height:19px;color:${MUTED};">
${footnote}<p style="margin:0 0 6px;"><strong style="color:${INK};">iBox Academy</strong> &middot; Learn. Create. Grow.</p>
<p style="margin:0;">Questions? Reply to this email, WhatsApp us on +94 75 526 9644, or visit <a href="https://iboxacademy.com/help" style="color:${INK};">our help page</a>.</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  const text = [
    c.title,
    "",
    ...c.blocks.map((b) => `${blockText(b)}\n`),
    c.button ? `${c.button.label}: ${c.button.url}\n` : "",
    c.note ? `${c.note}\n` : "",
    "—",
    c.footnote ?? "",
    "iBox Academy · Learn. Create. Grow.",
    "Questions? Reply to this email, WhatsApp +94 75 526 9644, or visit https://iboxacademy.com/help",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  return { subject: c.subject, html, text };
}
