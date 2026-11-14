import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { isBunnyConfigured, signedEmbedUrl } from "@/lib/bunny";
import { effectivePrice, formatClock, formatPrice } from "@/lib/courses/format";
import { LESSON_TYPES, lessonMissing } from "@/lib/courses/lessons";
import { SimpleText } from "@/lib/courses/simple-text";
import type { Lesson } from "@/lib/courses/types";
import { getCourseBySlug } from "@/lib/dal/courses";
import { getCurrentUser, hasPermission } from "@/lib/dal/session";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string; lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: course ? `Free preview: ${course.title}` : "Preview", robots: { index: false } };
}

export default async function PreviewLessonPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getCurrentUser()]);
  if (!course) notFound();

  const lessons = course.sections.flatMap((s) => s.lessons);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();

  const openable = (l: Lesson) => l.is_preview && LESSON_TYPES[l.type].previewable && !lessonMissing(l);
  // Learners may open preview lessons of published courses. The content team may open any published lesson.
  const isTeam = Boolean(user && hasPermission(user, "courses.read"));
  const allowed = isTeam || (course.status === "published" && openable(lesson));
  if (!allowed) notFound();

  const previews = lessons.filter(openable);
  const canPlay = lesson.type === "video" && lesson.video_status === "ready" && lesson.bunny_video_id && isBunnyConfigured();
  const embed = canPlay ? signedEmbedUrl(lesson.bunny_video_id!) : null;
  const price = effectivePrice(course);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> {course.title}
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {lesson.type === "text" ? (
            <article className="rounded-[20px] border border-line bg-surface p-6 sm:p-10">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">{lesson.title}</h1>
              {lesson.description && <p className="mt-3 text-lg text-ink-muted">{lesson.description}</p>}
              <div className="mt-6">
                {lesson.body ? <SimpleText text={lesson.body} /> : <p className="text-ink-muted">This lesson has no content yet.</p>}
              </div>
            </article>
          ) : (
          <>
          <div className="aspect-video overflow-hidden rounded-[20px] bg-ink">
            {embed ? (
              <iframe
                src={embed}
                title={lesson.title}
                className="size-full border-0"
                loading="lazy"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
              />
            ) : (
              <div className="flex size-full items-center justify-center p-6 text-center text-white/80">
                {lesson.video_status === "processing" ? "This video is still processing. Try again in a few minutes." : "This video isn't available yet."}
              </div>
            )}
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{lesson.title}</h1>
          {lesson.description && <p className="mt-3 max-w-[68ch] whitespace-pre-line text-ink-muted">{lesson.description}</p>}
          </>
          )}
          {isTeam && !lesson.is_preview && (
            <Alert tone="info" className="mt-4">You're seeing this as a team member. Learners can only watch lessons marked as free previews.</Alert>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[20px] border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-ink">Like what you see?</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{formatPrice(price)}</p>
            <ButtonLink href={`/checkout/${course.slug}`} fullWidth className="mt-4 rounded-full">
              {price === 0 ? "Enrol for free" : "Get the full course"}
            </ButtonLink>
          </div>
          {previews.length > 1 && (
            <nav aria-label="Free preview lessons" className="rounded-[20px] border border-line bg-surface p-2">
              <p className="px-3 pb-1 pt-2 text-sm font-semibold text-ink">Free previews</p>
              <ul>
                {previews.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/courses/${course.slug}/preview/${p.id}`}
                      aria-current={p.id === lesson.id ? "page" : undefined}
                      className={cn("flex items-center gap-3 rounded-control px-3 py-2.5 text-sm", p.id === lesson.id ? "bg-brand-soft font-semibold text-brand" : "text-ink hover:bg-canvas")}
                    >
                      <PlayCircle className="size-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{p.title}</span>
                      <span className="tabular-nums text-ink-muted">{p.type === "video" ? formatClock(p.duration_seconds) : "Read"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}
