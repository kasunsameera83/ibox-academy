import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed, ExternalLink } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { isReadyToPublish, publishChecklist } from "@/lib/courses/checklist";
import type { CourseWithCurriculum } from "@/lib/courses/types";
import { changeCourseStatusAction, deleteDraftCourseAction } from "../actions";
import { PreviewCheckedToggle } from "./preview-checked-toggle";

const DONE_MESSAGES: Record<string, string> = {
  publish: "Published. The course is now live in the catalogue.",
  unpublish: "Unpublished. The course is hidden from the catalogue; existing learners keep access.",
  archive: "Archived.",
  restore: "Moved back to draft.",
};

const ERROR_MESSAGES: Record<string, string> = {
  checklist: "Finish every item in the checklist before publishing.",
  status: "The status couldn't be changed. Please try again.",
  delete_not_draft: "Only drafts can be deleted. Archive the course instead.",
  delete_failed: "The course couldn't be deleted. Please try again.",
};

export function PublishPanel({
  course,
  canPublish,
  isOwner,
  done,
  error,
}: {
  course: CourseWithCurriculum;
  canPublish: boolean;
  isOwner: boolean;
  done?: string;
  error?: string;
}) {
  const checklist = publishChecklist(course);
  const ready = isReadyToPublish(checklist);
  const required = checklist.filter((i) => i.required);
  const recommended = checklist.filter((i) => !i.required);
  const remaining = required.filter((i) => !i.done).length;
  const isLive = course.status === "published";

  return (
    <div className="flex flex-col gap-6">
      {done && DONE_MESSAGES[done] && <Alert tone="success">{DONE_MESSAGES[done]}</Alert>}
      {error && ERROR_MESSAGES[error] && <Alert tone="danger">{ERROR_MESSAGES[error]}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-ink">Current status</span>
        <StatusBadge status={course.status} />
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">Publish checklist</h3>
        <p className="text-sm text-ink-muted">
          {ready ? "Everything required is in place." : `${remaining} of ${required.length} required item${remaining === 1 ? "" : "s"} still to do.`}
        </p>
        <ul className="mt-4 flex flex-col divide-y divide-line rounded-card border border-line">
          {[...required, ...recommended].map((item) => (
            <li key={item.key} className="flex items-start gap-3 px-4 py-3">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
              ) : item.required ? (
                <Circle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              ) : (
                <CircleDashed className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className={item.done ? "text-sm font-medium text-ink" : "text-sm font-semibold text-ink"}>
                  {item.label}
                  {!item.required && <span className="ml-2 text-xs font-medium text-ink-muted">Recommended</span>}
                  <span className="sr-only">{item.done ? " (done)" : item.required ? " (required, to do)" : " (recommended, to do)"}</span>
                </p>
                {!item.done && item.detail && <p className="text-xs text-ink-muted">{item.detail}</p>}
              </div>
              {!item.done && item.step !== "publish" && (
                <Link href={`?step=${item.step}`} className="shrink-0 text-xs font-semibold text-brand hover:underline">Fix</Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-card bg-canvas p-4">
        <ButtonLink href={`/courses/${course.slug}`} target="_blank" variant="secondary" size="sm" className="w-fit">
          <ExternalLink className="size-4" aria-hidden="true" /> Open learner preview
        </ButtonLink>
        <PreviewCheckedToggle courseId={course.id} checked={Boolean(course.preview_checked_at)} />
      </div>

      {canPublish ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          {!isLive && course.status !== "archived" && (
            ready ? (
              <ConfirmForm
                action={changeCourseStatusAction}
                fields={{ id: course.id, action: "publish" }}
                trigger="Publish course"
                triggerVariant="primary"
                title={`Publish “${course.title}”?`}
                body="It will appear in the catalogue straight away and learners can preview it. You can unpublish at any time."
                confirmLabel="Publish course"
              />
            ) : (
              <p className="text-sm text-ink-muted">The Publish button appears when every required item is done.</p>
            )
          )}
          {isLive && (
            <ConfirmForm
              action={changeCourseStatusAction}
              fields={{ id: course.id, action: "unpublish" }}
              trigger="Unpublish"
              title="Unpublish this course?"
              body="It will be hidden from the catalogue and can't be bought. Learners who already enrolled keep their access."
              confirmLabel="Unpublish course"
            />
          )}
          {course.status !== "archived" && course.status !== "draft" && (
            <ConfirmForm
              action={changeCourseStatusAction}
              fields={{ id: course.id, action: "archive" }}
              trigger="Archive"
              title="Archive this course?"
              body="It's removed from the catalogue and from your active course list. You can restore it later."
              confirmLabel="Archive course"
            />
          )}
          {(course.status === "archived" || course.status === "unpublished") && (
            <ConfirmForm
              action={changeCourseStatusAction}
              fields={{ id: course.id, action: "restore" }}
              trigger="Move back to draft"
              title="Move back to draft?"
              body="The course stays hidden from learners until you publish it again."
              confirmLabel="Move to draft"
            />
          )}
          {isOwner && course.status === "draft" && (
            <ConfirmForm
              action={deleteDraftCourseAction}
              fields={{ id: course.id }}
              trigger="Delete draft"
              triggerVariant="destructive"
              title={`Delete “${course.title}”?`}
              body="The draft, its lessons, image and uploaded videos are deleted permanently. This can't be undone."
              confirmLabel="Delete draft"
              confirmVariant="destructive"
            />
          )}
        </div>
      ) : (
        <Alert tone="info">Publishing needs the “Publish courses” permission. Ask the Owner to review and publish this course.</Alert>
      )}
    </div>
  );
}
