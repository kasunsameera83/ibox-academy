import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, PlayCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { blockFor } from "@/lib/courses/block-color";
import { mediaUrl } from "@/lib/courses/format";
import { listMyCourses } from "@/lib/dal/learning";
import { requireRole } from "@/lib/dal/session";
import { firstName, greeting } from "@/lib/shell-user";
import { cn, param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "My learning" };

export default async function StudentOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student", "owner");
  const params = await searchParams;
  const courses = await listMyCourses(user.id);
  const active = courses.filter((c) => c.active);
  const current = active.find((c) => c.lastViewedAt && c.progress.percent < 100) ?? active.find((c) => c.progress.percent < 100) ?? null;
  const lessonsDone = courses.reduce((s, c) => s + c.progress.done, 0);
  const certificates = courses.filter((c) => c.progress.certificate).length;

  const stats = [
    { label: "Courses", value: active.length, href: "/app/student/learning", block: "bg-block-sky" },
    { label: "Lessons done", value: lessonsDone, href: "/app/student/learning", block: "bg-block-mint" },
    { label: "Certificates", value: certificates, href: "/app/student/certificates", block: "bg-block-lemon" },
  ];

  return (
    <>
      {param(params.password) === "updated" && <Alert tone="success" className="mb-6">Your password has been updated.</Alert>}
      <PageHeader title={`${greeting()}, ${firstName(user)}`} description={current ? "Pick up where you left off." : "Find something new to learn."} />

      {current?.course ? (
        <section aria-label="Continue learning" className="mb-6 grid gap-2 rounded-card bg-block-lilac p-2 md:grid-cols-[minmax(0,0.9fr)_1.1fr]">
          <div className={cn("relative aspect-video overflow-hidden rounded-tile md:aspect-auto md:min-h-56", blockFor(current.course.id))}>
            {mediaUrl(current.course.thumbnail_path) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(current.course.thumbnail_path)!} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <p className="absolute inset-0 flex items-end p-5 text-2xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink">{current.course.title}</p>
            )}
          </div>
          <div className="flex flex-col justify-center gap-3 p-6">
            <p className="type-label text-ink">Continue</p>
            <h2 className="type-display-md text-ink">{current.course.title}</h2>
            <div className="h-2 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-label="Course progress" aria-valuenow={current.progress.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-ink" style={{ width: `${current.progress.percent}%` }} />
            </div>
            <p className="text-sm text-ink">{current.progress.done} of {current.progress.total} lessons · {current.progress.percent}%</p>
            <ButtonLink href={`/learn/${current.course.slug}`} variant="ink" size="lg" className="mt-1 w-fit">
              <PlayCircle className="size-5" aria-hidden="true" /> Continue learning
            </ButtonLink>
          </div>
        </section>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={Compass}
            title="Start your first course"
            description="Watch the free previews, then enrol in a course that fits your goals."
            action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
          />
        </Card>
      )}

      <section aria-label="Your learning" className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={cn("group flex flex-col justify-between gap-6 rounded-card p-6 text-ink", s.block)}>
            <span className="text-5xl font-semibold leading-none tracking-[-0.05em] tabular-nums">{s.value.toLocaleString("en-LK")}</span>
            <span className="flex items-center justify-between font-semibold">
              {s.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      {active.length > 1 && (
        <section aria-labelledby="my-courses" className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="my-courses" className="text-xl font-bold tracking-[-0.02em] text-ink">Your courses</h2>
            <Link href="/app/student/learning" className="text-sm font-semibold text-ink hover:underline hover:underline-offset-4">See all</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {active.slice(0, 4).map((c) =>
              c.course ? (
                <li key={c.enrolmentId}>
                  <Link href={`/learn/${c.course.slug}`} className="flex items-center gap-4 rounded-card border border-line bg-surface p-3 hover:border-ink/30">
                    <span className={cn("size-14 shrink-0 rounded-tile", blockFor(c.course.id))} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{c.course.title}</span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <span className="block h-full rounded-full bg-ink" style={{ width: `${c.progress.percent}%` }} />
                        </span>
                        <span className="text-xs tabular-nums text-ink-muted">{c.progress.percent}%</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}
    </>
  );
}
