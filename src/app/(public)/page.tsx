import Link from "next/link";
import type { CSSProperties } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageCircle,
  Pause,
  Search,
  Smartphone,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { homeContent } from "@/config/home-content";
import { CourseCard } from "@/features/courses/components/course-card";
import { listPublishedCourses } from "@/lib/dal/courses";

/** CSS custom properties for the entrance animation. */
function motion(delay: number, tilt = 0): CSSProperties {
  return { "--delay": `${delay}ms`, "--tilt": `${tilt}deg` } as CSSProperties;
}

function HeroPhone() {
  const { phoneLesson: l, stickers } = homeContent;

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[280px] select-none sm:max-w-[360px]">
      {/* Phone */}
      <div className="rise-in relative rounded-[44px] bg-ink p-2.5 shadow-float" style={motion(100)}>
        <div className="overflow-hidden rounded-[36px] bg-surface">
          {/* Video area */}
          <div className="relative aspect-[4/5] bg-ink">
            <div className="absolute inset-0 grid grid-cols-6 gap-1.5 p-5 opacity-90">
              {/* Abstract "timeline" blocks, like an edit in progress */}
              <div className="col-span-4 rounded-xl bg-brand" />
              <div className="col-span-2 rounded-xl bg-accent" />
              <div className="col-span-2 rounded-xl bg-lilac" />
              <div className="col-span-4 rounded-xl bg-white/10" />
              <div className="col-span-3 rounded-xl bg-white/10" />
              <div className="col-span-3 rounded-xl bg-brand/70" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-linear-to-t from-ink to-transparent px-5 pb-4 pt-10">
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-ink">
                <Pause className="size-4" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-accent" style={{ width: `${l.progress}%` }} />
              </div>
              <span className="text-xs font-semibold text-white/80">{l.minutes}:00</span>
            </div>
          </div>
          {/* Lesson info */}
          <div className="px-5 pb-6 pt-4">
            <p className="text-xs font-semibold text-brand">{l.course}</p>
            <p className="mt-1 text-lg font-bold leading-snug text-ink">{l.lesson}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {l.upNext.map((title) => (
                <li key={title} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5 text-sm text-ink-muted">
                  <span className="size-2 rounded-full bg-line" />
                  {title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Stickers */}
      <div
        className="rise-in absolute -left-6 top-10 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-on-accent shadow-float sm:-left-14"
        style={motion(450, -6)}
      >
        <Clock className="size-4" /> {stickers.short}
      </div>
      <div
        className="rise-in absolute -right-4 top-[46%] flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-bold text-ink shadow-float sm:-right-12"
        style={motion(600, 5)}
      >
        <CheckCircle2 className="size-4 text-success" /> {stickers.done}
      </div>
      <div
        className="rise-in absolute -bottom-5 left-4 flex items-center gap-2 rounded-full bg-lilac px-4 py-2 text-sm font-bold text-ink shadow-float sm:-left-8"
        style={motion(750, -3)}
      >
        <BadgeCheck className="size-4 text-brand" /> {stickers.cert}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { hero, topics, steps, features, closingCta } = homeContent;
  const newest = await listPublishedCourses({ sort: "newest" }, 4);

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-4 pb-20 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:px-8 lg:pb-28">
          <div>
            <h1 className="max-w-[14ch] text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[76px]">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-muted">{hero.subheading}</p>

            <form
              action="/courses"
              role="search"
              className="mt-8 flex max-w-xl items-center gap-2 rounded-full border-2 border-ink bg-surface p-1.5 pl-5"
            >
              <label htmlFor="hero-search" className="sr-only">Search courses</label>
              <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <input
                id="hero-search"
                name="q"
                type="search"
                maxLength={100}
                placeholder={hero.searchPlaceholder}
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
              />
              <button
                type="submit"
                className="h-11 rounded-full bg-brand px-6 text-sm font-bold text-on-brand transition-colors hover:bg-brand-hover"
              >
                Search
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={hero.primaryCta.href} size="lg" className="rounded-full">{hero.primaryCta.label}</ButtonLink>
              <ButtonLink href={hero.secondaryCta.href} size="lg" variant="secondary" className="rounded-full">
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-muted">
              {hero.reassurance.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroPhone />
        </div>
      </section>

      {/* Topics */}
      <section aria-labelledby="topics-title" className="bg-ink py-14 text-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <h2 id="topics-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{topics.title}</h2>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {topics.items.map((topic) => (
              <li key={topic}>
                <Link
                  href={`/courses?q=${encodeURIComponent(topic)}`}
                  className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-accent hover:bg-accent hover:text-on-accent focus-visible:outline-accent"
                >
                  {topic}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Newest courses — only shown once something is published */}
      {newest.length > 0 && (
        <section aria-labelledby="new-courses-title">
          <div className="mx-auto max-w-[1280px] px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="new-courses-title" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Fresh courses</h2>
              <Link href="/courses" className="text-sm font-bold text-brand hover:underline">See all courses</Link>
            </div>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {newest.map((course) => (
                <li key={course.id}><CourseCard course={course} /></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* How it works — a real sequence, so it's numbered */}
      <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-24">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <h2 id="steps-title" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{steps.title}</h2>
          <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.items.map((step, i) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <span className="text-sm font-bold text-brand">Step {i + 1}</span>
                <h3 className="mt-2 text-xl font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-ink-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features — mixed sizes, by importance */}
      <section aria-labelledby="features-title" className="bg-lilac">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <h2 id="features-title" className="max-w-[18ch] text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {features.title}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2">
            <article className="flex flex-col justify-between gap-10 rounded-[28px] bg-brand p-8 text-on-brand md:row-span-2">
              <Smartphone className="size-10" aria-hidden="true" />
              <div>
                <h3 className="text-3xl font-extrabold leading-tight tracking-tight">{features.phone.title}</h3>
                <p className="mt-3 text-white">{features.phone.text}</p>
              </div>
            </article>
            <article className="flex flex-col gap-3 rounded-[28px] bg-accent p-7 text-on-accent md:col-span-2">
              <CreditCard className="size-7" aria-hidden="true" />
              <h3 className="text-2xl font-extrabold tracking-tight">{features.pay.title}</h3>
              <p>{features.pay.text}</p>
            </article>
            <article className="flex flex-col gap-3 rounded-[28px] bg-surface p-7">
              <BadgeCheck className="size-7 text-brand" aria-hidden="true" />
              <h3 className="text-xl font-bold text-ink">{features.cert.title}</h3>
              <p className="text-ink-muted">{features.cert.text}</p>
            </article>
            <article className="flex flex-col gap-3 rounded-[28px] bg-surface p-7">
              <MessageCircle className="size-7 text-brand" aria-hidden="true" />
              <h3 className="text-xl font-bold text-ink">{features.support.title}</h3>
              <p className="text-ink-muted">{features.support.text}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="max-w-[20ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-ink sm:text-5xl">
              {closingCta.headline}
            </h2>
            <p className="mt-4 text-lg text-ink-muted">{closingCta.text}</p>
          </div>
          <ButtonLink href={closingCta.cta.href} size="lg" className="rounded-full px-8">{closingCta.cta.label}</ButtonLink>
        </div>
      </section>
    </>
  );
}
