"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { FEATURE_ICONS, LIMITS, type Section, type SectionOf, type Seo } from "@/lib/cms/schema";
import type { CourseOption, MediaAsset } from "@/lib/dal/cms";
import { AreaField, IconBtn, LinesField, LinkField, move, Repeater, SelectField, TextField, Toggle } from "./fields";
import { MediaPicker } from "./media-picker";

export type FormContext = { media: MediaAsset[]; courses: CourseOption[]; canEdit: boolean };

type FormProps<T extends Section["type"]> = { s: SectionOf<T>; set: (data: SectionOf<T>["data"]) => void; ctx: FormContext };

const ICON_LABELS: Record<(typeof FEATURE_ICONS)[number], string> = {
  phone: "Phone", card: "Card", certificate: "Certificate", chat: "Chat", clock: "Clock",
  play: "Play", shield: "Shield", star: "Star", users: "People", globe: "Globe",
};

function HeroForm({ s, set, ctx }: FormProps<"hero">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Headline" value={d.headline} max={LIMITS.headline} required disabled={off} onChange={(v) => set({ ...d, headline: v })} hint="The page's main heading. Short and specific works best." />
      <AreaField label="Supporting text" value={d.subheading} max={LIMITS.subheading} disabled={off} onChange={(v) => set({ ...d, subheading: v })} />
      <Toggle label="Show course search" checked={d.showSearch} disabled={off} onChange={(v) => set({ ...d, showSearch: v })} />
      {d.showSearch && <TextField label="Search placeholder" value={d.searchPlaceholder} max={60} disabled={off} onChange={(v) => set({ ...d, searchPlaceholder: v })} />}
      <LinkField label="Main button" value={d.primaryCta} disabled={off} onChange={(v) => set({ ...d, primaryCta: v })} />
      <LinkField label="Second button" value={d.secondaryCta} disabled={off} onChange={(v) => set({ ...d, secondaryCta: v })} />
      <LinesField label="Reassurance points" value={d.reassurance} max={40} maxItems={4} disabled={off} onChange={(v) => set({ ...d, reassurance: v })} hint="Short points shown with ticks, one per line." />
      <SelectField
        label="Picture"
        value={d.visual}
        disabled={off}
        options={[{ value: "illustration", label: "Phone illustration" }, { value: "image", label: "My own image" }]}
        onChange={(v) => set({ ...d, visual: v })}
      />
      {d.visual === "image" ? (
        <MediaPicker label="Hero image" media={ctx.media} value={d.imageId} canEdit={ctx.canEdit} onChange={(id) => set({ ...d, imageId: id })} hint="Portrait or square works best (about 1000 × 1250 px)." />
      ) : (
        <fieldset className="flex flex-col gap-3 rounded-tile border border-line p-3">
          <legend className="px-1 text-sm font-semibold text-ink">Illustration text</legend>
          <TextField label="Course on the phone" value={d.phone.course} max={50} disabled={off} onChange={(v) => set({ ...d, phone: { ...d.phone, course: v } })} />
          <TextField label="Lesson on the phone" value={d.phone.lesson} max={50} disabled={off} onChange={(v) => set({ ...d, phone: { ...d.phone, lesson: v } })} />
          <LinesField label="Up next" value={d.phone.upNext} max={50} maxItems={3} disabled={off} onChange={(v) => set({ ...d, phone: { ...d.phone, upNext: v } })} />
          <TextField label="Yellow note" value={d.stickers.short} max={30} disabled={off} onChange={(v) => set({ ...d, stickers: { ...d.stickers, short: v } })} />
          <TextField label="Green note" value={d.stickers.done} max={30} disabled={off} onChange={(v) => set({ ...d, stickers: { ...d.stickers, done: v } })} />
          <TextField label="Pink note" value={d.stickers.cert} max={30} disabled={off} onChange={(v) => set({ ...d, stickers: { ...d.stickers, cert: v } })} />
        </fieldset>
      )}
    </>
  );
}

function TopicsForm({ s, set, ctx }: FormProps<"topics">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Title (read by screen readers)" value={d.title} max={LIMITS.title} required disabled={off} onChange={(v) => set({ ...d, title: v })} />
      <SelectField
        label="Show"
        value={d.source}
        disabled={off}
        options={[{ value: "categories", label: "My visible categories" }, { value: "manual", label: "Topics I type" }]}
        onChange={(v) => set({ ...d, source: v })}
      />
      {d.source === "manual" ? (
        <LinesField label="Topics" value={d.items} max={40} maxItems={20} disabled={off} onChange={(v) => set({ ...d, items: v })} hint="Each topic searches the catalogue. One per line." />
      ) : (
        <p className="text-sm text-ink-muted">Shows every visible category, in the order set in Categories. Each one opens its courses.</p>
      )}
    </>
  );
}

function CoursePicker({ value, onChange, courses, disabled }: { value: string[]; onChange: (ids: string[]) => void; courses: CourseOption[]; disabled?: boolean }) {
  const id = useId();
  const [q, setQ] = useState("");
  const byId = new Map(courses.map((c) => [c.id, c]));
  const available = courses.filter((c) => !value.includes(c.id) && c.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">Courses, in order</span>
      {value.length === 0 ? (
        <p className="text-sm text-ink-muted">None chosen yet.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {value.map((cid, i) => (
            <li key={cid} className="flex items-center gap-1 rounded-tile bg-canvas py-1 pl-3 pr-1 text-sm">
              <span className="min-w-0 flex-1 truncate">{byId.get(cid)?.title ?? "Unpublished course (hidden)"}</span>
              <IconBtn label="Move up" disabled={disabled || i === 0} onClick={() => onChange(move(value, i, i - 1))}><ArrowUp className="size-4" /></IconBtn>
              <IconBtn label="Move down" disabled={disabled || i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))}><ArrowDown className="size-4" /></IconBtn>
              <IconBtn label="Remove" disabled={disabled} onClick={() => onChange(value.filter((x) => x !== cid))}><X className="size-4" /></IconBtn>
            </li>
          ))}
        </ol>
      )}
      {value.length < 12 && (
        <>
          <label htmlFor={id} className="sr-only">Find a course</label>
          <input
            id={id}
            value={q}
            disabled={disabled}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a published course"
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
          />
          <ul className="max-h-48 overflow-y-auto rounded-tile border border-line">
            {available.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-muted">{courses.length ? "No more matches." : "Publish a course first."}</li>
            ) : (
              available.slice(0, 30).map((c) => (
                <li key={c.id}>
                  <button type="button" disabled={disabled} onClick={() => onChange([...value, c.id])} className="w-full px-3 py-2 text-left text-sm hover:bg-canvas">
                    + {c.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

function CoursesForm({ s, set, ctx }: FormProps<"courses">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Title" value={d.title} max={LIMITS.title} required disabled={off} onChange={(v) => set({ ...d, title: v })} />
      <SelectField
        label="Which courses"
        value={d.mode}
        disabled={off}
        options={[{ value: "newest", label: "Newest published" }, { value: "selected", label: "Ones I pick" }]}
        onChange={(v) => set({ ...d, mode: v })}
      />
      {d.mode === "selected" ? (
        <CoursePicker value={d.courseIds} courses={ctx.courses} disabled={off} onChange={(ids) => set({ ...d, courseIds: ids, limit: Math.max(1, Math.min(12, ids.length || d.limit)) })} />
      ) : (
        <SelectField
          label="How many"
          value={String(d.limit)}
          disabled={off}
          options={[4, 8, 12].map((n) => ({ value: String(n), label: `${n} courses` }))}
          onChange={(v) => set({ ...d, limit: Number(v) })}
        />
      )}
      <TextField label="“See all” link text" value={d.linkLabel} max={40} disabled={off} onChange={(v) => set({ ...d, linkLabel: v })} hint="Leave empty to hide the link." />
      <p className="text-xs text-ink-muted">The section hides itself when there are no published courses to show.</p>
    </>
  );
}

function StepsForm({ s, set, ctx }: FormProps<"steps">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Title" value={d.title} max={LIMITS.title} required disabled={off} onChange={(v) => set({ ...d, title: v })} />
      <AreaField label="Intro" value={d.intro} max={LIMITS.body} disabled={off} onChange={(v) => set({ ...d, intro: v })} />
      <Repeater
        label="Steps"
        items={d.items}
        max={6}
        min={1}
        disabled={off}
        itemLabel={(_, i) => `Step ${i + 1}`}
        create={() => ({ title: "", text: "" })}
        onChange={(items) => set({ ...d, items })}
        render={(it, up) => (
          <>
            <TextField label="Step" value={it.title} max={LIMITS.short} required disabled={off} onChange={(v) => up({ ...it, title: v })} />
            <AreaField label="Details" value={it.text} max={200} rows={2} disabled={off} onChange={(v) => up({ ...it, text: v })} />
          </>
        )}
      />
    </>
  );
}

function FeaturesForm({ s, set, ctx }: FormProps<"features">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Title" value={d.title} max={LIMITS.title} required disabled={off} onChange={(v) => set({ ...d, title: v })} />
      <Repeater
        label="Blocks"
        items={d.items}
        max={4}
        min={1}
        disabled={off}
        itemLabel={(_, i) => (i === 0 ? "Block 1 (the big one)" : `Block ${i + 1}`)}
        create={() => ({ title: "", text: "", icon: "star" as const })}
        onChange={(items) => set({ ...d, items })}
        render={(it, up) => (
          <>
            <TextField label="Heading" value={it.title} max={LIMITS.short} required disabled={off} onChange={(v) => up({ ...it, title: v })} />
            <AreaField label="Text" value={it.text} max={200} rows={2} disabled={off} onChange={(v) => up({ ...it, text: v })} />
            <SelectField label="Icon" value={it.icon} disabled={off} options={FEATURE_ICONS.map((k) => ({ value: k, label: ICON_LABELS[k] }))} onChange={(v) => up({ ...it, icon: v })} />
          </>
        )}
      />
      <p className="text-xs text-ink-muted">Four blocks give the full colour layout; fewer show in a row.</p>
    </>
  );
}

function TestimonialsForm({ s, set, ctx }: FormProps<"testimonials">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Title" value={d.title} max={LIMITS.title} required disabled={off} onChange={(v) => set({ ...d, title: v })} />
      <p className="rounded-tile bg-block-lemon px-3 py-2 text-sm text-ink">Only use real quotes from real learners, with their permission.</p>
      <Repeater
        label="Quotes"
        items={d.items}
        max={6}
        disabled={off}
        itemLabel={(it, i) => it.name || `Quote ${i + 1}`}
        create={() => ({ quote: "", name: "", detail: "", imageId: null })}
        onChange={(items) => set({ ...d, items })}
        render={(it, up) => (
          <>
            <AreaField label="Quote" value={it.quote} max={300} disabled={off} onChange={(v) => up({ ...it, quote: v })} />
            <TextField label="Name" value={it.name} max={60} required disabled={off} onChange={(v) => up({ ...it, name: v })} />
            <TextField label="Detail" value={it.detail} max={80} disabled={off} placeholder="Finished Video editing for reels" onChange={(v) => up({ ...it, detail: v })} />
            <MediaPicker label="Photo (optional)" media={ctx.media} value={it.imageId} canEdit={ctx.canEdit} onChange={(id) => up({ ...it, imageId: id })} />
          </>
        )}
      />
      <p className="text-xs text-ink-muted">The section hides itself until it has at least one quote.</p>
    </>
  );
}

function FaqForm({ s, set, ctx }: FormProps<"faq">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Title" value={d.title} max={LIMITS.title} required disabled={off} onChange={(v) => set({ ...d, title: v })} />
      <Repeater
        label="Questions"
        items={d.items}
        max={12}
        disabled={off}
        itemLabel={(it, i) => it.question || `Question ${i + 1}`}
        create={() => ({ question: "", answer: "" })}
        onChange={(items) => set({ ...d, items })}
        render={(it, up) => (
          <>
            <TextField label="Question" value={it.question} max={160} required disabled={off} onChange={(v) => up({ ...it, question: v })} />
            <AreaField label="Answer" value={it.answer} max={800} rows={4} disabled={off} onChange={(v) => up({ ...it, answer: v })} />
          </>
        )}
      />
    </>
  );
}

function CtaForm({ s, set, ctx }: FormProps<"cta">) {
  const d = s.data;
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Headline" value={d.headline} max={LIMITS.headline} required disabled={off} onChange={(v) => set({ ...d, headline: v })} />
      <AreaField label="Text" value={d.text} max={LIMITS.subheading} disabled={off} onChange={(v) => set({ ...d, text: v })} />
      <LinkField label="Button" value={d.cta} disabled={off} onChange={(v) => set({ ...d, cta: v })} />
    </>
  );
}

/** Properties form for one section. */
export function SectionForm({ section, onChange, ctx }: { section: Section; onChange: (s: Section) => void; ctx: FormContext }) {
  const set = (data: Section["data"]) => onChange({ ...section, data } as Section);
  switch (section.type) {
    case "hero": return <HeroForm s={section} set={set} ctx={ctx} />;
    case "topics": return <TopicsForm s={section} set={set} ctx={ctx} />;
    case "courses": return <CoursesForm s={section} set={set} ctx={ctx} />;
    case "steps": return <StepsForm s={section} set={set} ctx={ctx} />;
    case "features": return <FeaturesForm s={section} set={set} ctx={ctx} />;
    case "testimonials": return <TestimonialsForm s={section} set={set} ctx={ctx} />;
    case "faq": return <FaqForm s={section} set={set} ctx={ctx} />;
    case "cta": return <CtaForm s={section} set={set} ctx={ctx} />;
  }
}

export function SeoForm({ seo, onChange, ctx }: { seo: Seo; onChange: (s: Seo) => void; ctx: FormContext }) {
  const off = !ctx.canEdit;
  return (
    <>
      <TextField label="Page title" value={seo.title} max={70} disabled={off} onChange={(v) => onChange({ ...seo, title: v })} hint="Shown in Google and browser tabs. Leave empty to use the brand name and tagline." />
      <AreaField label="Description" value={seo.description} max={170} disabled={off} onChange={(v) => onChange({ ...seo, description: v })} hint="The summary under the title in search results. About 150 characters." />
      <MediaPicker label="Share image" media={ctx.media} value={seo.imageId} canEdit={ctx.canEdit} onChange={(id) => onChange({ ...seo, imageId: id })} hint="Shown when the page is shared on WhatsApp, Facebook or LinkedIn. 1200 × 630 px works best." />
      <Toggle label="Hide from search engines" hint="Only for a page that isn't ready. The homepage should normally stay visible." checked={seo.noindex} disabled={off} onChange={(v) => onChange({ ...seo, noindex: v })} />
    </>
  );
}
