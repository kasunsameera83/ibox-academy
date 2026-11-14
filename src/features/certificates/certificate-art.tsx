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
  className?: string;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" });

/**
 * The certificate itself. Sized with container units, so it scales from a
 * small preview to a full A4 print. The accent colour is set with --cert.
 */
export function CertificateArt({ design, studentName, courseTitle, issuedAt, code, signatureUrl, className }: CertificateArtProps) {
  const style = { "--cert": design.color ?? "var(--color-brand)" } as CSSProperties;
  const date = dateFormat.format(new Date(issuedAt));
  const Template = design.template === "classic" ? Classic : design.template === "minimal" ? Minimal : Bold;
  return (
    <article
      style={style}
      aria-label={`${design.heading} for ${studentName}`}
      className={cn("certificate @container relative aspect-[1.414/1] w-full overflow-hidden bg-surface", className)}
    >
      <Template design={design} studentName={studentName} courseTitle={courseTitle} date={date} code={code} signatureUrl={signatureUrl} />
    </article>
  );
}

type Inner = { design: CertificateDesign; studentName: string; courseTitle: string; date: string; code: string; signatureUrl: string | null };

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
