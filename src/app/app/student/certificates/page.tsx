import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { listMyCertificates } from "@/lib/dal/learning";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Certificates" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" });

export default async function CertificatesPage() {
  const user = await requireRole("student", "owner");
  const certificates = await listMyCertificates(user.id);

  return (
    <>
      <PageHeader title="Certificates" description="You earn a certificate when you complete every lesson of a course." />
      {certificates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Award}
            title="No certificates yet"
            description="Finish every lesson of a course and your certificate appears here, ready to share."
            action={<ButtonLink href="/app/student/learning">Go to My Learning</ButtonLink>}
          />
        </Card>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {certificates.map((c) => (
            <li key={c.code}>
              <Link
                href={`/certificates/${c.code}`}
                className="group flex h-full gap-4 rounded-[20px] border-2 border-ink bg-surface p-5 shadow-[4px_4px_0_0_var(--color-ink)] transition-transform hover:-translate-y-0.5"
              >
                <span className="flex size-14 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 border-ink bg-accent text-on-accent">
                  <Award className="size-7" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold leading-snug text-ink group-hover:text-brand">{c.course_title}</span>
                  <span className="mt-1 block text-sm text-ink-muted">Issued {dateFormat.format(new Date(c.issued_at))}</span>
                  <span className="mt-2 block font-mono text-xs text-ink-muted">{c.code}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
