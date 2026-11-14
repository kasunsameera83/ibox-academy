"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/courses/format";
import type { Lesson, Section } from "@/lib/courses/types";
import { cn } from "@/lib/utils";
import {
  addLessonAction,
  addSectionAction,
  deleteLessonAction,
  deleteSectionAction,
  moveLessonAction,
  moveSectionAction,
  renameSectionAction,
  updateLessonAction,
  type ActionResult,
} from "../curriculum-actions";
import { VideoUploader } from "./video-uploader";

function IconButton({ label, onClick, disabled, children, danger }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-control text-ink-muted hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "hover:text-danger-ink" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Small inline form: one text field + submit. */
function InlineAdd({ placeholder, buttonLabel, onSubmit, disabled }: { placeholder: string; buttonLabel: string; onSubmit: (value: string) => Promise<boolean>; disabled?: boolean }) {
  const [value, setValue] = useState("");
  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    if (await onSubmit(value)) setValue("");
  }
  return (
    <form onSubmit={handle} className="flex gap-2">
      <label className="sr-only" htmlFor={`add-${placeholder}`}>{placeholder}</label>
      <input
        id={`add-${placeholder}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={160}
        className="h-10 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted/70 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={disabled || !value.trim()} className="h-10">
        <Plus className="size-4" aria-hidden="true" /> {buttonLabel}
      </Button>
    </form>
  );
}

function LessonRow({
  courseId,
  sectionId,
  lesson,
  index,
  isFirst,
  isLast,
  run,
  pending,
}: {
  courseId: string;
  sectionId: string;
  lesson: Lesson;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  run: (fn: () => Promise<ActionResult>) => Promise<boolean>;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (await run(() => updateLessonAction(courseId, lesson.id, { title, description }))) setEditing(false);
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-1.5 w-6 text-xs font-semibold tabular-nums text-ink-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{lesson.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <VideoUploader lessonId={lesson.id} status={lesson.video_status} durationSeconds={lesson.duration_seconds} />
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={lesson.is_preview}
                disabled={pending}
                onChange={(e) => void run(() => updateLessonAction(courseId, lesson.id, { isPreview: e.target.checked }))}
                className="size-4 accent-[var(--brand-primary)]"
              />
              <Eye className="size-3.5 text-ink-muted" aria-hidden="true" /> Free preview
            </label>
          </div>
        </div>
        <div className="flex items-center">
          <IconButton label="Edit lesson" onClick={() => setEditing((v) => !v)}><Pencil className="size-4" /></IconButton>
          <IconButton label="Move lesson up" disabled={isFirst || pending} onClick={() => void run(() => moveLessonAction(courseId, sectionId, lesson.id, "up"))}><ArrowUp className="size-4" /></IconButton>
          <IconButton label="Move lesson down" disabled={isLast || pending} onClick={() => void run(() => moveLessonAction(courseId, sectionId, lesson.id, "down"))}><ArrowDown className="size-4" /></IconButton>
          <IconButton label="Delete lesson" danger disabled={pending} onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /></IconButton>
        </div>
      </div>

      {confirmDelete && (
        <div className="ml-9 mt-3 flex flex-wrap items-center gap-3 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger-ink" role="alert">
          Delete “{lesson.title}” and its video? This can't be undone.
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" loading={pending} onClick={() => void run(() => deleteLessonAction(courseId, lesson.id))}>Delete lesson</Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="ml-9 mt-3 flex flex-col gap-3 rounded-control border border-line bg-canvas p-3">
          <label className="text-xs font-semibold text-ink" htmlFor={`lt-${lesson.id}`}>Lesson title</label>
          <input
            id={`lt-${lesson.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            className="h-10 rounded-control border border-line bg-surface px-3 text-sm"
          />
          <label className="text-xs font-semibold text-ink" htmlFor={`ld-${lesson.id}`}>Lesson notes (shown under the video)</label>
          <textarea
            id={`ld-${lesson.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
            className="rounded-control border border-line bg-surface px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending}>Save lesson</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </li>
  );
}

function SectionCard({
  courseId,
  section,
  index,
  total,
  run,
  pending,
}: {
  courseId: string;
  section: Section;
  index: number;
  total: number;
  run: (fn: () => Promise<ActionResult>) => Promise<boolean>;
  pending: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(section.title);
  const seconds = section.lessons.reduce((s, l) => s + l.duration_seconds, 0);

  return (
    <section className="rounded-card border border-line bg-surface" aria-label={`Section ${index + 1}: ${section.title}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <span className="text-xs font-bold text-brand">Section {index + 1}</span>
        {renaming ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => renameSectionAction(courseId, section.id, title))) setRenaming(false);
            }}
          >
            <label className="sr-only" htmlFor={`st-${section.id}`}>Section title</label>
            <input id={`st-${section.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="h-9 min-w-0 flex-1 rounded-control border border-line px-3 text-sm" autoFocus />
            <Button type="submit" size="sm" loading={pending}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => { setTitle(section.title); setRenaming(false); }}>Cancel</Button>
          </form>
        ) : (
          <h3 className="min-w-0 flex-1 truncate font-bold text-ink">{section.title}</h3>
        )}
        <span className="text-xs text-ink-muted">
          {section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}{seconds ? `, ${formatDuration(seconds)}` : ""}
        </span>
        <div className="flex items-center">
          <IconButton label="Rename section" onClick={() => setRenaming(true)}><Pencil className="size-4" /></IconButton>
          <IconButton label="Move section up" disabled={index === 0 || pending} onClick={() => void run(() => moveSectionAction(courseId, section.id, "up"))}><ArrowUp className="size-4" /></IconButton>
          <IconButton label="Move section down" disabled={index === total - 1 || pending} onClick={() => void run(() => moveSectionAction(courseId, section.id, "down"))}><ArrowDown className="size-4" /></IconButton>
          <IconButton label="Delete section" danger disabled={pending || section.lessons.length > 0} onClick={() => void run(() => deleteSectionAction(courseId, section.id))}><Trash2 className="size-4" /></IconButton>
        </div>
      </header>

      {section.lessons.length > 0 ? (
        <ol className="divide-y divide-line">
          {section.lessons.map((lesson, i) => (
            <LessonRow
              key={lesson.id}
              courseId={courseId}
              sectionId={section.id}
              lesson={lesson}
              index={i}
              isFirst={i === 0}
              isLast={i === section.lessons.length - 1}
              run={run}
              pending={pending}
            />
          ))}
        </ol>
      ) : (
        <p className="px-4 py-4 text-sm text-ink-muted">No lessons in this section yet.</p>
      )}

      <div className="border-t border-line px-4 py-3">
        <InlineAdd
          placeholder="New lesson title"
          buttonLabel="Add lesson"
          disabled={pending}
          onSubmit={(value) => run(() => addLessonAction(courseId, section.id, value))}
        />
      </div>
    </section>
  );
}

export function CurriculumEditor({ courseId, sections }: { courseId: string; sections: Section[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<ActionResult>): Promise<boolean> {
    setError(null);
    const result = await fn();
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {sections.length === 0 && (
        <p className="text-sm text-ink-muted">
          Start with a section such as “Getting started”, then add lessons and upload a video for each one.
        </p>
      )}
      {sections.map((section, i) => (
        <SectionCard key={section.id} courseId={courseId} section={section} index={i} total={sections.length} run={run} pending={pending} />
      ))}
      <div className="rounded-card border border-dashed border-line bg-surface p-4">
        <InlineAdd
          placeholder="New section title"
          buttonLabel="Add section"
          disabled={pending}
          onSubmit={(value) => run(() => addSectionAction(courseId, value))}
        />
      </div>
    </div>
  );
}
