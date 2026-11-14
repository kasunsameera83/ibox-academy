import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { mediaUrl } from "@/lib/courses/format";
import { listMyEnrolments } from "@/lib/dal/orders";
import { requireRole } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "My Learning" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export default async function MyLearningPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student", "owner");
  const sp = await searchParams;
  const enrolments = await listMyEnrolments(user.id);

  return (
    <>
      <PageHeader title="My Learning" description="Every course you have access to." />
      {param(sp.enrolled) && <Alert tone="info" className="mb-6">You're already enrolled in that course. It's below.</Alert>}
      {enrolments.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="When you buy or enrol in a course, it appears here."
            action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
          />
        </Card>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {enrolments.map((e) => {
            const expired = e.status === "expired" || (e.expires_at !== null && new Date(e.expires_at) < new Date());
            const active = e.status === "active" && !expired;
            const thumb = mediaUrl(e.course?.thumbnail_path);
            return (
              <li key={e.id}>
                <Card className="flex h-full flex-col overflow-hidden">
                  <div className="aspect-video bg-brand-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold leading-snug text-ink">{e.course?.title ?? "Course"}</h2>
                      {!active && <StatusBadge status={e.status === "revoked" ? "revoked" : "expired"} />}
                    </div>
                    <p className="text-xs text-ink-muted">
                      {e.expires_at ? `${active ? "Access until" : "Access ended"} ${dateFormat.format(new Date(e.expires_at))}` : "Lifetime access"}
                    </p>
                    <div className="mt-auto pt-3">
                      {active && e.course ? (
                        <ButtonLink href={`/courses/${e.course.slug}`} size="sm" fullWidth>Open course</ButtonLink>
                      ) : (
                        e.course && <Link href={`/courses/${e.course.slug}`} className="text-sm font-semibold text-brand hover:underline">View course</Link>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-sm text-ink-muted">The lesson player with saved progress arrives in the next update.</p>
    </>
  );
}
