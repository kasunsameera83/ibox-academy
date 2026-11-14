import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CheckCircle2, ChevronDown, Clock, Globe, Infinity as InfinityIcon, Layers, PlayCircle } from "lucide-react";
import { brand } from "@/brand";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { CourseMedia } from "@/features/courses/components/course-media";
import { LessonTypeIcon } from "@/features/courses/components/lesson-type-icon";
import { isBunnyConfigured, signedEmbedUrl } from "@/lib/bunny";
import { accessLabel, effectivePrice, formatClock, formatDuration, formatPrice, mediaUrl } from "@/lib/courses/format";
import { LESSON_TYPES, curriculumStats, lessonMissing, lessonSeconds } from "@/lib/courses/lessons";
import type { Lesson } from "@/lib/courses/types";
import { LANGUAGE_LABELS, LEVEL_LABELS } from "@/lib/courses/types";
import { getCourseBySlug } from "@/lib/dal/courses";

type Props = { params: Promise<{ slug: string }> };

/** A free preview a visitor can actually open. */
function canPreview(lesson: Lesson) {
  return lesson.is_preview && LESSON_TYPES[lesson.type].previewable && !lessonMissing(lesson);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  const image = mediaUrl(course.thumbnail_path);
  return {
    title: course.seo_title || course.title,
    description: course.seo_description || course.subtitle || undefined,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: { title: course.seo_title || course.title, description: course.seo_description || course.subtitle || undefined, images: image ? [image] : undefined },
    robots: course.status === "published" ? undefined : { index: false, follow: false },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const stats = curriculumStats(course.sections);
  const price = effectivePrice(course);
  const onSale = course.sale_price_lkr !== null && course.price_lkr !== null;
  const thumb = mediaUrl(course.thumbnail_path);
  const firstPreview = course.sections.flatMap((s) => s.lessons).find(canPreview);
  const introEmbedUrl =
    course.intro_video_status === "ready" && course.intro_video_id && isBunnyConfigured()
      ? signedEmbedUrl(course.intro_video_id)
      : null;
  const isLive = course.status === "published";

  const facts = [
    { icon: Layers, label: LEVEL_LABELS[course.level] },
    { icon: Globe, label: `Taught in ${LANGUAGE_LABELS[course.language]}` },
    { icon: PlayCircle, label: `${stats.lessonCount} lesson${stats.lessonCount === 1 ? "" : "s"}` },
    ...(stats.totalSeconds ? [{ icon: Clock, label: formatDuration(stats.totalSeconds) }] : []),
    { icon: InfinityIcon, label: accessLabel(course.access_type, course.access_days) },
  ];

  return (
    <>
      {!isLive && (
        <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
          <Alert tone="warning" title="Team preview">
            This course isn't published, so only your team can see this page.
          </Alert>
        </div>
      )}

      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8 lg:py-14">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
            <Link href="/courses" className="hover:text-ink">Courses</Link>
            {course.category && (
              <>
                <span aria-hidden="true"> / </span>
                <Link href={`/courses?category=${course.category.slug}`} className="hover:text-ink">{course.category.name}</Link>
              </>
            )}
          </nav>
          <h1 className="mt-3 max-w-[22ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ink sm:text-5xl">{course.title}</h1>
          {course.subtitle && <p className="mt-4 max-w-2xl text-lg text-ink-muted">{course.subtitle}</p>}
          <ul className="mt-6 flex flex-wrap gap-2">
            {facts.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-line">
                <Icon className="size-4 text-brand" aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>

          {course.outcomes.length > 0 && (
            <section aria-labelledby="outcomes" className="mt-10 rounded-[24px] bg-lilac p-6 sm:p-8">
              <h2 id="outcomes" className="text-2xl font-extrabold tracking-tight text-ink">What you'll be able to do</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2.5 text-ink">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="curriculum" className="mt-12">
            <h2 id="curriculum" className="text-2xl font-extrabold tracking-tight text-ink">Course content</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {stats.sectionCount} section{stats.sectionCount === 1 ? "" : "s"}, {stats.lessonCount} lesson{stats.lessonCount === 1 ? "" : "s"}
              {stats.totalSeconds ? `, ${formatDuration(stats.totalSeconds)} in total` : ""}
              {stats.previewCount ? `. ${stats.previewCount} free to preview.` : "."}
            </p>
            <div className="mt-5 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {course.sections.map((section, i) => {
                const seconds = section.lessons.reduce((s, l) => s + lessonSeconds(l), 0);
                return (
                  <details key={section.id} open={i === 0} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-canvas [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                      <span className="flex-1 font-bold text-ink">{section.title}</span>
                      <span className="text-xs text-ink-muted">
                        {section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}{seconds ? `, ${formatDuration(seconds)}` : ""}
                      </span>
                    </summary>
                    <ul className="border-t border-line bg-canvas/50">
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                          <LessonTypeIcon type={lesson.type} size="sm" />
                          <span className="flex-1 text-ink">
                            {lesson.title}
                            <span className="sr-only"> ({LESSON_TYPES[lesson.type].label})</span>
                          </span>
                          {canPreview(lesson) && (
                            <Link href={`/courses/${course.slug}/preview/${lesson.id}`} className="font-semibold text-brand hover:underline">
                              Preview
                            </Link>
                          )}
                          {lessonSeconds(lesson) > 0 && (
                            <span className="w-14 text-right tabular-nums text-ink-muted">
                              {lesson.type === "video" ? formatClock(lesson.duration_seconds) : `${Math.round(lessonSeconds(lesson) / 60)} min`}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>

          {course.description && (
            <section aria-labelledby="about" className="mt-12">
              <h2 id="about" className="text-2xl font-extrabold tracking-tight text-ink">About this course</h2>
              <div className="mt-4 max-w-[68ch] whitespace-pre-line leading-relaxed text-ink-muted">{course.description}</div>
            </section>
          )}

          {(course.audience.length > 0 || course.prerequisites.length > 0) && (
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {course.audience.length > 0 && (
                <section aria-labelledby="audience">
                  <h2 id="audience" className="text-xl font-extrabold tracking-tight text-ink">Who it's for</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-muted">
                    {course.audience.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </section>
              )}
              {course.prerequisites.length > 0 && (
                <section aria-labelledby="prereq">
                  <h2 id="prereq" className="text-xl font-extrabold tracking-tight text-ink">Before you start</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-muted">
                    {course.prerequisites.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}

          <p className="mt-12 flex items-center gap-2 text-sm text-ink-muted">
            <BadgeCheck className="size-4 text-brand" aria-hidden="true" /> Created by the {brand.name} team.
          </p>
        </div>

        {/* Purchase panel */}
        <aside aria-label="Buy this course" className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-float">
            <CourseMedia
              title={course.title}
              thumbnailUrl={thumb}
              introEmbedUrl={introEmbedUrl}
              previewHref={firstPreview ? `/courses/${course.slug}/preview/${firstPreview.id}` : null}
              previewLabel={firstPreview?.type === "text" ? "Read a free preview" : "Watch a free preview"}
            />
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold tracking-tight text-ink">{formatPrice(price)}</span>
                {onSale && <span className="text-ink-muted line-through">{formatPrice(course.price_lkr)}</span>}
              </div>
              <ButtonLink href={`/checkout/${course.slug}`} size="lg" fullWidth className="rounded-full">
                {price === 0 ? "Enrol for free" : "Buy now"}
              </ButtonLink>
              <ul className="flex flex-col gap-2 text-sm text-ink-muted">
                <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" aria-hidden="true" /> {accessLabel(course.access_type, course.access_days)}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Pay by card or bank transfer, in LKR</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Certificate when you finish every lesson</li>
              </ul>
              <p className="text-xs text-ink-muted">
                See our <Link href="/policies" className="underline hover:text-ink">refund policy</Link> before you buy.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-4 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex-1">
          <p className="text-lg font-extrabold leading-tight text-ink">{formatPrice(price)}</p>
          {onSale && <p className="text-xs text-ink-muted line-through">{formatPrice(course.price_lkr)}</p>}
        </div>
        <ButtonLink href={`/checkout/${course.slug}`} className="rounded-full">{price === 0 ? "Enrol for free" : "Buy now"}</ButtonLink>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </>
  );
}
