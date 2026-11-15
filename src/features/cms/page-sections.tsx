import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight, BadgeCheck, CheckCircle2, Clock, CreditCard, Globe, Mail, MapPin, MessageCircle, Pause, Phone, PlayCircle,
  Search, ShieldCheck, Smartphone, Star, Users, type LucideIcon,
} from "lucide-react";
import { brand } from "@/brand";
import { ButtonLink } from "@/components/ui/button";
import { CourseCard } from "@/features/courses/components/course-card";
import { RichText } from "@/lib/cms/rich-text";
import { imageIdsIn, safeHref, type PageContent, type SectionOf, type SiteSettings } from "@/lib/cms/schema";
import { getMediaMap, type MediaAsset } from "@/lib/dal/cms";
import { listCategories, listPublishedCourses, type CatalogueCourse } from "@/lib/dal/courses";
import { getCurrentUser } from "@/lib/dal/session";
import { getWishlistIds } from "@/lib/dal/wishlist";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  phone: Smartphone, card: CreditCard, certificate: BadgeCheck, chat: MessageCircle, clock: Clock,
  play: PlayCircle, shield: ShieldCheck, star: Star, users: Users, globe: Globe,
};

type Media = Map<string, MediaAsset>;

/** CSS custom properties for the hero's one entrance sequence. */
function motion(delay: number, tilt = 0): CSSProperties {
  return { "--delay": `${delay}ms`, "--tilt": `${tilt}deg` } as CSSProperties;
}

function Img({ asset, className, eager }: { asset: MediaAsset; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.url}
      alt={asset.alt}
      width={asset.width ?? undefined}
      height={asset.height ?? undefined}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

// ------------------------------------------------------------------ hero

/** Decorative artwork: a lesson on a phone, on a lilac block, with sticky notes. */
function HeroBoard({ data }: { data: SectionOf<"hero">["data"] }) {
  const { phone, stickers } = data;
  const notes = [
    { text: stickers.short, Icon: Clock, cls: "-left-3 top-8 w-36 bg-block-lemon sm:-left-8", m: motion(380, -5) },
    { text: stickers.done, Icon: CheckCircle2, cls: "-right-2 top-[42%] w-36 bg-block-mint sm:-right-8", m: motion(520, 4) },
    { text: stickers.cert, Icon: BadgeCheck, cls: "-bottom-6 left-6 w-40 bg-block-pink sm:left-2", m: motion(660, -3) },
  ].filter((n) => n.text);

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[520px] select-none">
      <div className="relative overflow-hidden rounded-card bg-block-lilac px-8 pb-10 pt-12 sm:px-14">
        <div className="rise-in relative mx-auto max-w-[270px] rounded-[40px] bg-ink p-2" style={motion(80)}>
          <div className="overflow-hidden rounded-[32px] bg-surface">
            <div className="relative aspect-[4/5] bg-ink">
              <div className="absolute inset-0 grid grid-cols-6 gap-1.5 p-4">
                <div className="col-span-4 rounded-[10px] bg-brand" />
                <div className="col-span-2 rounded-[10px] bg-accent" />
                <div className="col-span-2 rounded-[10px] bg-block-mint" />
                <div className="col-span-4 rounded-[10px] bg-white/10" />
                <div className="col-span-3 rounded-[10px] bg-white/10" />
                <div className="col-span-3 rounded-[10px] bg-block-pink" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-linear-to-t from-ink to-transparent px-4 pb-3.5 pt-10">
                <span className="flex size-8 items-center justify-center rounded-full bg-white text-ink">
                  <Pause className="size-3.5" />
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full w-[62%] rounded-full bg-accent" />
                </div>
                <span className="text-[11px] font-semibold text-white/80">8:00</span>
              </div>
            </div>
            {(phone.course || phone.lesson || phone.upNext.length > 0) && (
              <div className="px-4 pb-5 pt-3.5">
                {phone.course && <p className="type-label text-ink-muted">{phone.course}</p>}
                {phone.lesson && <p className="mt-1.5 text-base font-bold leading-snug tracking-[-0.01em] text-ink">{phone.lesson}</p>}
                {phone.upNext.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {phone.upNext.filter(Boolean).map((title, i) => (
                      <li key={i} className="flex items-center gap-2.5 rounded-[12px] bg-canvas px-3 py-2 text-[13px] text-ink-muted">
                        <span className="size-1.5 rounded-full bg-ink/30" />
                        {title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {notes.map(({ text, Icon, cls, m }) => (
        <div key={text} className={cn("rise-in absolute flex flex-col gap-1.5 rounded-[6px] p-3.5 text-ink", cls)} style={m}>
          <Icon className="size-4" />
          <span className="text-sm font-bold leading-tight">{text}</span>
        </div>
      ))}
    </div>
  );
}

function Hero({ s, media }: { s: SectionOf<"hero">; media: Media }) {
  const d = s.data;
  const image = d.visual === "image" && d.imageId ? media.get(d.imageId) : undefined;
  return (
    <section id={s.id} className="scroll-mt-24">
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-4 pb-20 pt-10 sm:px-6 md:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8 lg:pb-24">
        <div>
          <h1 className="type-display-xl max-w-[13ch] text-ink">{d.headline}</h1>
          {d.subheading && <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-muted sm:text-xl">{d.subheading}</p>}

          {d.showSearch && (
            <form action="/courses" role="search" className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-ink/15 bg-surface p-1.5 pl-5 focus-within:border-ink">
              <label htmlFor={`${s.id}-search`} className="sr-only">Search courses</label>
              <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <input
                id={`${s.id}-search`}
                name="q"
                type="search"
                maxLength={100}
                placeholder={d.searchPlaceholder || "Search courses"}
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
              />
              <button type="submit" className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-ink/85">
                Search
              </button>
            </form>
          )}

          {(d.primaryCta || d.secondaryCta) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {d.primaryCta && <ButtonLink href={safeHref(d.primaryCta.href)} size="lg">{d.primaryCta.label}</ButtonLink>}
              {d.secondaryCta && (
                <ButtonLink href={safeHref(d.secondaryCta.href)} size="lg" variant="secondary">{d.secondaryCta.label}</ButtonLink>
              )}
            </div>
          )}

          {d.reassurance.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
              {d.reassurance.map((item, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {image ? (
          <div className="overflow-hidden rounded-card bg-block-lilac">
            <Img asset={image} eager className="aspect-[4/5] size-full object-cover sm:aspect-[4/3] lg:aspect-[4/5]" />
          </div>
        ) : (
          <HeroBoard data={d} />
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ topics

function Topics({ s, items }: { s: SectionOf<"topics">; items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i} className="flex items-center">
          <Link href={t.href} tabIndex={hidden ? -1 : undefined} className="whitespace-nowrap px-5 py-3 text-[15px] font-medium text-white hover:text-accent">
            {t.label}
          </Link>
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="marquee scroll-mt-24 overflow-hidden bg-ink">
      <h2 id={`${s.id}-title`} className="sr-only">{s.data.title}</h2>
      <div className="marquee-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ courses

function Courses({ s, courses, saved, signedIn }: { s: SectionOf<"courses">; courses: CatalogueCourse[]; saved: Set<string>; signedIn: boolean }) {
  if (courses.length === 0) return null;
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id={`${s.id}-title`} className="type-display-md text-ink">{s.data.title}</h2>
        {s.data.linkLabel && (
          <Link href="/courses" className="inline-flex items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-ink hover:underline hover:underline-offset-4">
            {s.data.linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((course) => (
          <li key={course.id}><CourseCard course={course} wishlist={{ saved: saved.has(course.id), signedIn }} /></li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ steps

function Steps({ s }: { s: SectionOf<"steps"> }) {
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <div className="grid gap-10 rounded-card bg-block-lemon p-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:p-16">
        <div>
          <h2 id={`${s.id}-title`} className="type-display-lg text-ink">{s.data.title}</h2>
          {s.data.intro && <p className="mt-4 max-w-[34ch] text-lg text-ink">{s.data.intro}</p>}
        </div>
        <ol className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {s.data.items.map((step, i) => (
            <li key={i} className="border-t border-ink pt-4">
              <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-ink">{i + 1}</span>
              <h3 className="mt-3 text-xl font-bold tracking-[-0.01em] text-ink">{step.title}</h3>
              {step.text && <p className="mt-1.5 text-ink">{step.text}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ features

/** Blocks sized by importance: the first item is the big one. */
function Features({ s }: { s: SectionOf<"features"> }) {
  const items = s.data.items;
  const four = items.length === 4;
  const tones = four
    ? ["bg-brand text-on-brand md:row-span-2", "bg-block-mint text-ink md:col-span-2", "bg-block-pink text-ink", "bg-block-sky text-ink"]
    : ["bg-brand text-on-brand", "bg-block-mint text-ink", "bg-block-pink text-ink"];
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <h2 id={`${s.id}-title`} className="type-display-lg max-w-[16ch] text-ink">{s.data.title}</h2>
      <div className={cn("mt-10 grid gap-4", four ? "md:grid-cols-3 md:grid-rows-2" : items.length === 1 ? "" : items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? Star;
          const big = i === 0;
          return (
            <article
              key={i}
              className={cn(
                "flex flex-col gap-3 rounded-card p-8",
                tones[i % tones.length],
                big && "min-h-[320px] justify-between gap-10 lg:p-10",
              )}
            >
              <Icon className={big ? "size-10" : "size-7"} aria-hidden="true" />
              <div>
                <h3 className={big ? "type-display-md" : four && i === 1 ? "text-[28px] font-semibold leading-tight tracking-[-0.03em]" : "text-xl font-bold tracking-[-0.01em]"}>
                  {item.title}
                </h3>
                {item.text && <p className={cn("mt-3", big ? "text-lg text-white/90" : four && i === 1 ? "text-lg" : "")}>{item.text}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ testimonials

function Testimonials({ s, media }: { s: SectionOf<"testimonials">; media: Media }) {
  if (s.data.items.length === 0) return null;
  const tones = ["bg-block-lilac", "bg-block-lemon", "bg-block-mint", "bg-block-sky", "bg-block-pink", "bg-block-cream"];
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <h2 id={`${s.id}-title`} className="type-display-lg max-w-[18ch] text-ink">{s.data.title}</h2>
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {s.data.items.map((t, i) => {
          const photo = t.imageId ? media.get(t.imageId) : undefined;
          return (
            <li key={i} className={cn("flex flex-col justify-between gap-8 rounded-card p-8 text-ink", tones[i % tones.length])}>
              <blockquote className="text-lg font-medium leading-relaxed">“{t.quote}”</blockquote>
              <div className="flex items-center gap-3">
                {photo && <Img asset={{ ...photo, alt: "" }} className="size-11 rounded-full object-cover" />}
                <div>
                  <p className="font-bold">{t.name}</p>
                  {t.detail && <p className="text-sm text-ink/75">{t.detail}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ faq

function Faq({ s }: { s: SectionOf<"faq"> }) {
  if (s.data.items.length === 0) return null;
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <h2 id={`${s.id}-title`} className="type-display-lg max-w-[14ch] text-ink">{s.data.title}</h2>
        <div className="divide-y divide-ink/15 border-y border-ink/15">
          {s.data.items.map((item, i) => (
            <details key={i} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-tile py-4 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-[62ch] whitespace-pre-line pb-5 text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ cta

function Cta({ s }: { s: SectionOf<"cta"> }) {
  return (
    <section id={s.id} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <div className="flex flex-col items-start gap-8 rounded-card bg-block-night p-8 text-white sm:p-12 md:flex-row md:items-end md:justify-between lg:p-16">
        <div>
          <h2 className="type-display-lg max-w-[16ch]">{s.data.headline}</h2>
          {s.data.text && <p className="mt-4 text-lg text-white/80">{s.data.text}</p>}
        </div>
        {s.data.cta && (
          <ButtonLink href={safeHref(s.data.cta.href)} size="lg" className="shrink-0">
            {s.data.cta.label} <ArrowRight className="size-5" aria-hidden="true" />
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ intro

const TONE_BG: Record<SectionOf<"intro">["data"]["tone"], string> = {
  lilac: "bg-block-lilac", lemon: "bg-block-lemon", mint: "bg-block-mint", sky: "bg-block-sky", pink: "bg-block-pink", cream: "bg-block-cream",
};

/** Title block for info pages. Carries the page's h1. */
function Intro({ s, isFirst }: { s: SectionOf<"intro">; isFirst: boolean }) {
  const Heading = isFirst ? "h1" : "h2";
  return (
    <section id={s.id} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <div className={cn("rounded-card px-8 py-12 text-ink sm:px-12 sm:py-16 lg:px-16 lg:py-20", TONE_BG[s.data.tone])}>
        <Heading className="type-display-lg max-w-[18ch]">{s.data.title}</Heading>
        {s.data.text && <p className="mt-5 max-w-[56ch] text-lg sm:text-xl">{s.data.text}</p>}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ text

function TextBlock({ s }: { s: SectionOf<"text"> }) {
  return (
    <section id={s.id} aria-labelledby={s.data.title ? `${s.id}-title` : undefined} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20">
      <div className={cn("grid gap-6", s.data.title && "lg:grid-cols-[0.8fr_1.2fr] lg:gap-16")}>
        {s.data.title && <h2 id={`${s.id}-title`} className="type-display-md max-w-[16ch] text-ink">{s.data.title}</h2>}
        <div className="max-w-[68ch]"><RichText text={s.data.body} /></div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ contact

function ContactBlock({ s, site }: { s: SectionOf<"contact">; site: SiteSettings }) {
  const c = site.contact;
  const d = s.data;
  const wa = c.whatsapp.replace(/[^\d]/g, "");
  const items = [
    d.showEmail && c.email && { Icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}`, tone: "bg-block-lilac" },
    d.showWhatsapp && wa && { Icon: MessageCircle, label: "WhatsApp", value: c.whatsapp, href: `https://wa.me/${wa}`, tone: "bg-block-mint" },
    d.showPhone && c.phone && { Icon: Phone, label: "Phone", value: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}`, tone: "bg-block-lemon" },
    d.showAddress && c.address && { Icon: MapPin, label: "Address", value: c.address, href: null, tone: "bg-block-sky" },
    d.showHours && c.hours && { Icon: Clock, label: "Hours", value: c.hours, href: null, tone: "bg-block-pink" },
  ].filter(Boolean) as { Icon: LucideIcon; label: string; value: string; href: string | null; tone: string }[];
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20">
      <h2 id={`${s.id}-title`} className="type-display-md text-ink">{d.title}</h2>
      {d.text && <p className="mt-3 max-w-[56ch] text-lg text-ink-muted">{d.text}</p>}
      {items.length === 0 ? (
        <p className="mt-6 text-ink-muted">Contact details will appear here soon.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ Icon, label, value, href, tone }) => (
            <li key={label} className={cn("flex flex-col gap-6 rounded-card p-7 text-ink", tone)}>
              <Icon className="size-7" aria-hidden="true" />
              <div>
                <p className="type-label text-ink/70">{label}</p>
                {href ? (
                  <a href={href} {...(href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-1 block break-words text-lg font-bold underline-offset-4 hover:underline">
                    {value}
                  </a>
                ) : (
                  <p className="mt-1 whitespace-pre-line text-lg font-bold">{value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ page

/** Renders a page's enabled sections, loading the courses, categories and images they need. */
export async function PageSections({ content, site, fallbackTitle }: { content: PageContent; site: SiteSettings; fallbackTitle?: string }) {
  const sections = content.sections.filter((s) => s.enabled);

  const needsCategories = sections.some((s) => s.type === "topics" && s.data.source === "categories");
  const courseSections = sections.filter((s): s is SectionOf<"courses"> => s.type === "courses");

  const [media, categories, courseLists, user, saved] = await Promise.all([
    getMediaMap(imageIdsIn({ ...content, sections })),
    needsCategories ? listCategories({ visibleOnly: true }) : Promise.resolve([]),
    Promise.all(
      courseSections.map(async (s) => {
        if (s.data.mode === "selected") {
          const found = await listPublishedCourses({ ids: s.data.courseIds }, 12);
          const byId = new Map(found.map((c) => [c.id, c]));
          return s.data.courseIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])).slice(0, s.data.limit);
        }
        return listPublishedCourses({ sort: "newest" }, s.data.limit);
      }),
    ),
    courseSections.length ? getCurrentUser() : Promise.resolve(null),
    courseSections.length ? getWishlistIds() : Promise.resolve(new Set<string>()),
  ]);
  const coursesFor = new Map(courseSections.map((s, i) => [s.id, courseLists[i]]));
  const hasH1 = sections[0]?.type === "intro" || sections.some((s) => s.type === "hero");

  return (
    <>
      {!hasH1 && <h1 className="sr-only">{fallbackTitle ?? brand.name}</h1>}
      {sections.map((s, index) => {
        switch (s.type) {
          case "hero":
            return <Hero key={s.id} s={s} media={media} />;
          case "topics": {
            const items =
              s.data.source === "categories"
                ? categories.map((c) => ({ label: c.name, href: `/courses?category=${encodeURIComponent(c.slug)}` }))
                : s.data.items.map((t) => ({ label: t, href: `/courses?q=${encodeURIComponent(t)}` }));
            return <Topics key={s.id} s={s} items={items} />;
          }
          case "courses":
            return <Courses key={s.id} s={s} courses={coursesFor.get(s.id) ?? []} saved={saved} signedIn={Boolean(user)} />;
          case "steps":
            return <Steps key={s.id} s={s} />;
          case "features":
            return <Features key={s.id} s={s} />;
          case "testimonials":
            return <Testimonials key={s.id} s={s} media={media} />;
          case "faq":
            return <Faq key={s.id} s={s} />;
          case "cta":
            return <Cta key={s.id} s={s} />;
          case "intro":
            return <Intro key={s.id} s={s} isFirst={index === 0} />;
          case "text":
            return <TextBlock key={s.id} s={s} />;
          case "contact":
            return <ContactBlock key={s.id} s={s} site={site} />;
        }
      })}
      <div className="pb-20 lg:pb-24" />
    </>
  );
}
