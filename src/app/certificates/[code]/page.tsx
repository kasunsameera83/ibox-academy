import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { brand } from "@/brand";
import { Logo } from "@/components/brand/logo";
import { CertificateArt } from "@/features/certificates/certificate-art";
import { CertificateActions } from "@/features/learning/certificate-actions";
import { parseDesign } from "@/lib/courses/certificate";
import { mediaUrl } from "@/lib/courses/format";
import { verifyCertificate } from "@/lib/dal/learning";
import { cn, siteUrl } from "@/lib/utils";

type Props = { params: Promise<{ code: string }> };

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
  const design = parseDesign(cert.design);

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

        <CertificateArt
          design={design}
          studentName={cert.student_name}
          courseTitle={cert.course_title}
          issuedAt={cert.issued_at}
          code={cert.code}
          signatureUrl={mediaUrl(design.signaturePath)}
          className={cn(
            "print:shadow-none",
            design.template === "bold" ? "rounded-[24px] shadow-[8px_8px_0_0_var(--color-ink)]" : "shadow-float",
          )}
        />

        <p className="text-center text-sm text-ink-muted print:hidden">
          Anyone can confirm this certificate at <span className="font-semibold text-ink">{url.replace(/^https?:\/\//, "")}</span>
        </p>
      </main>
    </div>
  );
}
