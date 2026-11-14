import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReviewForm } from "@/features/assignments/review-form";
import { SimpleText } from "@/lib/courses/simple-text";
import { getSubmissionForTeam, nextSubmissionToReview } from "@/lib/dal/assignments";
import { type SessionUser } from "@/lib/dal/session";


const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export async function AssignmentReviewScreen({ params, user, base }: { params: Promise<{ id: string }>; user: SessionUser; base: string }) {
  const { id } = await params;
  const [s, nextId] = await Promise.all([getSubmissionForTeam(id), nextSubmissionToReview(id)]);
  if (!s) notFound();
  const learner = s.student?.full_name || s.student?.email || "Learner";

  return (
    <>
      <Link href={`${base}/assignments`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Assignments
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{s.course?.title}</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{s.lesson?.title ?? "Assignment"}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{learner}</span>
            {s.student?.full_name && s.student.email ? ` · ${s.student.email}` : ""} · Submitted {dateFormat.format(new Date(s.submitted_at))}
          </p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Learner's work" />
            <div className="flex flex-col gap-4 p-5">
              {s.text_answer ? (
                <p className="whitespace-pre-line rounded-control bg-canvas px-4 py-3 text-sm leading-relaxed text-ink">{s.text_answer}</p>
              ) : (
                <p className="text-sm text-ink-muted">No written answer.</p>
              )}
              {s.file_name && (
                s.file_url ? (
                  <a href={s.file_url} className="flex items-center gap-3 rounded-control border border-line px-4 py-3 text-sm hover:border-brand hover:bg-brand-soft">
                    <Download className="size-4 text-brand" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{s.file_name}</span>
                    <span className="text-xs text-ink-muted">Download</span>
                  </a>
                ) : (
                  <p className="text-sm text-danger-ink">The attached file ({s.file_name}) couldn't be opened.</p>
                )
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Instructions"
              action={
                s.course && s.lesson ? (
                  <Link href={`/learn/${s.course.slug}/${s.lesson.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                    Open lesson <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : undefined
              }
            />
            <div className="p-5">
              {s.instructions ? <SimpleText text={s.instructions} /> : <p className="text-sm text-ink-muted">No instructions.</p>}
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader
              title={s.status === "submitted" ? "Your review" : "Review"}
              description={
                s.reviewed_at
                  ? `Last reviewed ${dateFormat.format(new Date(s.reviewed_at))}${s.reviewer?.full_name ? ` by ${s.reviewer.full_name}` : ""}.`
                  : undefined
              }
            />
            <div className="p-5">
              <ReviewForm
                submissionId={s.id}
                initialFeedback={s.feedback}
                reviewed={s.status !== "submitted"}
                nextHref={nextId ? `${base}/assignments/${nextId}` : `${base}/assignments`}
              />
              {nextId && <p className="mt-3 text-xs text-ink-muted">After saving, you'll go straight to the next submission waiting for review.</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
