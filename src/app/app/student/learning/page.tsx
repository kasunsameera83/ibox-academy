import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen, PlayCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { mediaUrl } from "@/lib/courses/format";
import { listMyCourses, type MyCourseCard } from "@/lib/dal/learning";
import { requireRole } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "My Learning" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Course progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
    </div>
  );
}

function ContinueHero({ card }: { card: MyCourseCard }) {
  if (!card.course) return null;
  const thumb = mediaUrl(card.course.thumbnail_path);
  return (
    <section aria-label="Continue learning" className="mb-8 grid overflow-hidden rounded-[22px] border-2 border-ink bg-surface shadow-[6px_6px_0_0_var(--color-ink)] md:grid-cols-[minmax(0,1fr)_1.2fr]">
      <div className="relative aspect-video bg-brand md:aspect-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" /> : (
          <p className="absolute inset-0 flex items-end p-5 text-2xl font-extrabold leading-tight text-on-brand">{card.course.title}</p>
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 p-6">
        <p className="text-sm font-bold text-brand">Pick up where you left off</p>
        <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-ink">{card.course.title}</h2>
        <ProgressBar percent={card.progress.percent} />
        <p className="text-sm text-ink-muted">
          {card.progress.done} of {card.progress.total} lessons done · {card.progress.percent}%
        </p>
        <ButtonLink href={`/learn/${card.course.slug}`} size="lg" className="mt-1 w-fit rounded-full">
          <PlayCircle className="size-5" aria-hidden="true" /> Continue learning
        </ButtonLink>
      </div>
    </section>
  );
}

export default async function MyLearningPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student", "owner");
  const sp = await searchParams;
  const cards = await listMyCourses(user.id);
  const current = cards.find((c) => c.active && c.lastViewedAt && c.progress.percent < 100) ?? null;

  return (
    <>
      <PageHeader title="My Learning" description="Every course you have access to, and how far you've got." />
      {param(sp.enrolled) && <Alert tone="info" className="mb-6">You're already enrolled in that course. It's below.</Alert>}
      {cards.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="When you buy or enrol in a course, it appears here."
            action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          {current && <ContinueHero card={current} />}
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => {
              const thumb = mediaUrl(c.course?.thumbnail_path);
              const started = c.progress.done > 0 || c.lastViewedAt;
              const finished = c.progress.percent === 100;
              return (
                <li key={c.enrolmentId}>
                  <Card className="flex h-full flex-col overflow-hidden">
                    <div className="relative aspect-video bg-brand-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
                      {finished && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-accent px-2.5 py-1 text-xs font-extrabold text-on-accent">
                          <Award className="size-3.5" aria-hidden="true" /> Completed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-bold leading-snug text-ink">{c.course?.title ?? "Course"}</h2>
                        {!c.active && <StatusBadge status={c.status === "revoked" ? "revoked" : "expired"} />}
                      </div>
                      {c.active && (
                        <div className="flex flex-col gap-1.5">
                          <ProgressBar percent={c.progress.percent} />
                          <p className="text-xs text-ink-muted">
                            {c.progress.percent}% complete · {c.progress.done}/{c.progress.total} lessons
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-ink-muted">
                        {c.expiresAt ? `${c.active ? "Access until" : "Access ended"} ${dateFormat.format(new Date(c.expiresAt))}` : "Lifetime access"}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        {c.active && c.course ? (
                          <ButtonLink href={`/learn/${c.course.slug}`} size="sm" className="flex-1 rounded-full">
                            {finished ? "Review course" : started ? "Continue" : "Start course"}
                          </ButtonLink>
                        ) : (
                          c.course && <Link href={`/courses/${c.course.slug}`} className="text-sm font-semibold text-brand hover:underline">View course</Link>
                        )}
                        {c.progress.certificate && (
                          <ButtonLink href={`/certificates/${c.progress.certificate}`} variant="secondary" size="sm" className="rounded-full">
                            <Award className="size-4" aria-hidden="true" /> Certificate
                          </ButtonLink>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
