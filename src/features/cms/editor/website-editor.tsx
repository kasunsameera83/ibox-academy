"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown, ArrowUp, Check, Eye, EyeOff, ExternalLink, GripVertical, History, Loader2, Monitor, Plus,
  Search as SearchIcon, Smartphone, Tablet, Trash2, TriangleAlert, X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createSection, SECTION_LIBRARY } from "@/lib/cms/defaults";
import { pageContentSchema, type PageContent, type Section, type SectionType } from "@/lib/cms/schema";
import type { CourseOption, EditorPage, MediaAsset } from "@/lib/dal/cms";
import { cn } from "@/lib/utils";
import { discardDraftAction, publishPageAction, restoreVersionAction, saveDraftAction } from "../actions";
import { IconBtn } from "./fields";
import { SectionForm, SeoForm, type FormContext } from "./section-forms";

type SaveState = "saved" | "unsaved" | "saving" | "invalid" | "error" | "conflict";
type Device = "desktop" | "tablet" | "mobile";
const DEVICES: Record<Device, { width: number; label: string; Icon: typeof Monitor }> = {
  desktop: { width: 1280, label: "Desktop", Icon: Monitor },
  tablet: { width: 820, label: "Tablet", Icon: Tablet },
  mobile: { width: 390, label: "Mobile", Icon: Smartphone },
};
const SEO = "__seo";

/** Key-sorted JSON, so "has it changed?" doesn't depend on key order. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

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
  }
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

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

function Preview({ slug, device, reloadKey }: { slug: string; device: Device; reloadKey: number }) {
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
          src={`/preview/${slug}?r=${reloadKey}`}
          className="absolute left-1/2 top-4 origin-top rounded-[12px] border border-line bg-canvas shadow-float"
          style={{ width, height: Math.max(400, (box.h - 32) / scale), transform: `translateX(-50%) scale(${scale})` }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- editor

export function WebsiteEditor({
  page, media, courses, canEdit, canPublish, pageLabel, publicPath,
}: {
  page: EditorPage; media: MediaAsset[]; courses: CourseOption[]; canEdit: boolean; canPublish: boolean; pageLabel: string; publicPath: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState<PageContent>(page.draft);
  const [savedJson, setSavedJson] = useState(() => (page.draftUpdatedAt ? stable(page.draft) : ""));
  const [expected, setExpected] = useState<string | null>(page.draftUpdatedAt);
  const [state, setState] = useState<SaveState>(page.draftUpdatedAt ? "saved" : "unsaved");
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(page.draft.sections[0]?.id ?? SEO);
  const [device, setDevice] = useState<Device>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<"outline" | "edit" | "preview">("outline");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const publishRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const publishTitle = useId();
  const historyTitle = useId();
  const [note, setNote] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const ctx: FormContext = { media, courses, canEdit };
  const json = useMemo(() => stable(content), [content]);
  const dirty = json !== savedJson;
  const differsFromLive = page.published ? stable(clean(content)) !== stable(page.published) : true;

  // ---- autosave
  const save = useCallback(async () => {
    const cleaned = clean(content);
    const parsed = pageContentSchema.safeParse(cleaned);
    if (!parsed.success) {
      setState("invalid");
      const issue = parsed.error.issues[0];
      const idx = typeof issue?.path[1] === "number" ? issue.path[1] : -1;
      const where = issue?.path[0] === "sections" && idx >= 0 && content.sections[idx] ? SECTION_LIBRARY[content.sections[idx].type].label : "Page settings";
      setMessage(`${where}: fill in the required fields to save.`);
      return;
    }
    setState("saving");
    const res = await saveDraftAction(page.slug, parsed.data, expected);
    if (!res.ok) {
      setState(res.conflict ? "conflict" : "error");
      setMessage(res.error);
      return;
    }
    setExpected(res.updatedAt);
    setSavedJson(stable(content));
    setState("saved");
    setMessage(null);
    setReloadKey((k) => k + 1);
  }, [content, expected, page.slug]);

  useEffect(() => {
    if (!canEdit || !dirty || state === "conflict" || state === "saving") return;
    setState((s) => (s === "invalid" || s === "error" ? s : "unsaved"));
    const t = setTimeout(() => void save(), 1200);
    return () => clearTimeout(t);
    // Re-checked after each save finishes, so edits made while saving are saved too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, canEdit, state]);

  // Unsaved-changes warning when leaving the page.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---- section operations
  const update = (s: Section) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === s.id ? s : x)) }));
  const moveTo = (from: number, to: number) => setContent((c) => (to < 0 || to >= c.sections.length ? c : { ...c, sections: arrayMove(c.sections, from, to) }));
  const toggle = (id: string) => setContent((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) }));
  const add = (type: SectionType) => {
    const s = createSection(type);
    setContent((c) => {
      const at = c.sections.findIndex((x) => x.id === selected);
      const sections = [...c.sections];
      sections.splice(type === "hero" ? 0 : at >= 0 ? at + 1 : sections.length, 0, s);
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
  const hasHero = content.sections.some((s) => s.type === "hero");

  // ---- publish / history
  function publish() {
    setDialogError(null);
    start(async () => {
      const res = await publishPageAction(page.slug, note);
      if (!res.ok) return setDialogError(res.error);
      publishRef.current?.close();
      setNote("");
      setNotice(`Published as version ${res.version}. The live ${pageLabel.toLowerCase()} now shows these changes.`);
      router.refresh();
    });
  }

  function restore(versionId: string, versionNo: number) {
    setDialogError(null);
    start(async () => {
      const res = await restoreVersionAction(page.slug, versionId);
      if (!res.ok) return setDialogError(res.error);
      sessionStorageNotice(`Version ${versionNo} is back in your draft. Publish it to make it live.`);
      window.location.reload();
    });
  }

  function discard() {
    setDialogError(null);
    start(async () => {
      const res = await discardDraftAction(page.slug);
      if (!res.ok) return setDialogError(res.error);
      sessionStorageNotice("Unpublished changes discarded. The draft now matches the live page.");
      window.location.reload();
    });
  }

  useEffect(() => {
    try {
      const n = sessionStorage.getItem("cms-notice");
      if (n) { setNotice(n); sessionStorage.removeItem("cms-notice"); }
    } catch { /* storage unavailable */ }
  }, []);

  // ---- status line
  const status = (() => {
    switch (state) {
      case "saving": return { icon: <Loader2 className="size-4 animate-spin" />, text: "Saving…", tone: "text-ink-muted" };
      case "unsaved": return { icon: <span className="size-2 rounded-full bg-warning" />, text: "Unsaved changes", tone: "text-ink-muted" };
      case "invalid": return { icon: <TriangleAlert className="size-4" />, text: "Not saved", tone: "text-warning-ink" };
      case "error": return { icon: <TriangleAlert className="size-4" />, text: "Not saved", tone: "text-danger-ink" };
      case "conflict": return { icon: <TriangleAlert className="size-4" />, text: "Changed elsewhere", tone: "text-danger-ink" };
      default: return { icon: <Check className="size-4" />, text: "Draft saved", tone: "text-success-ink" };
    }
  })();

  const versions = page.versions;

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface px-4 py-3">
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink">{pageLabel}</h2>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", !page.published ? "bg-block-lemon text-ink" : differsFromLive ? "bg-block-sky text-ink" : "bg-block-mint text-ink")}>
              {!page.published ? "Not published yet" : differsFromLive ? "Draft differs from live" : "Live matches draft"}
            </span>
          </div>
          <p role="status" className={cn("mt-0.5 flex items-center gap-1.5 text-sm", status.tone)}>
            {status.icon} {status.text}
            {page.publishedAt && <span className="text-ink-muted"> · Last published {dateTime.format(new Date(page.publishedAt))}{page.publishedBy ? ` by ${page.publishedBy}` : ""}</span>}
          </p>
        </div>

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

        <div className="flex flex-wrap items-center gap-2">
          <a href={`/preview/${page.slug}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-ink/5">
            <ExternalLink className="size-4" aria-hidden="true" /> Preview
          </a>
          <Button variant="secondary" size="sm" onClick={() => { setDialogError(null); historyRef.current?.showModal(); }}>
            <History className="size-4" aria-hidden="true" /> History
          </Button>
          {canPublish && (
            <Button
              size="sm"
              disabled={dirty || state !== "saved" || !differsFromLive}
              title={dirty ? "Wait for the draft to save" : !differsFromLive ? "Nothing new to publish" : undefined}
              onClick={() => { setDialogError(null); publishRef.current?.showModal(); }}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      {!canEdit && <Alert tone="info">You can view this page and its history. Ask the Owner for “Edit website drafts” to make changes.</Alert>}
      {canEdit && !canPublish && <Alert tone="info">Your changes are saved as a draft. Someone with “Publish website changes” makes them live.</Alert>}
      {message && (state === "invalid" || state === "error" || state === "conflict") && (
        <Alert tone={state === "invalid" ? "warning" : "danger"}>
          {message}
          {state === "conflict" && <> <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Reload</button></>}
          {state === "error" && <> <button type="button" onClick={() => void save()} className="font-semibold underline">Try again</button></>}
        </Alert>
      )}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-tile bg-block-mint px-4 py-3 text-sm text-ink">
          {notice}
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X className="size-4" /></button>
        </div>
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
                {(Object.keys(SECTION_LIBRARY) as SectionType[]).map((type) => {
                  const lib = SECTION_LIBRARY[type];
                  const blocked = lib.single && type === "hero" && hasHero;
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
          <Preview slug={page.slug} device={device} reloadKey={reloadKey} />
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

      {/* Publish */}
      <dialog ref={publishRef} aria-labelledby={publishTitle} className="m-auto w-[min(480px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40">
        <div className="flex flex-col gap-4 p-6">
          <h2 id={publishTitle} className="text-lg font-bold">Publish the {pageLabel.toLowerCase()}?</h2>
          <p className="text-sm text-ink-muted">
            Everyone visiting <span className="font-semibold text-ink">{publicPath}</span> will see the draft right away. You can restore an earlier version from History if needed.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            What changed? (optional)
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="New hero for the July launch" className="h-10 rounded-control border border-line px-3 text-sm font-normal focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30" />
          </label>
          {dialogError && <Alert tone="danger">{dialogError}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => publishRef.current?.close()}>Cancel</Button>
            <Button onClick={publish} loading={pending} disabled={pending}>Publish now</Button>
          </div>
        </div>
      </dialog>

      {/* History */}
      <dialog ref={historyRef} aria-labelledby={historyTitle} className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40">
        <div className="flex max-h-[80dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 id={historyTitle} className="text-lg font-bold">Version history</h2>
            <button type="button" aria-label="Close" onClick={() => historyRef.current?.close()} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink/5"><X className="size-5" /></button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto p-6">
            {dialogError && <Alert tone="danger">{dialogError}</Alert>}
            {versions.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing published yet. Each publish is kept here so you can go back.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {versions.map((v, i) => (
                  <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        Version {v.versionNo}{i === 0 && <span className="ml-2 rounded-full bg-block-mint px-2 py-0.5 text-xs">Live</span>}
                      </p>
                      <p className="text-xs text-ink-muted">{dateTime.format(new Date(v.publishedAt))}{v.publishedBy ? ` · ${v.publishedBy}` : ""}</p>
                      {v.note && <p className="mt-0.5 truncate text-sm text-ink">{v.note}</p>}
                    </div>
                    {canEdit && (
                      <Button size="sm" variant="secondary" disabled={pending} onClick={() => restore(v.id, v.versionNo)}>
                        Restore to draft
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {canEdit && page.published && (
              <div className="mt-2 rounded-tile bg-canvas p-4">
                <p className="text-sm font-semibold text-ink">Discard unpublished changes</p>
                <p className="mt-1 text-sm text-ink-muted">Resets the draft to what's live now. This can't be undone.</p>
                <Button className="mt-3" size="sm" variant="destructive" disabled={pending} onClick={discard}>Discard changes</Button>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}

function sessionStorageNotice(text: string) {
  try { sessionStorage.setItem("cms-notice", text); } catch { /* storage unavailable */ }
}
