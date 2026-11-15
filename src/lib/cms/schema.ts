import { z } from "zod";

/**
 * Website editor content. Pages are lists of structured sections (blueprint
 * §7): no free-form HTML, so nothing an editor types can run as code.
 * Everything here is re-validated when a page is rendered, because the
 * database accepts any JSON from someone with edit rights.
 */

/** Links: same-site paths, in-page anchors, https, mail and phone only. */
export function safeHref(value: unknown, fallback = "/courses"): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (v.length === 0 || v.length > 300) return fallback;
  if (/[\u0000- \u007f\\]/.test(v.replace(/ /g, "%20"))) return fallback;
  if (v.startsWith("#")) return /^#[A-Za-z][\w-]*$/.test(v) ? v : fallback;
  if (v.startsWith("/")) return v.startsWith("//") ? fallback : v;
  if (/^https:\/\/[^\s/]+/i.test(v)) return v;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(v)) return v;
  if (/^tel:\+?[\d\s-]{6,20}$/i.test(v)) return v;
  return fallback;
}

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1, "Required").max(max);
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => safeHref(v, "") !== "", "Use a link that starts with /, #, https://, mailto: or tel:");
const link = z.object({ label: required(40), href });
const imageId = z.uuid().nullable().default(null);

export const LIMITS = {
  headline: 90,
  subheading: 240,
  title: 80,
  body: 400,
  short: 60,
} as const;

export const FEATURE_ICONS = ["phone", "card", "certificate", "chat", "clock", "play", "shield", "star", "users", "globe"] as const;

const heroData = z.object({
  headline: required(LIMITS.headline),
  subheading: text(LIMITS.subheading),
  showSearch: z.boolean().default(true),
  searchPlaceholder: text(60),
  primaryCta: link.nullable().default(null),
  secondaryCta: link.nullable().default(null),
  reassurance: z.array(required(40)).max(4).default([]),
  visual: z.enum(["illustration", "image"]).default("illustration"),
  imageId,
  phone: z
    .object({ course: text(50), lesson: text(50), upNext: z.array(text(50)).max(3).default([]) })
    .default({ course: "", lesson: "", upNext: [] }),
  stickers: z
    .object({ short: text(30), done: text(30), cert: text(30) })
    .default({ short: "", done: "", cert: "" }),
});

const topicsData = z.object({
  title: required(LIMITS.title),
  source: z.enum(["manual", "categories"]).default("manual"),
  items: z.array(required(40)).max(20).default([]),
});

const coursesData = z.object({
  title: required(LIMITS.title),
  mode: z.enum(["newest", "selected"]).default("newest"),
  courseIds: z.array(z.uuid()).max(12).default([]),
  limit: z.number().int().min(1).max(12).default(4),
  linkLabel: text(40),
});

const stepsData = z.object({
  title: required(LIMITS.title),
  intro: text(LIMITS.body),
  items: z.array(z.object({ title: required(LIMITS.short), text: text(200) })).min(1).max(6),
});

const featuresData = z.object({
  title: required(LIMITS.title),
  items: z
    .array(z.object({ title: required(LIMITS.short), text: text(200), icon: z.enum(FEATURE_ICONS).default("star") }))
    .min(1)
    .max(4),
});

const testimonialsData = z.object({
  title: required(LIMITS.title),
  items: z
    .array(z.object({ quote: required(300), name: required(60), detail: text(80), imageId }))
    .max(6)
    .default([]),
});

const faqData = z.object({
  title: required(LIMITS.title),
  items: z.array(z.object({ question: required(160), answer: required(800) })).max(12).default([]),
});

const ctaData = z.object({
  headline: required(LIMITS.headline),
  text: text(LIMITS.subheading),
  cta: link.nullable().default(null),
});

export const TONES = ["lilac", "lemon", "mint", "sky", "pink", "cream"] as const;

const introData = z.object({
  title: required(LIMITS.headline),
  text: text(LIMITS.subheading),
  tone: z.enum(TONES).default("lilac"),
});

/** Plain text with light formatting (see lib/cms/rich-text.tsx). Never HTML. */
const textData = z.object({
  title: text(LIMITS.title),
  body: required(12000),
});

const contactData = z.object({
  title: required(LIMITS.title),
  text: text(LIMITS.body),
  showEmail: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showWhatsapp: z.boolean().default(true),
  showAddress: z.boolean().default(true),
  showHours: z.boolean().default(true),
});

const base = { id: z.string().regex(/^[a-z0-9-]{1,40}$/), enabled: z.boolean().default(true) };

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("hero"), data: heroData }),
  z.object({ ...base, type: z.literal("topics"), data: topicsData }),
  z.object({ ...base, type: z.literal("courses"), data: coursesData }),
  z.object({ ...base, type: z.literal("steps"), data: stepsData }),
  z.object({ ...base, type: z.literal("features"), data: featuresData }),
  z.object({ ...base, type: z.literal("testimonials"), data: testimonialsData }),
  z.object({ ...base, type: z.literal("faq"), data: faqData }),
  z.object({ ...base, type: z.literal("cta"), data: ctaData }),
  z.object({ ...base, type: z.literal("intro"), data: introData }),
  z.object({ ...base, type: z.literal("text"), data: textData }),
  z.object({ ...base, type: z.literal("contact"), data: contactData }),
]);

export const seoSchema = z.object({
  title: text(70),
  description: text(170),
  imageId,
  noindex: z.boolean().default(false),
});

export const pageContentSchema = z.object({
  sections: z.array(sectionSchema).max(20),
  seo: seoSchema.default({ title: "", description: "", imageId: null, noindex: false }),
});

export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section["type"];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;
export type PageContent = z.infer<typeof pageContentSchema>;
export type Seo = z.infer<typeof seoSchema>;

/**
 * Lenient read for rendering: keeps every valid section and drops any that
 * don't match (for example content written by an older version).
 */
export function readPageContent(raw: unknown): PageContent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { sections?: unknown; seo?: unknown };
  const sections = Array.isArray(r.sections)
    ? r.sections.flatMap((s) => {
        const parsed = sectionSchema.safeParse(s);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const seo = seoSchema.safeParse(r.seo ?? {});
  return { sections, seo: seo.success ? seo.data : { title: "", description: "", imageId: null, noindex: false } };
}

/** Every image a page refers to, so they can be loaded in one query. */
export function imageIdsIn(content: PageContent): string[] {
  const ids = new Set<string>();
  if (content.seo.imageId) ids.add(content.seo.imageId);
  for (const s of content.sections) {
    if (s.type === "hero" && s.data.imageId) ids.add(s.data.imageId);
    if (s.type === "testimonials") s.data.items.forEach((t) => t.imageId && ids.add(t.imageId));
  }
  return [...ids];
}

// ---------------------------------------------------------------- site settings

const navLink = z.object({ label: required(30), href });
const socialUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use a full https:// link");

/** Menus, footer, contact details and wording shared by every public page. */
export const siteSettingsSchema = z.object({
  tagline: required(80),
  description: required(200),
  announcement: z.object({
    enabled: z.boolean().default(false),
    text: text(120),
    link: navLink.nullable().default(null),
    tone: z.enum(TONES).default("lemon"),
  }),
  headerLinks: z.array(navLink).max(6),
  footer: z.object({
    columns: z.array(z.object({ title: required(30), links: z.array(navLink).min(1).max(6) })).max(4),
  }),
  contact: z.object({
    email: z.union([z.literal(""), z.email().max(120)]),
    phone: text(30),
    whatsapp: z.string().trim().max(20).refine((v) => v === "" || /^\+?\d{7,15}$/.test(v.replace(/[\s-]/g, "")), "Digits only, with country code, e.g. +94771234567"),
    address: text(200),
    hours: text(120),
  }),
  social: z.object({
    facebook: socialUrl, instagram: socialUrl, youtube: socialUrl, tiktok: socialUrl, linkedin: socialUrl,
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
