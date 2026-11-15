import type { CSSProperties, ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { brand } from "@/brand";
import { BrandMark } from "@/components/brand/logo";
import type { CertificateDesign } from "@/lib/courses/certificate";
import { cn } from "@/lib/utils";

export type CertificateArtProps = {
  design: CertificateDesign;
  studentName: string;
  courseTitle: string;
  issuedAt: string | Date;
  code: string;
  signatureUrl: string | null;
  /** Second signer's signature (Prestige look). */
  signature2Url?: string | null;
  className?: string;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" });

/**
 * The certificate itself. Sized with container units, so it scales from a
 * small preview to a full A4 print. The accent colour is set with --cert.
 */
export function CertificateArt({ design, studentName, courseTitle, issuedAt, code, signatureUrl, signature2Url = null, className }: CertificateArtProps) {
  const style = { "--cert": design.color ?? "var(--color-brand)" } as CSSProperties;
  const date = dateFormat.format(new Date(issuedAt));
  const Template = design.template === "classic" ? Classic : design.template === "minimal" ? Minimal : design.template === "bold" ? Bold : Prestige;
  return (
    <article
      style={style}
      aria-label={`${design.heading} for ${studentName}`}
      className={cn("certificate @container relative aspect-[1.414/1] w-full overflow-hidden bg-surface", className)}
    >
      <Template design={design} studentName={studentName} courseTitle={courseTitle} date={date} code={code} signatureUrl={signatureUrl} signature2Url={signature2Url} />
    </article>
  );
}

type Inner = { design: CertificateDesign; studentName: string; courseTitle: string; date: string; code: string; signatureUrl: string | null; signature2Url: string | null };

function Signature({ design, signatureUrl, align = "left" }: { design: CertificateDesign; signatureUrl: string | null; align?: "left" | "center" }) {
  if (!design.signerName) return null;
  return (
    <div className={cn("flex w-[24cqw] flex-col", align === "center" ? "items-center text-center" : "items-start")}>
      <div className="flex h-[6cqw] w-full items-end justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {signatureUrl && <img src={signatureUrl} alt="" className="max-h-full max-w-full object-contain" />}
      </div>
      <div className="mt-[0.6cqw] h-px w-full bg-ink/40" />
      <p className="mt-[0.6cqw] text-[length:1.5cqw] font-bold leading-tight text-ink">{design.signerName}</p>
      {design.signerTitle && <p className="text-[length:1.25cqw] leading-tight text-ink-muted">{design.signerTitle}</p>}
    </div>
  );
}

function Meta({ date, code, className }: { date: string; code: string; className?: string }): ReactNode {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-[4cqw] text-[length:1.3cqw]", className)}>
      <div>
        <dt className="text-ink-muted">Issued</dt>
        <dd className="font-bold text-ink">{date}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">Certificate ID</dt>
        <dd className="font-mono font-bold text-ink">{code}</dd>
      </div>
    </dl>
  );
}

/* ---------------------------------------------------------------- Bold */
function Bold({ design, studentName, courseTitle, date, code, signatureUrl }: Inner) {
  return (
    <div className="absolute inset-0 rounded-[2.4cqw] border-[length:0.35cqw] border-ink">
      <div className="absolute -left-[8%] -top-[18%] aspect-square w-[34%] rounded-full bg-lilac" aria-hidden="true" />
      <div className="absolute -bottom-[22%] -right-[6%] aspect-square w-[38%] rounded-full bg-[var(--cert)]" aria-hidden="true" />
      <div className="absolute bottom-[14%] right-[27%] h-[3%] w-[9%] rotate-12 rounded-full bg-accent" aria-hidden="true" />
      <div className="absolute left-[6%] top-[30%] h-[2.5%] w-[6%] -rotate-12 rounded-full bg-success" aria-hidden="true" />

      <div className="relative flex h-full flex-col justify-between p-[6%]">
        <div className="flex items-center gap-[1.2cqw]">
          <BrandMark className="size-[4.5cqw]" />
          <span className="text-[length:2.2cqw] font-extrabold tracking-tight text-ink">{brand.name}</span>
        </div>
        <div>
          <p className="text-[length:1.6cqw] font-bold text-[color:var(--cert)]">{design.heading}</p>
          <p className="mt-[1.5cqw] text-[length:6.4cqw] font-extrabold leading-[1.02] tracking-tight text-ink">{studentName}</p>
          <p className="mt-[2cqw] text-[length:1.7cqw] text-ink-muted">{design.statement}</p>
          <p className="mt-[0.6cqw] max-w-[78%] text-[length:3cqw] font-extrabold leading-tight text-ink">{courseTitle}</p>
        </div>
        <div className="flex items-end justify-between gap-[3cqw]">
          <div className="flex items-end gap-[5cqw]">
            <Meta date={date} code={code} />
            <Signature design={design} signatureUrl={signatureUrl} />
          </div>
          <div className="mr-[2%] flex aspect-square w-[15cqw] shrink-0 -rotate-12 flex-col items-center justify-center rounded-full border-[length:0.35cqw] border-ink bg-accent text-center text-on-accent shadow-[0.5cqw_0.5cqw_0_0_var(--color-ink)]">
            <BadgeCheck className="size-[32%]" aria-hidden="true" />
            <span className="mt-[4%] text-[length:1.3cqw] font-extrabold leading-tight">Verified<br />{brand.shortName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Classic */
function Classic({ design, studentName, courseTitle, date, code, signatureUrl }: Inner) {
  return (
    <div className="absolute inset-0 p-[2.2%]">
      <div className="h-full border-[length:0.5cqw] border-[color:var(--cert)] p-[0.8%]">
        <div className="relative flex h-full flex-col items-center justify-between border-[length:0.15cqw] border-[color:var(--cert)] px-[7%] py-[5%] text-center">
          <div className="flex items-center gap-[1cqw]">
            <BrandMark className="size-[3.6cqw]" />
            <span className="text-[length:1.9cqw] font-extrabold tracking-tight text-ink">{brand.name}</span>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[length:3cqw] font-extrabold tracking-tight text-[color:var(--cert)]">{design.heading}</p>
            <p className="mt-[1.8cqw] text-[length:1.5cqw] text-ink-muted">This certifies that</p>
            <p className="mt-[0.8cqw] text-[length:5.4cqw] font-extrabold leading-[1.05] tracking-tight text-ink">{studentName}</p>
            <div className="mt-[1.2cqw] h-[0.25cqw] w-[30cqw] bg-[var(--cert)]" aria-hidden="true" />
            <p className="mt-[1.6cqw] text-[length:1.6cqw] text-ink-muted">{design.statement}</p>
            <p className="mt-[0.6cqw] max-w-[80cqw] text-[length:2.6cqw] font-bold leading-tight text-ink">{courseTitle}</p>
          </div>
          <div className="grid w-full grid-cols-3 items-end">
            <div className="text-left text-[length:1.3cqw]">
              <p className="text-ink-muted">Issued</p>
              <p className="font-bold text-ink">{date}</p>
              <p className="mt-[0.6cqw] text-ink-muted">Certificate ID</p>
              <p className="font-mono font-bold text-ink">{code}</p>
            </div>
            <div className="flex justify-center">
              <div className="flex aspect-square w-[11cqw] items-center justify-center rounded-full bg-[var(--cert)] text-white ring-[length:0.5cqw] ring-[color:var(--cert)] ring-offset-[length:0.5cqw] ring-offset-surface">
                <BadgeCheck className="size-[45%]" aria-hidden="true" />
              </div>
            </div>
            <div className="flex justify-end">
              <Signature design={design} signatureUrl={signatureUrl} align="center" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Minimal */
function Minimal({ design, studentName, courseTitle, date, code, signatureUrl }: Inner) {
  return (
    <div className="absolute inset-0 flex border-[length:0.15cqw] border-line">
      <div className="flex w-[9%] flex-col items-center justify-end bg-[var(--cert)] pb-[3cqw]">
        <BrandMark className="size-[4.2cqw] rounded-[1cqw] ring-[length:0.3cqw] ring-white/70" />
      </div>
      <div className="flex flex-1 flex-col justify-between px-[7%] py-[6%]">
        <div className="flex items-center justify-between">
          <span className="text-[length:1.9cqw] font-extrabold tracking-tight text-ink">{brand.name}</span>
          <span className="inline-flex items-center gap-[0.6cqw] text-[length:1.3cqw] font-bold text-[color:var(--cert)]">
            <BadgeCheck className="size-[1.8cqw]" aria-hidden="true" /> Verified
          </span>
        </div>
        <div>
          <p className="text-[length:1.7cqw] font-bold text-[color:var(--cert)]">{design.heading}</p>
          <p className="mt-[1.4cqw] text-[length:6cqw] font-extrabold leading-[1.02] tracking-tight text-ink">{studentName}</p>
          <p className="mt-[2.2cqw] text-[length:1.6cqw] text-ink-muted">{design.statement}</p>
          <p className="mt-[0.5cqw] max-w-[85%] text-[length:2.8cqw] font-bold leading-tight text-ink">{courseTitle}</p>
        </div>
        <div className="flex items-end justify-between gap-[3cqw] border-t border-line pt-[2cqw]">
          <Meta date={date} code={code} />
          <Signature design={design} signatureUrl={signatureUrl} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Prestige */
/**
 * Formal look: logo at the top, the learner's name in script, the course in a
 * soft pill, a gold seal, and up to two signatures. Corner bands use the
 * accent colour (near-black by default) with the brand yellow.
 */
function Prestige({ design, studentName, courseTitle, date, code, signatureUrl, signature2Url }: Inner) {
  const [first, ...rest] = design.heading.split(" ");
  const subheading = rest.join(" ");
  const dark = "var(--cert)";
  // Raw token: @theme inline does not emit --color-* variables.
  const gold = "var(--brand-yellow)";
  return (
    <div className="absolute inset-0 bg-white">
      {/* Fine guilloche-style lines, for texture */}
      <svg aria-hidden="true" className="absolute inset-0 size-full opacity-[0.09]" viewBox="0 0 1414 1000" preserveAspectRatio="none">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M ${-100 + i * 6} ${560 + i * 14} C 300 ${380 + i * 10}, 520 ${900 - i * 8}, 900 ${640 + i * 6} S 1300 ${420 + i * 12}, 1520 ${520 + i * 9}`} fill="none" stroke="var(--color-ink)" strokeWidth="1.2" />
        ))}
      </svg>

      {/* Corner bands */}
      <svg aria-hidden="true" className="absolute left-0 top-0 h-[34%] w-[24%]" viewBox="0 0 340 340" preserveAspectRatio="none">
        <polygon points="0,0 250,0 0,250" fill={dark} />
        <polygon points="250,0 300,0 0,300 0,250" fill={gold} />
        <polygon points="300,0 340,0 0,340 0,300" fill={dark} opacity="0.18" />
      </svg>
      <svg aria-hidden="true" className="absolute bottom-0 right-0 h-[34%] w-[24%]" viewBox="0 0 340 340" preserveAspectRatio="none">
        <polygon points="340,340 90,340 340,90" fill={dark} />
        <polygon points="90,340 40,340 340,40 340,90" fill={gold} />
        <polygon points="40,340 0,340 340,0 340,40" fill={dark} opacity="0.18" />
      </svg>

      {/* Thin gold frame */}
      <div aria-hidden="true" className="absolute inset-[1.6%] border-[length:0.18cqw]" style={{ borderColor: gold }} />

      <div className="relative flex h-full flex-col items-center px-[9%] pb-[4.6%] pt-[3.4%] text-center">
        {/* Tagline */}
        <p className="absolute right-[5.5%] top-[6%] flex items-center gap-[0.9cqw] text-[length:1.25cqw] font-medium text-ink">
          Learn <span className="size-[0.55cqw] rounded-full" style={{ background: gold }} /> Create <span className="size-[0.55cqw] rounded-full" style={{ background: gold }} /> Grow
        </p>

        {/* Logo */}
        {brand.logo.full ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo.full} alt={brand.name} className="h-[4cqw] w-auto" />
        ) : (
          <span className="text-[length:3cqw] font-extrabold text-ink">{brand.name}</span>
        )}

        {/* Heading */}
        <p className="mt-[1.6cqw] text-[length:6.4cqw] font-extrabold uppercase leading-none tracking-[0.04em] text-ink">{first}</p>
        {subheading && (
          <div className="mt-[0.8cqw] flex w-full items-center justify-center gap-[2cqw]">
            <span className="h-[0.18cqw] w-[13cqw]" style={{ background: gold }} />
            <p className="text-[length:1.9cqw] font-semibold uppercase tracking-[0.45em] text-ink">{subheading}</p>
            <span className="h-[0.18cqw] w-[13cqw]" style={{ background: gold }} />
          </div>
        )}

        <p className="mt-[1.4cqw] text-[length:1.6cqw] text-ink">This is to certify that</p>
        <p className="mt-[0.4cqw] max-w-[84cqw] font-script text-[length:5.4cqw] leading-[1.2] text-ink">{studentName}</p>
        <div aria-hidden="true" className="h-[0.15cqw] w-[52cqw]" style={{ background: `linear-gradient(90deg, transparent, ${gold} 15%, ${gold} 85%, transparent)` }} />

        <p className="mt-[1cqw] text-[length:1.6cqw] text-ink">{design.statement}</p>
        <p className="mt-[0.8cqw] max-w-[74cqw] rounded-full bg-brand-soft px-[4cqw] py-[0.7cqw] text-[length:2.3cqw] font-bold leading-tight text-ink">{courseTitle}</p>
        {design.note && <p className="mt-[1cqw] max-w-[70cqw] text-[length:1.35cqw] leading-snug text-ink-muted">{design.note}</p>}

        {/* Bottom: date + first signer | seal | ID + second signer */}
        <div className="mt-auto grid w-full grid-cols-[1fr_auto_1fr] items-end gap-[3cqw] pt-[1cqw]">
          <div className="flex flex-col items-center gap-[0.6cqw]">
            <MetaLine value={date} label="Date of completion" gold={gold} />
            <PrestigeSigner name={design.signerName} title={design.signerTitle} url={signatureUrl} />
          </div>
          <Seal dark={dark} gold={gold} code={code} />
          <div className="flex flex-col items-center gap-[0.6cqw]">
            <MetaLine value={code} label="Certificate ID" gold={gold} mono />
            <PrestigeSigner name={design.signer2Name} title={design.signer2Title} url={signature2Url} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaLine({ value, label, gold, mono }: { value: string; label: string; gold: string; mono?: boolean }) {
  return (
    <div className="flex w-[22cqw] flex-col items-center">
      <p className={cn("text-[length:1.55cqw] font-semibold text-ink", mono && "font-mono tracking-tight")}>{value}</p>
      <span aria-hidden="true" className="my-[0.5cqw] h-[0.14cqw] w-full" style={{ background: gold }} />
      <p className="text-[length:1.3cqw] text-ink-muted">{label}</p>
    </div>
  );
}

function PrestigeSigner({ name, title, url }: { name: string; title: string; url: string | null }) {
  if (!name) return <div className="h-[7.4cqw]" aria-hidden="true" />;
  return (
    <div className="flex w-[22cqw] flex-col items-center">
      <div className="flex h-[3.8cqw] w-full items-end justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
      </div>
      <span aria-hidden="true" className="mt-[0.4cqw] h-px w-full bg-ink/50" />
      <p className="mt-[0.6cqw] text-[length:1.45cqw] font-bold leading-tight text-ink">{name}</p>
      {title && <p className="text-[length:1.2cqw] leading-tight text-ink-muted">{title}</p>}
    </div>
  );
}

/** Gold rosette with the brand mark, on two ribbons. */
function Seal({ dark, gold, code }: { dark: string; gold: string; code: string }) {
  // Unique per certificate, so several on one page don't share SVG ids.
  const uid = `seal-${code.replace(/[^a-z0-9]/gi, "")}`;
  const teeth = 32;
  const points = Array.from({ length: teeth * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 100 : 92;
    const a = (Math.PI * i) / teeth;
    return `${(110 + r * Math.sin(a)).toFixed(1)},${(110 - r * Math.cos(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="relative flex w-[12.5cqw] flex-col items-center" aria-hidden="true">
      <svg viewBox="0 0 220 300" className="w-full">
        <defs>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe27a" />
            <stop offset="0.5" stopColor={gold} />
            <stop offset="1" stopColor="#d99a00" />
          </linearGradient>
        </defs>
        <polygon points="62,180 40,292 74,268 100,296 112,190" fill={dark} />
        <polygon points="158,180 180,292 146,268 120,296 108,190" fill={dark} />
        <polygon points="70,186 56,270 76,256 92,276 100,192" fill={gold} opacity="0.9" />
        <polygon points="150,186 164,270 144,256 128,276 120,192" fill={gold} opacity="0.9" />
        <polygon points={points} fill={`url(#${uid}-gold)`} />
        <circle cx="110" cy="110" r="78" fill="none" stroke="#8a6200" strokeOpacity="0.35" strokeWidth="2" />
        <circle cx="110" cy="110" r="70" fill="none" stroke="#8a6200" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 4" />
        <path id={`${uid}-arc`} d="M 52 118 A 58 58 0 0 0 168 118" fill="none" />
        <text fontSize="15" fontWeight="800" letterSpacing="3" fill="#5c4100">
          <textPath href={`#${uid}-arc`} startOffset="50%" textAnchor="middle">VERIFIED</textPath>
        </text>
      </svg>
      {/* Dark iB icon: the yellow one would disappear on gold. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.icons.favicon} alt="" className="absolute left-1/2 top-[21%] size-[3.8cqw] -translate-x-1/2" />
    </div>
  );
}
