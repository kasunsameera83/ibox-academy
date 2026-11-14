import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { publishChecklist } from "@/lib/courses/checklist";
import type { CourseWithCurriculum } from "@/lib/courses/types";
import { changeCourseStatusAction, deleteDraftCourseAction } from "../actions";

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
  const ready = checklist.every((i) => i.done);
  const remaining = checklist.filter((i) => !i.done).length;
  const isLive = course.status === "published";

  return (
    <div className="flex flex-col gap-6">
      {done && DONE_MESSAGES[done] && <Alert tone="success">{DONE_MESSAGES[done]}</Alert>}
      {error && ERROR_MESSAGES[error] && <Alert tone="danger">{ERROR_MESSAGES[error]}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-ink">Current status</span>
        <StatusBadge status={course.status} />
        <ButtonLink href={`/courses/${course.slug}`} target="_blank" variant="secondary" size="sm">
          <ExternalLink className="size-4" aria-hidden="true" /> Preview as a learner
        </ButtonLink>
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">Publish checklist</h3>
        <p className="text-sm text-ink-muted">
          {ready ? "Everything is in place." : `${remaining} item${remaining === 1 ? "" : "s"} left before this course can go live.`}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="size-5 shrink-0 text-line" aria-hidden="true" />
              )}
              <span className={item.done ? "text-ink" : "text-ink-muted"}>
                {item.label}
                <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
              </span>
              {!item.done && (
                <Link href={`?step=${item.step}`} className="text-xs font-semibold text-brand hover:underline">Fix</Link>
              )}
            </li>
          ))}
        </ul>
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
              <p className="text-sm text-ink-muted">The Publish button appears when the checklist is complete.</p>
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
