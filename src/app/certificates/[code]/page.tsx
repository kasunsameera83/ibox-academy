import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { brand } from "@/brand";
import { BrandMark, Logo } from "@/components/brand/logo";
import { CertificateActions } from "@/features/learning/certificate-actions";
import { verifyCertificate } from "@/lib/dal/learning";
import { siteUrl } from "@/lib/utils";

type Props = { params: Promise<{ code: string }> };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const cert = await verifyCertificate(code);
  if (!cert) return { title: "Certificate not found", robots: { index: false } };
  const title = `${cert.student_name} completed ${cert.course_title}`;
  return {
    title,
    description: `Verified certificate of completion from ${brand.name}.`,
    robots: { index: false },
    openGraph: { title, description: `Verified certificate of completion from ${brand.name}.` },
  };
}

export default async function CertificatePage({ params }: Props) {
  const { code } = await params;
  const cert = await verifyCertificate(code);
  if (!cert) notFound();
  const url = `${siteUrl()}/certificates/${cert.code}`;

  return (
    <div className="min-h-dvh bg-canvas print:bg-white">
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/courses" className="text-sm font-semibold text-ink-muted hover:text-ink">Explore courses</Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <p className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-sm font-bold text-success-ink">
            <BadgeCheck className="size-4" aria-hidden="true" /> Verified by {brand.name}
          </p>
          <CertificateActions url={url} />
        </div>

        {/* The certificate */}
        <article
          className="certificate @container relative aspect-[1.414/1] w-full overflow-hidden rounded-[28px] border-[3px] border-ink bg-surface shadow-[8px_8px_0_0_var(--color-ink)] print:rounded-none print:shadow-none"
          aria-label={`Certificate of completion for ${cert.student_name}`}
        >
          {/* Decorative shapes */}
          <div className="absolute -left-[8%] -top-[18%] aspect-square w-[34%] rounded-full bg-lilac" aria-hidden="true" />
          <div className="absolute -bottom-[22%] -right-[6%] aspect-square w-[38%] rounded-full bg-brand" aria-hidden="true" />
          <div className="absolute bottom-[14%] right-[27%] h-[3%] w-[9%] rotate-12 rounded-full bg-accent" aria-hidden="true" />
          <div className="absolute left-[6%] top-[30%] h-[2.5%] w-[6%] -rotate-12 rounded-full bg-success" aria-hidden="true" />

          <div className="relative flex h-full flex-col justify-between p-[6%]">
            <div className="flex items-center gap-[1.2cqw]">
              <BrandMark className="size-[clamp(28px,4.5cqw,56px)]" />
              <span className="text-[clamp(14px,2.2cqw,26px)] font-extrabold tracking-tight text-ink">{brand.name}</span>
            </div>

            <div>
              <p className="text-[clamp(11px,1.6cqw,18px)] font-bold text-brand">Certificate of completion</p>
              <p className="mt-[1.5cqw] text-[clamp(26px,6.4cqw,76px)] font-extrabold leading-[1.02] tracking-tight text-ink">
                {cert.student_name}
              </p>
              <p className="mt-[2cqw] text-[clamp(12px,1.7cqw,20px)] text-ink-muted">has successfully completed every lesson of</p>
              <p className="mt-[0.6cqw] max-w-[78%] text-[clamp(16px,3cqw,36px)] font-extrabold leading-tight text-ink">{cert.course_title}</p>
            </div>

            <div className="flex items-end justify-between gap-4">
              <dl className="grid grid-cols-2 gap-x-[4cqw] text-[clamp(10px,1.3cqw,15px)]">
                <div>
                  <dt className="text-ink-muted">Issued</dt>
                  <dd className="font-bold text-ink">{dateFormat.format(new Date(cert.issued_at))}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Certificate ID</dt>
                  <dd className="font-mono font-bold text-ink">{cert.code}</dd>
                </div>
              </dl>
              {/* Seal */}
              <div className="mr-[2%] flex aspect-square w-[clamp(72px,15cqw,170px)] shrink-0 -rotate-12 flex-col items-center justify-center rounded-full border-[3px] border-ink bg-accent text-center text-on-accent shadow-[4px_4px_0_0_var(--color-ink)]">
                <BadgeCheck className="size-[32%]" aria-hidden="true" />
                <span className="mt-[4%] text-[clamp(8px,1.3cqw,14px)] font-extrabold leading-tight">Verified<br />{brand.shortName}</span>
              </div>
            </div>
          </div>
        </article>

        <p className="text-center text-sm text-ink-muted print:hidden">
          Anyone can confirm this certificate at <span className="font-semibold text-ink">{url.replace(/^https?:\/\//, "")}</span>
        </p>
      </main>
    </div>
  );
}
