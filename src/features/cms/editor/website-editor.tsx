"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Monitor, Plus, Search as SearchIcon, Smartphone, Tablet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSection, SECTION_LIBRARY } from "@/lib/cms/defaults";
import { pageContentSchema, type PageContent, type Section, type SectionType } from "@/lib/cms/schema";
import type { CourseOption, EditorPage, MediaAsset } from "@/lib/dal/cms";
import { cn } from "@/lib/utils";
import { DraftToolbar, stable, useDraft } from "./draft-controls";
import { IconBtn } from "./fields";
import { hasStarterNotes, SectionForm, SeoForm, type FormContext } from "./section-forms";

export type Device = "desktop" | "tablet" | "mobile";
export const DEVICES: Record<Device, { width: number; label: string; Icon: typeof Monitor }> = {
  desktop: { width: 1280, label: "Desktop", Icon: Monitor },
  tablet: { width: 820, label: "Tablet", Icon: Tablet },
  mobile: { width: 390, label: "Mobile", Icon: Smartphone },
};
const SEO = "__seo";

/** Drops blank lines from one-per-line lists before saving. */
function clean(content: PageContent): PageContent {
  const lines = (l: string[]) => l.map((x) => x.trim()).filter(Boolean);
  return {
    ...content,
    sections: content.sections.map((s) => {
      if (s.type === "hero") return { ...s, data: { ...s.data, reassurance: lines(s.data.reassurance), phone: { ...s.data.phone, upNext: lines(s.data.phone.upNext) } } };
      if (s.type === "topics") return { ...s, data: { ...s.data, items: lines(s.data.items) } };
      return s;
    }),
  };
}

/** One-line summary under each section name in the outline. */
function summary(s: Section): string {
  switch (s.type) {
    case "hero": return s.data.headline;
    case "topics": return s.data.source === "categories" ? "Your categories" : `${s.data.items.filter(Boolean).length} topics`;
    case "courses": return s.data.mode === "newest" ? `${s.data.title} · newest ${s.data.limit}` : `${s.data.title} · ${s.data.courseIds.length} picked`;
    case "steps": return `${s.data.title} · ${s.data.items.length} steps`;
    case "features": return `${s.data.title} · ${s.data.items.length} blocks`;
    case "testimonials": return s.data.items.length ? `${s.data.items.length} quotes` : "No quotes yet (hidden)";
    case "faq": return `${s.data.items.length} questions`;
    case "cta": return s.data.headline;
    case "intro": return s.data.title;
    case "text": return s.data.title || s.data.body.slice(0, 60);
    case "contact": return s.data.title;
  }
}

// ---------------------------------------------------------------- outline row

function OutlineRow({
  section, index, count, selected, onSelect, onToggle, onMove, canEdit,
}: {
  section: Section; index: number; count: number; selected: boolean; canEdit: boolean;
  onSelect: () => void; onToggle: () => void; onMove: (to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section.id, disabled: !canEdit });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1 rounded-tile border bg-surface py-1.5 pl-1 pr-1.5",
        selected ? "border-brand ring-2 ring-brand/20" : "border-line",
        isDragging && "z-10 shadow-float",
        !section.enabled && "bg-canvas",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag to reorder ${SECTION_LIBRARY[section.type].label}`}
        disabled={!canEdit}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button type="button" onClick={onSelect} aria-current={selected || undefined} className="min-w-0 flex-1 rounded-[8px] px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-brand">
        <span className={cn("block text-sm font-semibold", section.enabled ? "text-ink" : "text-ink-muted line-through")}>{SECTION_LIBRARY[section.type].label}</span>
        <span className="block truncate text-xs text-ink-muted">{summary(section)}</span>
      </button>
      <div className="flex shrink-0 items-center opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <IconBtn label="Move up" disabled={!canEdit || index === 0} onClick={() => onMove(index - 1)}><ArrowUp className="size-4" /></IconBtn>
        <IconBtn label="Move down" disabled={!canEdit || index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown className="size-4" /></IconBtn>
      </div>
      <IconBtn label={section.enabled ? "Hide section" : "Show section"} disabled={!canEdit} onClick={onToggle}>
        {section.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </IconBtn>
    </li>
  );
}

// ---------------------------------------------------------------- preview

export function Preview({ slug, device, reloadKey }: { slug: string; device: Device; reloadKey: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const width = DEVICES[device].width;
  const scale = box.w ? Math.min(1, (box.w - 32) / width) : 1;
  return (
    <div ref={boxRef} className="relative h-full min-h-[480px] overflow-hidden bg-[color-mix(in_oklab,var(--color-canvas),var(--color-ink)_6%)]">
      {box.w > 0 && (
        <iframe
          key={reloadKey}
          title={`Preview: ${DEVICES[device].label}`}
          src={`/cms-preview/${slug}?r=${reloadKey}`}
          className="absolute left-1/2 top-4 origin-top rounded-[12px] border border-line bg-canvas shadow-float"
          style={{ width, height: Math.max(400, (box.h - 32) / scale), transform: `translateX(-50%) scale(${scale})` }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- editor

export function WebsiteEditor({
  page, media, courses, canEdit, canPublish, pageLabel, publicPath, sectionTypes,
}: {
  page: EditorPage; media: MediaAsset[]; courses: CourseOption[]; canEdit: boolean; canPublish: boolean;
  pageLabel: string; publicPath: string; sectionTypes: SectionType[];
}) {
  const draft = useDraft<PageContent>({
    slug: page.slug,
    initial: page.draft,
    savedAt: page.draftUpdatedAt,
    canEdit,
    prepare: clean,
    check: (value) => {
      const parsed = pageContentSchema.safeParse(value);
      if (parsed.success) return null;
      const issue = parsed.error.issues[0];
      const idx = typeof issue?.path[1] === "number" ? issue.path[1] : -1;
      const where = issue?.path[0] === "sections" && idx >= 0 && value.sections[idx] ? SECTION_LIBRARY[value.sections[idx].type].label : "Page settings";
      return `${where}: fill in the required fields to save.`;
    },
  });
  const content = draft.value;
  const setContent = draft.setValue;
  const [selected, setSelected] = useState<string>(page.draft.sections[0]?.id ?? SEO);
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"outline" | "edit" | "preview">("outline");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const ctx: FormContext = { media, courses, canEdit };
  const differsFromLive = page.published ? stable(clean(content)) !== stable(page.published) : true;
  const hasNotes = hasStarterNotes(content);

  // ---- section operations
  const update = (s: Section) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === s.id ? s : x)) }));
  const moveTo = (from: number, to: number) => setContent((c) => (to < 0 || to >= c.sections.length ? c : { ...c, sections: arrayMove(c.sections, from, to) }));
  const toggle = (id: string) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) }));
  const add = (type: SectionType) => {
    const s = createSection(type);
    setContent((c) => {
      const at = c.sections.findIndex((x) => x.id === selected);
      const sections = [...c.sections];
      sections.splice(type === "hero" || type === "intro" ? 0 : at >= 0 ? at + 1 : sections.length, 0, s);
      return { ...c, sections };
    });
    setSelected(s.id);
    setTab("edit");
  };
  const remove = (id: string) => {
    setContent((c) => ({ ...c, sections: c.sections.filter((x) => x.id !== id) }));
    setSelected(SEO);
    setConfirmRemove(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = content.sections.findIndex((s) => s.id === e.active.id);
    const to = content.sections.findIndex((s) => s.id === e.over!.id);
    moveTo(from, to);
  }

  const current = content.sections.find((s) => s.id === selected);
  const used = new Set(content.sections.map((s) => s.type));

  return (
    <div className="flex flex-col gap-4">
      <DraftToolbar
        slug={page.slug}
        label={pageLabel}
        publicPath={publicPath}
        previewHref={`/cms-preview/${page.slug}`}
        draft={draft}
        differsFromLive={differsFromLive}
        publishedAt={page.publishedAt}
        publishedBy={page.publishedBy}
        versions={page.versions}
        canEdit={canEdit}
        canPublish={canPublish}
        extra={
          <div role="group" aria-label="Preview size" className="hidden items-center rounded-full border border-line p-0.5 lg:flex">
            {(Object.keys(DEVICES) as Device[]).map((d) => {
              const { Icon, label } = DEVICES[d];
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={device === d}
                  title={label}
                  onClick={() => setDevice(d)}
                  className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold", device === d ? "bg-ink text-white" : "text-ink hover:bg-ink/5")}
                >
                  <Icon className="size-4" aria-hidden="true" /> <span className="sr-only xl:not-sr-only">{label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {hasNotes && (
        <p className="rounded-tile bg-block-lemon px-4 py-3 text-sm text-ink">
          This page still has starter notes in [square brackets]. Replace them with your own words before you publish.
        </p>
      )}

      {/* Mobile: one panel at a time */}
      <div role="tablist" aria-label="Editor panels" className="flex rounded-full border border-line bg-surface p-0.5 lg:hidden">
        {(["outline", "edit", "preview"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("h-9 flex-1 rounded-full text-sm font-semibold", tab === t ? "bg-ink text-white" : "text-ink")}
          >
            {t === "outline" ? "Sections" : t === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:h-[calc(100dvh-14rem)] lg:min-h-[640px] lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        {/* Outline */}
        <aside className={cn("flex min-h-0 flex-col gap-3 rounded-card border border-line bg-surface p-3", tab !== "outline" && "hidden lg:flex")}>
          <button
            type="button"
            onClick={() => { setSelected(SEO); setTab("edit"); }}
            aria-current={selected === SEO || undefined}
            className={cn("flex items-center gap-2 rounded-tile border px-3 py-2.5 text-left", selected === SEO ? "border-brand ring-2 ring-brand/20" : "border-line hover:bg-canvas")}
          >
            <SearchIcon className="size-4 text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">Page settings &amp; SEO</span>
          </button>

          <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Sections, top to bottom</p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={content.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-1.5">
                  {content.sections.map((s, i) => (
                    <OutlineRow
                      key={s.id}
                      section={s}
                      index={i}
                      count={content.sections.length}
                      selected={selected === s.id}
                      canEdit={canEdit}
                      onSelect={() => { setSelected(s.id); setConfirmRemove(false); setTab("edit"); }}
                      onToggle={() => toggle(s.id)}
                      onMove={(to) => moveTo(i, to)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {canEdit && (
            <details className="group rounded-tile border border-dashed border-ink/25">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                <Plus className="size-4" aria-hidden="true" /> Add section
              </summary>
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto border-t border-line p-1.5">
                {sectionTypes.map((type) => {
                  const lib = SECTION_LIBRARY[type];
                  const blocked = Boolean(lib.single && used.has(type));
                  return (
                    <li key={type}>
                      <button
                        type="button"
                        disabled={blocked || content.sections.length >= 20}
                        onClick={(e) => { add(type); (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; }}
                        className="w-full rounded-[10px] px-2.5 py-2 text-left hover:bg-canvas disabled:opacity-40"
                      >
                        <span className="block text-sm font-semibold text-ink">{lib.label}</span>
                        <span className="block text-xs text-ink-muted">{blocked ? "Already on the page" : lib.description}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </aside>

        {/* Preview */}
        <section aria-label="Preview" className={cn("min-h-[70dvh] overflow-hidden rounded-card border border-line lg:min-h-0", tab !== "preview" && "hidden lg:block")}>
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 lg:hidden">
            {(Object.keys(DEVICES) as Device[]).map((d) => (
              <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={cn("h-8 flex-1 rounded-full text-xs font-semibold", device === d ? "bg-ink text-white" : "text-ink")}>
                {DEVICES[d].label}
              </button>
            ))}
          </div>
          <Preview slug={page.slug} device={device} reloadKey={draft.reloadKey} />
        </section>

        {/* Properties */}
        <aside className={cn("flex min-h-0 flex-col rounded-card border border-line bg-surface", tab !== "edit" && "hidden lg:flex")}>
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-ink">{current ? SECTION_LIBRARY[current.type].label : "Page settings & SEO"}</h3>
              {current && <p className="truncate text-xs text-ink-muted">Link to it with #{current.id}</p>}
            </div>
            {current && canEdit && (
              confirmRemove ? (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="destructive" onClick={() => remove(current.id)}>Remove</Button>
                  <Button size="sm" variant="tertiary" onClick={() => setConfirmRemove(false)}>Keep</Button>
                </div>
              ) : (
                <IconBtn label="Remove section" onClick={() => setConfirmRemove(true)}><Trash2 className="size-4" /></IconBtn>
              )
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {current ? (
              <>
                {!current.enabled && <p className="rounded-tile bg-canvas px-3 py-2 text-sm text-ink-muted">This section is hidden. Use the eye in the outline to show it.</p>}
                <SectionForm key={current.id} section={current} onChange={update} ctx={ctx} />
              </>
            ) : (
              <SeoForm seo={content.seo} onChange={(seo) => setContent((c) => ({ ...c, seo }))} ctx={ctx} />
            )}
          </div>
        </aside>
      </div>

    </div>
  );
}
