import { isBunnyConfigured, signedEmbedUrl } from "@/lib/bunny";
import { formatClock } from "@/lib/courses/format";
import type { Course } from "@/lib/courses/types";
import { RemoveIntroButton } from "./remove-intro-button";
import { VideoHostingNotice } from "./video-hosting-notice";
import { VideoUploader } from "./video-uploader";

/** Course intro video (free trailer) in the Overview step. */
export function IntroVideoCard({ course, isOwner, canUpload }: { course: Course; isOwner: boolean; canUpload: boolean }) {
  const connected = isBunnyConfigured();
  const ready = course.intro_video_status === "ready" && course.intro_video_id;
  const embed = connected && ready ? signedEmbedUrl(course.intro_video_id!) : null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          Course intro video <span className="font-normal text-ink-muted">(optional)</span>
        </p>
        <p className="text-xs text-ink-muted">
          A short trailer, ideally 1–2 minutes. Anyone can watch it on the course page without buying.
        </p>
      </div>

      {!connected ? (
        <VideoHostingNotice connected={false} isOwner={isOwner} />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="aspect-video w-full max-w-[280px] overflow-hidden rounded-control border border-line bg-canvas">
            {embed ? (
              <iframe
                src={embed}
                title={`Intro video: ${course.title}`}
                className="size-full border-0"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
              />
            ) : (
              <div className="flex size-full items-center justify-center p-4 text-center text-xs text-ink-muted">
                {course.intro_video_status === "processing" ? "Processing… this updates automatically." : "No intro video yet"}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {canUpload && (
              <VideoUploader
                targetId={course.id}
                kind="course"
                status={course.intro_video_status}
                durationSeconds={course.intro_duration_seconds}
              />
            )}
            {canUpload && course.intro_video_id && course.intro_video_status !== "uploading" && (
              <RemoveIntroButton courseId={course.id} />
            )}
            {ready && course.intro_duration_seconds > 0 && (
              <p className="text-xs text-ink-muted">Length {formatClock(course.intro_duration_seconds)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
