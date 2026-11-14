import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AssignmentForm } from "@/features/courses/components/lesson/assignment-form";
import { CaptionsManager } from "@/features/courses/components/lesson/captions-manager";
import { LessonDetailsForm } from "@/features/courses/components/lesson/lesson-details-form";
import { QuizBuilder } from "@/features/courses/components/lesson/quiz-builder";
import { ResourcesManager } from "@/features/courses/components/lesson/resources-manager";
import { TextContentForm } from "@/features/courses/components/lesson/text-content-form";
import { LessonTypeIcon } from "@/features/courses/components/lesson-type-icon";
import { VideoHostingNotice } from "@/features/courses/components/video-hosting-notice";
import { VideoUploader } from "@/features/courses/components/video-uploader";
import { getVideoCaptions, isBunnyConfigured, signedEmbedUrl } from "@/lib/bunny";
import { LESSON_TYPES, lessonDisplayStatus, lessonMissing } from "@/lib/courses/lessons";
import { getCourseForEditor, getLessonForEditor } from "@/lib/dal/courses";
import { hasPermission, requireRole } from "@/lib/dal/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit lesson" };

const STATUS_STYLES = {
  ready: "bg-success-soft text-success-ink border-success/25",
  draft: "bg-canvas text-ink-muted border-line",
  pending: "bg-warning-soft text-warning-ink border-warning/25",
} as const;

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const user = await requireRole("owner");
  const { id, lessonId } = await params;
  const [data, course] = await Promise.all([getLessonForEditor(id, lessonId), getCourseForEditor(id)]);
  if (!data || !course) notFound();

  const { lesson, sections, resources, questions } = data;
  const status = lessonDisplayStatus(lesson);
  const missing = lessonMissing(lesson);
  const connected = isBunnyConfigured();
  const isOwner = user.role === "owner";
  const canUpload = hasPermission(user, "courses.upload");

  // Previous / next lesson in course order.
  const ordered = course.sections.flatMap((s) => s.lessons);
  const index = ordered.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const base = `/app/owner/courses/${id}`;

  const captions = lesson.type === "video" && lesson.bunny_video_id && connected ? await getVideoCaptions(lesson.bunny_video_id) : [];
  const embed = lesson.type === "video" && lesson.video_status === "ready" && lesson.bunny_video_id && connected ? signedEmbedUrl(lesson.bunny_video_id) : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/app/owner/courses" className="hover:text-ink">Courses</Link>
        <span aria-hidden="true">/</span>
        <Link href={`${base}?step=curriculum`} className="hover:text-ink">{data.course.title}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">Lesson</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <LessonTypeIcon type={lesson.type} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-brand">{LESSON_TYPES[lesson.type].label}</p>
          <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{lesson.title}</h1>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-sm font-semibold", STATUS_STYLES[status.key])}>{status.label}</span>
        <ButtonLink href={`${base}?step=curriculum`} variant="secondary" size="sm">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to curriculum
        </ButtonLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {lesson.type === "video" && (
            <Card>
              <CardHeader title="Video" description="Duration is detected automatically once processing finishes." />
              <div className="flex flex-col gap-5 p-5">
                {!connected ? (
                  <VideoHostingNotice connected={false} isOwner={isOwner} />
                ) : (
                  <>
                    {embed ? (
                      <div className="aspect-video overflow-hidden rounded-control bg-ink">
                        <iframe src={embed} title={`Video: ${lesson.title}`} className="size-full border-0" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="origin" />
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-control border border-dashed border-line bg-canvas p-6 text-center text-sm text-ink-muted">
                        {lesson.video_status === "processing"
                          ? "Bunny is processing the video. This page updates automatically when it's ready."
                          : "Upload a video file to get started. MP4 (H.264) works best."}
                      </div>
                    )}
                    {canUpload && <VideoUploader targetId={lesson.id} status={lesson.video_status} durationSeconds={lesson.duration_seconds} />}
                  </>
                )}
              </div>
            </Card>
          )}

          {lesson.type === "video" && connected && lesson.bunny_video_id && (
            <Card>
              <CardHeader title="Captions" description="Upload subtitles as .vtt or .srt files." />
              <div className="p-5">
                <CaptionsManager courseId={id} lessonId={lesson.id} captions={captions} />
              </div>
            </Card>
          )}

          {lesson.type === "text" && (
            <Card>
              <CardHeader title="Content" />
              <div className="p-5"><TextContentForm courseId={id} lesson={lesson} /></div>
            </Card>
          )}

          {lesson.type === "assignment" && (
            <Card>
              <CardHeader title="Assignment" description="Learner submissions and reviews arrive in Phase 3." />
              <div className="p-5"><AssignmentForm courseId={id} lesson={lesson} /></div>
            </Card>
          )}

          {lesson.type === "quiz" && (
            <Card>
              <CardHeader title="Questions" description="Multiple choice. Learners see the explanation after answering." />
              <div className="p-5">
                <QuizBuilder courseId={id} lessonId={lesson.id} questions={questions} passPercent={lesson.settings.passPercent ?? 70} />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title={lesson.type === "resource" ? "Files" : "Resources"}
              description={lesson.type === "resource" ? "The files learners download in this lesson." : "Optional downloads that go with this lesson."}
            />
            <div className="p-5">
              <ResourcesManager courseId={id} lessonId={lesson.id} resources={resources} canUpload={canUpload} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Lesson details" />
            <div className="p-5">
              <LessonDetailsForm courseId={id} lesson={lesson} sections={sections} missing={missing} />
            </div>
          </Card>
          {lesson.is_preview && course.status === "published" && lesson.status === "published" && (
            <ButtonLink href={`/courses/${course.slug}/preview/${lesson.id}`} target="_blank" variant="secondary" size="sm" className="w-fit">
              <ExternalLink className="size-4" aria-hidden="true" /> Open the free preview
            </ButtonLink>
          )}
          <nav aria-label="Other lessons" className="flex justify-between gap-2">
            {prev ? (
              <Link href={`${base}/lessons/${prev.id}`} className="flex min-w-0 items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
                <ChevronLeft className="size-4 shrink-0" aria-hidden="true" /> <span className="truncate">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`${base}/lessons/${next.id}`} className="flex min-w-0 items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
                <span className="truncate">{next.title}</span> <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
