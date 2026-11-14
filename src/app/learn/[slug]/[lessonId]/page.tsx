import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Circle, Download, Lock, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { LessonTypeIcon } from "@/features/courses/components/lesson-type-icon";
import { AssignmentSubmit } from "@/features/learning/assignment-submit";
import { CompleteButton } from "@/features/learning/complete-button";
import { LessonVideo } from "@/features/learning/lesson-video";
import { QuizRunner } from "@/features/learning/quiz-runner";
import { isBunnyConfigured, signedEmbedUrl } from "@/lib/bunny";
import { formatClock } from "@/lib/courses/format";
import { LESSON_TYPES, lessonSeconds } from "@/lib/courses/lessons";
import { SimpleText } from "@/lib/courses/simple-text";
import type { Lesson } from "@/lib/courses/types";
import { getLearnerCourse, getLessonContent, recordLessonView, type LearnerCourse } from "@/lib/dal/learning";
import { getCurrentUser } from "@/lib/dal/session";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export const metadata: Metadata = { title: "Learning", robots: { index: false } };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function lessonMeta(lesson: Lesson) {
  if (lesson.type === "video") return formatClock(lesson.duration_seconds) || "Video";
  if (lesson.type === "text") {
    const s = lessonSeconds(lesson);
    return s ? `${Math.round(s / 60)} min read` : "Read";
  }
  return LESSON_TYPES[lesson.type].short;
}

function Curriculum({ data, currentId }: { data: LearnerCourse; currentId: string }) {
  const { course, completed } = data;
  return (
    <nav aria-label="Course content" className="flex flex-col gap-2">
      {course.sections.map((section, sIndex) => {
        const done = section.lessons.filter((l) => completed.has(l.id)).length;
        const containsCurrent = section.lessons.some((l) => l.id === currentId);
        return (
          <details key={section.id} open={containsCurrent || course.sections.length <= 3} className="group rounded-card border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex-1">
                <span className="block text-xs font-semibold text-ink-muted">Section {sIndex + 1}</span>
                <span className="block font-bold leading-snug text-ink">{section.title}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-muted">{done}/{section.lessons.length}</span>
            </summary>
            <ul className="border-t border-line p-1.5">
              {section.lessons.map((l) => {
                const current = l.id === currentId;
                const isDone = completed.has(l.id);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${course.slug}/${l.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-start gap-3 rounded-control px-2.5 py-2.5 text-sm",
                        current ? "bg-brand-soft" : "hover:bg-canvas",
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 fill-success text-white" aria-label="Completed" />
                      ) : (
                        <Circle className="mt-0.5 size-5 shrink-0 text-line" aria-label="Not completed" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={cn("block leading-snug", current ? "font-bold text-brand" : "text-ink")}>{l.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{lessonMeta(l)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}

export default async function LessonPlayerPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/learn/${slug}/${lessonId}`)}`);
  if ((user.role === "owner" || user.role === "staff") && user.aal !== "aal2") redirect("/mfa");

  const data = await getLearnerCourse(slug, user);
  if (!data) redirect(`/courses/${encodeURIComponent(slug)}`);

  const index = data.lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) notFound();
  const lesson = data.lessons[index];
  const prev = data.lessons[index - 1] ?? null;
  const next = data.lessons[index + 1] ?? null;
  const team = data.mode === "team";
  const isDone = data.completed.has(lesson.id);

  const [content] = await Promise.all([getLessonContent(lesson, user), team ? Promise.resolve() : recordLessonView(lesson.id)]);
  const embed =
    lesson.type === "video" && lesson.video_status === "ready" && lesson.bunny_video_id && isBunnyConfigured()
      ? signedEmbedUrl(lesson.bunny_video_id)
      : null;
  const { progress, course } = data;
  const section = course.sections.find((s) => s.id === lesson.section_id);
  const passPercent = lesson.settings.passPercent ?? 70;
  const submission = lesson.settings.submission ?? ["text", "file"];

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <Link href="/app/student/learning" aria-label="Back to My Learning" className="shrink-0">
            <BrandMark />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink sm:text-base">{course.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-1.5 w-28 overflow-hidden rounded-full bg-line sm:w-48"
                role="progressbar"
                aria-label="Course progress"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${progress.percent}%` }} />
              </div>
              <span className="text-xs tabular-nums text-ink-muted">
                {progress.done}/{progress.total} · {progress.percent}%
              </span>
            </div>
          </div>
          {progress.certificate && (
            <ButtonLink href={`/certificates/${progress.certificate}`} variant="secondary" size="sm" className="hidden rounded-full sm:inline-flex">
              <Award className="size-4" aria-hidden="true" /> Certificate
            </ButtonLink>
          )}
          <ButtonLink href="/app/student/learning" variant="tertiary" size="sm" className="rounded-full">
            My Learning
          </ButtonLink>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
        <main className="min-w-0">
          {team && (
            <Alert tone="info" className="mb-4">
              You're viewing this course as a team member. Progress, quiz scores and submissions aren't saved.
            </Alert>
          )}

          {progress.percent === 100 && progress.certificate && (
            <div className="rise-in mb-6 flex flex-col gap-4 overflow-hidden rounded-[22px] border-2 border-ink bg-accent p-5 shadow-[5px_5px_0_0_var(--color-ink)] sm:flex-row sm:items-center">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface">
                <Award className="size-7 text-ink" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-lg font-extrabold text-on-accent">You finished the course.</p>
                <p className="text-sm text-on-accent">Your certificate is ready to view, print and share.</p>
              </div>
              <ButtonLink href={`/certificates/${progress.certificate}`} className="rounded-full">View certificate</ButtonLink>
            </div>
          )}

          {/* Lesson stage */}
          {lesson.type === "video" && (
            <div className="aspect-video overflow-hidden rounded-[20px] bg-ink">
              {embed ? (
                <LessonVideo src={embed} title={lesson.title} lessonId={lesson.id} slug={course.slug} autoComplete={!team && !isDone} />
              ) : (
                <div className="flex size-full items-center justify-center p-6 text-center text-white/80">
                  {lesson.video_status === "processing" ? "This video is still processing. Try again in a few minutes." : "This video isn't available yet."}
                </div>
              )}
            </div>
          )}

          <div className={cn("rounded-[20px] border border-line bg-surface p-5 sm:p-8", lesson.type === "video" && "mt-5")}>
            <div className="flex items-start gap-3">
              <LessonTypeIcon type={lesson.type} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-muted">
                  {section ? `${section.title} · ` : ""}Lesson {index + 1} of {data.lessons.length}
                </p>
                <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{lesson.title}</h1>
              </div>
            </div>
            {lesson.description && <p className="mt-4 max-w-[68ch] whitespace-pre-line text-ink-muted">{lesson.description}</p>}

            {lesson.type === "text" && (
              <div className="mt-6 max-w-[70ch]">
                {content.body ? <SimpleText text={content.body} /> : <p className="text-ink-muted">This lesson has no content yet.</p>}
              </div>
            )}

            {lesson.type === "quiz" && (
              <div className="mt-6">
                <QuizRunner
                  lessonId={lesson.id}
                  slug={course.slug}
                  questions={content.questions}
                  passPercent={passPercent}
                  lastAttempt={content.lastAttempt}
                  bestPercent={content.bestPercent}
                  passed={isDone}
                  team={team}
                />
              </div>
            )}

            {lesson.type === "assignment" && (
              <div className="mt-6 flex flex-col gap-6">
                {content.body && (
                  <div className="max-w-[70ch] rounded-card bg-canvas p-5">
                    <p className="mb-2 text-sm font-bold text-ink">Instructions</p>
                    <SimpleText text={content.body} />
                  </div>
                )}
                <AssignmentSubmit
                  lessonId={lesson.id}
                  slug={course.slug}
                  userId={user.id}
                  allowText={submission.includes("text")}
                  allowFile={submission.includes("file")}
                  submission={content.submission}
                  team={team}
                />
              </div>
            )}

            {content.resources.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-bold text-ink">{lesson.type === "resource" ? "Files" : "Lesson files"}</p>
                <ul className="flex flex-col gap-2">
                  {content.resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url ?? undefined}
                        aria-disabled={!r.url}
                        className="flex items-center gap-3 rounded-control border border-line px-4 py-3 text-sm hover:border-brand hover:bg-brand-soft"
                      >
                        <Download className="size-4 shrink-0 text-brand" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{r.file_name}</span>
                        <span className="shrink-0 text-xs text-ink-muted">{formatBytes(r.size_bytes)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.type === "resource" && content.resources.length === 0 && (
              <p className="mt-6 text-ink-muted">No files have been added to this lesson yet.</p>
            )}

            {/* Lesson footer */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <div>
                {!team && (lesson.type === "video" || lesson.type === "text" || lesson.type === "resource") && (
                  <CompleteButton lessonId={lesson.id} slug={course.slug} completed={isDone} />
                )}
                {!team && lesson.type === "quiz" && (
                  <p className={cn("flex items-center gap-1.5 text-sm font-semibold", isDone ? "text-success-ink" : "text-ink-muted")}>
                    {isDone ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                    {isDone ? "Quiz passed" : `Pass with ${passPercent}% to complete this lesson`}
                  </p>
                )}
                {!team && lesson.type === "assignment" && (
                  <p className={cn("flex items-center gap-1.5 text-sm font-semibold", isDone ? "text-success-ink" : "text-ink-muted")}>
                    {isDone ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                    {isDone
                      ? "Assignment approved"
                      : content.submission?.status === "submitted"
                        ? "Submitted. Waiting for review"
                        : content.submission?.status === "changes_requested"
                          ? "Changes requested. Resubmit to complete"
                          : "Submit your work. It completes when approved"}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {prev && (
                  <ButtonLink href={`/learn/${course.slug}/${prev.id}`} variant="secondary" className="rounded-full">
                    <ArrowLeft className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
                  </ButtonLink>
                )}
                {next ? (
                  <ButtonLink href={`/learn/${course.slug}/${next.id}`} className="rounded-full">
                    Next lesson <ArrowRight className="size-4" aria-hidden="true" />
                  </ButtonLink>
                ) : (
                  <ButtonLink href={progress.certificate ? `/certificates/${progress.certificate}` : "/app/student/learning"} className="rounded-full">
                    {progress.certificate ? "View certificate" : "Finish"}
                  </ButtonLink>
                )}
              </div>
            </div>
          </div>

          {/* Course content on small screens */}
          <details className="mt-6 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 font-bold text-ink [&::-webkit-details-marker]:hidden">
              <Menu className="size-4" aria-hidden="true" /> Course content
              <span className="ml-auto text-xs font-semibold text-ink-muted">{progress.done}/{progress.total} done</span>
            </summary>
            <div className="mt-2">
              <Curriculum data={data} currentId={lesson.id} />
            </div>
          </details>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-4">
            <p className="mb-3 text-sm font-bold text-ink">Course content</p>
            <Curriculum data={data} currentId={lesson.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
