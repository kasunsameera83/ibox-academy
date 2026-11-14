import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, CreditCard, MessageCircle, Pause, Search, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { homeContent } from "@/config/home-content";
import { CourseCard } from "@/features/courses/components/course-card";
import { listPublishedCourses } from "@/lib/dal/courses";

/** CSS custom properties for the hero's one entrance sequence. */
function motion(delay: number, tilt = 0): CSSProperties {
  return { "--delay": `${delay}ms`, "--tilt": `${tilt}deg` } as CSSProperties;
}

/** The hero artwork: a lesson on a phone, on a lilac block, with sticky notes. */
function HeroBoard() {
  const { phoneLesson: l, stickers } = homeContent;

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[520px] select-none">
      <div className="relative overflow-hidden rounded-card bg-block-lilac px-8 pb-10 pt-12 sm:px-14">
        {/* Phone */}
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
                  <div className="h-full rounded-full bg-accent" style={{ width: `${l.progress}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-white/80">{l.minutes}:00</span>
              </div>
            </div>
            <div className="px-4 pb-5 pt-3.5">
              <p className="type-label text-ink-muted">{l.course}</p>
              <p className="mt-1.5 text-base font-bold leading-snug tracking-[-0.01em] text-ink">{l.lesson}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {l.upNext.map((title) => (
                  <li key={title} className="flex items-center gap-2.5 rounded-[12px] bg-canvas px-3 py-2 text-[13px] text-ink-muted">
                    <span className="size-1.5 rounded-full bg-ink/30" />
                    {title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky notes */}
      <div className="rise-in absolute -left-3 top-8 flex w-36 flex-col gap-1.5 rounded-[6px] bg-block-lemon p-3.5 text-ink sm:-left-8" style={motion(380, -5)}>
        <Clock className="size-4" />
        <span className="text-sm font-bold leading-tight">{stickers.short}</span>
      </div>
      <div className="rise-in absolute -right-2 top-[42%] flex w-36 flex-col gap-1.5 rounded-[6px] bg-block-mint p-3.5 text-ink sm:-right-8" style={motion(520, 4)}>
        <CheckCircle2 className="size-4" />
        <span className="text-sm font-bold leading-tight">{stickers.done}</span>
      </div>
      <div className="rise-in absolute -bottom-6 left-6 flex w-40 flex-col gap-1.5 rounded-[6px] bg-block-pink p-3.5 text-ink sm:left-2" style={motion(660, -3)}>
        <BadgeCheck className="size-4" />
        <span className="text-sm font-bold leading-tight">{stickers.cert}</span>
      </div>
    </div>
  );
}

/** Black ribbon of topics that loops slowly; pauses on hover and for reduced motion. */
function TopicRibbon() {
  const { topics } = homeContent;
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {topics.items.map((topic) => (
        <li key={topic} className="flex items-center">
          <Link
            href={`/courses?q=${encodeURIComponent(topic)}`}
            tabIndex={hidden ? -1 : undefined}
            className="whitespace-nowrap px-5 py-3 text-[15px] font-medium text-white hover:text-accent"
          >
            {topic}
          </Link>
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="topics-title" className="marquee overflow-hidden bg-ink">
      <h2 id="topics-title" className="sr-only">{topics.title}</h2>
      <div className="marquee-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { hero, topics, steps, features, closingCta } = homeContent;
  const newest = await listPublishedCourses({ sort: "newest" }, 4);

  return (
    <>
      {/* Hero */}
      <section>
        <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-4 pb-20 pt-10 sm:px-6 md:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8 lg:pb-24">
          <div>
            <h1 className="type-display-xl max-w-[13ch] text-ink">{hero.headline}</h1>
            <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-muted sm:text-xl">{hero.subheading}</p>

            <form action="/courses" role="search" className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-ink/15 bg-surface p-1.5 pl-5 focus-within:border-ink">
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
              <button type="submit" className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-ink/85">
                Search
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={hero.primaryCta.href} size="lg">{hero.primaryCta.label}</ButtonLink>
              <ButtonLink href={hero.secondaryCta.href} size="lg" variant="secondary">{hero.secondaryCta.label}</ButtonLink>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
              {hero.reassurance.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroBoard />
        </div>
      </section>

      <TopicRibbon />

      {/* Newest courses — only shown once something is published */}
      {newest.length > 0 && (
        <section aria-labelledby="new-courses-title" className="mx-auto max-w-[1280px] px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="new-courses-title" className="type-display-md text-ink">Fresh courses</h2>
            <Link href="/courses" className="inline-flex items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-ink hover:underline hover:underline-offset-4">
              See all courses <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {newest.map((course) => (
              <li key={course.id}><CourseCard course={course} /></li>
            ))}
          </ul>
        </section>
      )}

      {/* How it works: a real sequence, so it's numbered */}
      <section id="how-it-works" aria-labelledby="steps-title" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
        <div className="grid gap-10 rounded-card bg-block-lemon p-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:p-16">
          <div>
            <h2 id="steps-title" className="type-display-lg text-ink">{steps.title}</h2>
            <p className="mt-4 max-w-[34ch] text-lg text-ink">{topics.title}</p>
          </div>
          <ol className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {steps.items.map((step, i) => (
              <li key={step.title} className="border-t border-ink pt-4">
                <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-ink">{i + 1}</span>
                <h3 className="mt-3 text-xl font-bold tracking-[-0.01em] text-ink">{step.title}</h3>
                <p className="mt-1.5 text-ink">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features: blocks sized by importance */}
      <section aria-labelledby="features-title" className="mx-auto max-w-[1280px] px-4 pt-20 sm:px-6 lg:px-8 lg:pt-24">
        <h2 id="features-title" className="type-display-lg max-w-[16ch] text-ink">{features.title}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <article className="flex min-h-[320px] flex-col justify-between gap-10 rounded-card bg-brand p-8 text-on-brand md:row-span-2 lg:p-10">
            <Smartphone className="size-10" aria-hidden="true" />
            <div>
              <h3 className="type-display-md">{features.phone.title}</h3>
              <p className="mt-3 text-lg text-white/90">{features.phone.text}</p>
            </div>
          </article>
          <article className="flex flex-col gap-3 rounded-card bg-block-mint p-8 text-ink md:col-span-2">
            <CreditCard className="size-7" aria-hidden="true" />
            <h3 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">{features.pay.title}</h3>
            <p className="text-lg">{features.pay.text}</p>
          </article>
          <article className="flex flex-col gap-3 rounded-card bg-block-pink p-8 text-ink">
            <BadgeCheck className="size-7" aria-hidden="true" />
            <h3 className="text-xl font-bold tracking-[-0.01em]">{features.cert.title}</h3>
            <p>{features.cert.text}</p>
          </article>
          <article className="flex flex-col gap-3 rounded-card bg-block-sky p-8 text-ink">
            <MessageCircle className="size-7" aria-hidden="true" />
            <h3 className="text-xl font-bold tracking-[-0.01em]">{features.support.title}</h3>
            <p>{features.support.text}</p>
          </article>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start gap-8 rounded-card bg-block-night p-8 text-white sm:p-12 md:flex-row md:items-end md:justify-between lg:p-16">
          <div>
            <h2 className="type-display-lg max-w-[16ch]">{closingCta.headline}</h2>
            <p className="mt-4 text-lg text-white/80">{closingCta.text}</p>
          </div>
          <ButtonLink href={closingCta.cta.href} size="lg" className="shrink-0">
            {closingCta.cta.label} <ArrowRight className="size-5" aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
