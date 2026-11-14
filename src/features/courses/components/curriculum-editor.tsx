"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Eye, EyeOff, GripVertical, Loader2, Pencil, Plus, Send, Trash2, Undo2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { formatDuration } from "@/lib/courses/format";
import { LESSON_TYPES, LESSON_TYPE_ORDER, lessonDisplayStatus, lessonSeconds, lessonSummary } from "@/lib/courses/lessons";
import type { Lesson, LessonType, Section } from "@/lib/courses/types";
import { cn } from "@/lib/utils";
import {
  addLessonAction,
  addSectionAction,
  deleteLessonAction,
  deleteSectionAction,
  renameSectionAction,
  reorderCurriculumAction,
  setLessonPreviewAction,
  setLessonStatusAction,
  setSectionLessonsStatusAction,
  type ActionResult,
} from "../curriculum-actions";
import { refreshVideoStatusAction } from "../video-actions";
import { LessonTypeIcon } from "./lesson-type-icon";

type Run = (fn: () => Promise<ActionResult>) => Promise<ActionResult>;
type Layout = { order: string[]; items: Record<string, string[]> };

const STATUS_STYLES = {
  ready: "bg-success-soft text-success-ink border-success/25",
  draft: "bg-canvas text-ink-muted border-line",
  pending: "bg-warning-soft text-warning-ink border-warning/25",
} as const;

function layoutFrom(sections: Section[]): Layout {
  return {
    order: sections.map((s) => s.id),
    items: Object.fromEntries(sections.map((s) => [s.id, s.lessons.map((l) => l.id)])),
  };
}

function serialise(layout: Layout) {
  return JSON.stringify(layout.order.map((id) => [id, layout.items[id] ?? []]));
}

// ------------------------------------------------------------------ lesson row

function LessonRow({ courseId, lesson, run, busy }: { courseId: string; lesson: Lesson; run: Run; busy: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: "lesson" },
  });
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = lessonDisplayStatus(lesson);
  const editHref = `/app/owner/courses/${courseId}/lessons/${lesson.id}`;
  const previewable = LESSON_TYPES[lesson.type].previewable;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative bg-surface", isDragging && "z-10 rounded-control opacity-80 shadow-float ring-2 ring-brand")}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink active:cursor-grabbing"
          aria-label={`Reorder lesson: ${lesson.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <LessonTypeIcon type={lesson.type} />
        <div className="min-w-0 flex-1">
          <Link href={editHref} className="block truncate font-semibold text-ink hover:text-brand">
            {lesson.title}
          </Link>
          <p className="truncate text-sm text-ink-muted">
            {lessonSummary(lesson)}
            {lesson.is_preview && previewable && <span className="ml-2 font-semibold text-brand">Free preview</span>}
          </p>
        </div>
        <span className={cn("hidden shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:inline-flex", STATUS_STYLES[status.key])}>
          {status.label}
        </span>
        {lesson.status === "draft" && (
          <Button size="sm" variant="secondary" className="hidden md:inline-flex" disabled={busy} onClick={() => void run(() => setLessonStatusAction(courseId, lesson.id, "published"))}>
            Publish
          </Button>
        )}
        <Menu
          label={`Actions for ${lesson.title}`}
          items={[
            { label: "Edit lesson", icon: <Pencil className="size-4" />, onSelect: () => router.push(editHref) },
            lesson.status === "draft"
              ? { label: "Publish lesson", icon: <Send className="size-4" />, onSelect: () => void run(() => setLessonStatusAction(courseId, lesson.id, "published")) }
              : { label: "Move to draft", icon: <Undo2 className="size-4" />, onSelect: () => void run(() => setLessonStatusAction(courseId, lesson.id, "draft")) },
            ...(previewable
              ? [
                  lesson.is_preview
                    ? { label: "Turn off free preview", icon: <EyeOff className="size-4" />, onSelect: () => void run(() => setLessonPreviewAction(courseId, lesson.id, false)) }
                    : { label: "Make free preview", icon: <Eye className="size-4" />, onSelect: () => void run(() => setLessonPreviewAction(courseId, lesson.id, true)) },
                ]
              : []),
            { separator: true as const },
            { label: "Delete lesson", icon: <Trash2 className="size-4" />, danger: true, onSelect: () => setConfirmDelete(true) },
          ]}
        />
      </div>
      {/* Mobile status */}
      <div className="flex items-center gap-2 px-4 pb-3 sm:hidden">
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[status.key])}>{status.label}</span>
      </div>
      {confirmDelete && (
        <div role="alert" className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          <span className="flex-1">Delete “{lesson.title}” with its video, files and questions? This can't be undone.</span>
          <Button size="sm" variant="destructive" loading={busy} onClick={() => void run(() => deleteLessonAction(courseId, lesson.id))}>Delete lesson</Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      )}
    </li>
  );
}

// ------------------------------------------------------------------ add lesson

function AddLesson({ courseId, sectionId, run, busy }: { courseId: string; sectionId: string; run: Run; busy: boolean }) {
  const [type, setType] = useState<LessonType | null>(null);
  const [picking, setPicking] = useState(false);
  const [title, setTitle] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!type || !title.trim()) return;
    const result = await run(() => addLessonAction(courseId, sectionId, title, type));
    if (result.ok) {
      setTitle("");
      setType(null);
    }
  }

  if (type) {
    return (
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-canvas py-1 pl-1 pr-3 text-sm font-semibold text-ink">
          <LessonTypeIcon type={type} size="sm" /> {LESSON_TYPES[type].label}
        </span>
        <label className="sr-only" htmlFor={`new-lesson-${sectionId}`}>Lesson title</label>
        <input
          id={`new-lesson-${sectionId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          maxLength={160}
          autoFocus
          className="h-10 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted/70 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
        />
        <Button type="submit" size="sm" disabled={busy || !title.trim()} className="h-10">Add lesson</Button>
        <Button size="sm" variant="tertiary" className="h-10" onClick={() => { setType(null); setTitle(""); }}>Cancel</Button>
      </form>
    );
  }

  return (
    <div>
      <Button size="sm" variant="secondary" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
        {picking ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
        {picking ? "Close" : "Add lesson"}
      </Button>
      {picking && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Choose a lesson type">
          {LESSON_TYPE_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setPicking(false); }}
              className="flex items-start gap-3 rounded-control border border-line bg-surface p-3 text-left hover:border-brand hover:bg-brand-soft/50"
            >
              <LessonTypeIcon type={t} />
              <span>
                <span className="block text-sm font-semibold text-ink">{LESSON_TYPES[t].label}</span>
                <span className="block text-xs text-ink-muted">{LESSON_TYPES[t].description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ section

function SectionCard({
  courseId,
  section,
  index,
  lessons,
  run,
  busy,
}: {
  courseId: string;
  section: Section;
  index: number;
  lessons: Lesson[];
  run: Run;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { type: "section" },
  });
  const { setNodeRef: setZoneRef, isOver } = useDroppable({ id: `zone:${section.id}`, data: { type: "zone", sectionId: section.id } });
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(section.title);
  const seconds = lessons.reduce((s, l) => s + lessonSeconds(l), 0);
  const hasDrafts = lessons.some((l) => l.status === "draft");

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`Section ${index + 1}: ${section.title}`}
      className={cn("rounded-card border border-line bg-surface", isDragging && "z-20 opacity-90 shadow-float ring-2 ring-brand")}
    >
      <header className="flex flex-wrap items-center gap-3 rounded-t-card border-b border-line bg-canvas/60 px-3 py-3 sm:px-4">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-ink-muted hover:bg-surface hover:text-ink active:cursor-grabbing"
          aria-label={`Reorder section: ${section.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run(() => renameSectionAction(courseId, section.id, title));
              if (r.ok) setRenaming(false);
            }}
          >
            <label className="sr-only" htmlFor={`st-${section.id}`}>Section title</label>
            <input id={`st-${section.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus className="h-9 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm" />
            <Button type="submit" size="sm" disabled={busy}><Check className="size-4" aria-hidden="true" /> Save</Button>
            <Button size="sm" variant="tertiary" onClick={() => { setTitle(section.title); setRenaming(false); }}>Cancel</Button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-ink">
              <span className="text-ink-muted">Section {index + 1} —</span> {section.title}
            </h3>
            <p className="text-xs text-ink-muted">
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"}{seconds ? `, ${formatDuration(seconds)}` : ""}
            </p>
          </div>
        )}
        {!renaming && (
          <Menu
            label={`Actions for section ${section.title}`}
            items={[
              { label: "Rename section", icon: <Pencil className="size-4" />, onSelect: () => setRenaming(true) },
              { label: "Publish all lessons", icon: <Send className="size-4" />, disabled: !hasDrafts, onSelect: () => void run(() => setSectionLessonsStatusAction(courseId, section.id, "published")) },
              { label: "Move all lessons to draft", icon: <Undo2 className="size-4" />, disabled: lessons.length === 0, onSelect: () => void run(() => setSectionLessonsStatusAction(courseId, section.id, "draft")) },
              { separator: true as const },
              { label: lessons.length ? "Delete section (empty it first)" : "Delete section", icon: <Trash2 className="size-4" />, danger: true, disabled: lessons.length > 0, onSelect: () => void run(() => deleteSectionAction(courseId, section.id)) },
            ]}
          />
        )}
      </header>

      <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ol ref={setZoneRef} className={cn("min-h-14 divide-y divide-line", isOver && lessons.length === 0 && "bg-brand-soft/50")}>
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} courseId={courseId} lesson={lesson} run={run} busy={busy} />
          ))}
          {lessons.length === 0 && (
            <li className="px-4 py-4 text-sm text-ink-muted">No lessons yet. Add one below or drag a lesson here.</li>
          )}
        </ol>
      </SortableContext>

      <div className="border-t border-line px-3 py-3 sm:px-4">
        <AddLesson courseId={courseId} sectionId={section.id} run={run} busy={busy} />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ editor

/** Polls Bunny for lessons whose video is still processing. */
function useProcessingPoller(lessons: Lesson[], onChange: () => void) {
  const processing = lessons.filter((l) => l.type === "video" && l.video_status === "processing").map((l) => l.id);
  const key = processing.join(",");
  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const timer = setInterval(async () => {
      const results = await Promise.all(ids.map((id) => refreshVideoStatusAction(id)));
      if (results.some((r) => r.ok && r.status && r.status !== "processing")) onChange();
    }, 10000);
    return () => clearInterval(timer);
  }, [key, onChange]);
}

export function CurriculumEditor({ courseId, sections, videoNotice }: { courseId: string; sections: Section[]; videoNotice?: ReactNode }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [newSection, setNewSection] = useState("");

  const lessonsById = useMemo(
    () => Object.fromEntries(sections.flatMap((s) => s.lessons).map((l) => [l.id, l])) as Record<string, Lesson>,
    [sections],
  );
  const sectionsById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])) as Record<string, Section>, [sections]);

  const serverLayout = useMemo(() => layoutFrom(sections), [sections]);
  const [layout, setLayout] = useState<Layout>(serverLayout);
  const layoutRef = useRef<Layout>(layout);
  const savedRef = useRef<string>(serialise(serverLayout));
  layoutRef.current = layout;

  // Whenever the server sends a new curriculum, adopt it.
  useEffect(() => {
    setLayout(serverLayout);
    savedRef.current = serialise(serverLayout);
  }, [serverLayout]);

  const refresh = useMemo(() => () => startTransition(() => router.refresh()), [router]);
  useProcessingPoller(Object.values(lessonsById), refresh);

  const run: Run = async (fn) => {
    setError(null);
    const result = await fn();
    if (!result.ok) setError(result.error);
    else refresh();
    return result;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collision: CollisionDetection = (args) => {
    if (args.active.data.current?.type === "section") {
      return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === "section") });
    }
    const targets = args.droppableContainers.filter((c) => c.data.current?.type !== "section");
    const hits = pointerWithin({ ...args, droppableContainers: targets });
    if (hits.length) {
      // Prefer a lesson under the pointer over the section's drop zone.
      return [...hits].sort((a, b) => {
        const ta = targets.find((t) => t.id === a.id)?.data.current?.type === "lesson" ? 0 : 1;
        const tb = targets.find((t) => t.id === b.id)?.data.current?.type === "lesson" ? 0 : 1;
        return ta - tb;
      });
    }
    return closestCorners({ ...args, droppableContainers: targets });
  };

  function sectionOf(lessonId: string, l: Layout = layoutRef.current) {
    return l.order.find((sid) => l.items[sid]?.includes(lessonId));
  }

  async function persist(next: Layout) {
    const s = serialise(next);
    if (s === savedRef.current) return;
    setSaveState("saving");
    const result = await reorderCurriculumAction(
      courseId,
      next.order.map((id) => ({ id, lessons: next.items[id] ?? [] })),
    );
    if (!result.ok) {
      setError(result.error);
      setSaveState("idle");
      setLayout(serverLayout);
      return;
    }
    savedRef.current = s;
    setSaveState("saved");
    refresh();
  }

  function onDragStart(_e: DragStartEvent) {
    setError(null);
    setSaveState("idle");
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.data.current?.type !== "lesson") return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = sectionOf(activeId);
    const overType = over.data.current?.type;
    const to = overType === "lesson" ? sectionOf(overId) : overType === "zone" ? (over.data.current?.sectionId as string) : undefined;
    if (!from || !to || from === to) return;

    setLayout((prev) => {
      const source = (prev.items[from] ?? []).filter((id) => id !== activeId);
      const target = [...(prev.items[to] ?? [])];
      const overIndex = overType === "lesson" ? target.indexOf(overId) : target.length;
      target.splice(overIndex < 0 ? target.length : overIndex, 0, activeId);
      return { ...prev, items: { ...prev.items, [from]: source, [to]: target } };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = layoutRef.current;
    if (active.data.current?.type === "section") {
      if (!over || active.id === over.id) return;
      const oldIndex = current.order.indexOf(String(active.id));
      const newIndex = current.order.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = { ...current, order: arrayMove(current.order, oldIndex, newIndex) };
      setLayout(next);
      void persist(next);
      return;
    }

    const activeId = String(active.id);
    const sid = sectionOf(activeId, current);
    let next = current;
    if (sid && over && over.data.current?.type === "lesson" && sectionOf(String(over.id), current) === sid) {
      const list = current.items[sid];
      const oldIndex = list.indexOf(activeId);
      const newIndex = list.indexOf(String(over.id));
      if (oldIndex !== newIndex) next = { ...current, items: { ...current.items, [sid]: arrayMove(list, oldIndex, newIndex) } };
    }
    setLayout(next);
    void persist(next);
  }

  async function addSection(e: FormEvent) {
    e.preventDefault();
    if (!newSection.trim()) return;
    const result = await run(() => addSectionAction(courseId, newSection));
    if (result.ok) setNewSection("");
  }

  const totalLessons = sections.reduce((n, s) => n + s.lessons.length, 0);

  return (
    <div className="flex flex-col gap-4">
      {videoNotice}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {sections.length} section{sections.length === 1 ? "" : "s"}, {totalLessons} lesson{totalLessons === 1 ? "" : "s"}. Drag the handles to reorder, or move lessons between sections.
        </p>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted" aria-live="polite">
          {saveState === "saving" && (<><Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Saving order…</>)}
          {saveState === "saved" && (<><Check className="size-3.5 text-success" aria-hidden="true" /> Order saved</>)}
        </span>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}

      {sections.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-surface p-6 text-sm text-ink-muted">
          Start with a section such as “Introduction”, then add lessons to it.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <SortableContext items={layout.order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-4">
              {layout.order.map((sid, i) => {
                const section = sectionsById[sid];
                if (!section) return null;
                const lessons = (layout.items[sid] ?? []).map((id) => lessonsById[id]).filter(Boolean);
                return <SectionCard key={sid} courseId={courseId} section={section} index={i} lessons={lessons} run={run} busy={busy} />;
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <form onSubmit={addSection} className="flex flex-wrap gap-2 rounded-card border border-dashed border-line bg-surface p-4">
        <label className="sr-only" htmlFor="new-section">New section title</label>
        <input
          id="new-section"
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="New section title, e.g. Introduction"
          maxLength={120}
          className="h-10 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted/70 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
        />
        <Button type="submit" size="sm" className="h-10" disabled={busy || !newSection.trim()}>
          <Plus className="size-4" aria-hidden="true" /> Add section
        </Button>
      </form>
    </div>
  );
}
