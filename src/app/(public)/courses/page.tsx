import type { Metadata } from "next";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseCard } from "@/features/courses/components/course-card";
import { listCategories, listPublishedCourses, type CatalogueFilters } from "@/lib/dal/courses";
import { LEVEL_LABELS, type CourseLevel } from "@/lib/courses/types";
import { cn, param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explore courses",
  description: "Short, practical video courses in LKR. Preview lessons free before you buy.",
};

const SORTS: { value: NonNullable<CatalogueFilters["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "A–Z" },
];

function buildHref(current: Record<string, string | undefined>, change: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...change })) if (v) next.set(k, v);
  const qs = next.toString();
  return qs ? `/courses?${qs}` : "/courses";
}

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (param(sp.q) ?? "").slice(0, 100);
  const category = param(sp.category);
  const levelParam = param(sp.level);
  const level = levelParam && levelParam in LEVEL_LABELS ? (levelParam as CourseLevel) : undefined;
  const sortParam = param(sp.sort);
  const sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as CatalogueFilters["sort"]) : "newest";

  const [categories, courses] = await Promise.all([
    listCategories({ visibleOnly: true }),
    listPublishedCourses({ q, category, level, sort }),
  ]);
  const current = { q: q || undefined, category, level, sort: sort === "newest" ? undefined : sort };
  const activeCategory = categories.find((c) => c.slug === category);
  const hasFilters = Boolean(q || category || level);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="rounded-card bg-block-lilac px-6 py-10 sm:px-10 sm:py-14">
      <h1 className="type-display-lg text-ink">
        {activeCategory ? activeCategory.name : "Explore courses"}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink">
        {activeCategory?.description || "Short, practical courses in LKR. Watch the free previews before you buy."}
      </p>

      <form action="/courses" role="search" className="mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-surface p-1.5 pl-5 focus-within:ring-2 focus-within:ring-ink">
        {category && <input type="hidden" name="category" value={category} />}
        {level && <input type="hidden" name="level" value={level} />}
        <label htmlFor="catalogue-search" className="sr-only">Search courses</label>
        <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          id="catalogue-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Search by skill or course"
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
        />
        <button type="submit" className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-ink/85">Search</button>
      </form>
      </div>

      <nav aria-label="Categories" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href={buildHref(current, { category: undefined })}
              aria-current={!category ? "page" : undefined}
              className={cn("inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold", !category ? "border-ink bg-ink text-white" : "border-ink/15 bg-surface text-ink hover:border-ink")}
            >
              All
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={buildHref(current, { category: c.slug })}
                aria-current={category === c.slug ? "page" : undefined}
                className={cn("inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold", category === c.slug ? "border-ink bg-ink text-white" : "border-ink/15 bg-surface text-ink hover:border-ink")}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {courses.length} course{courses.length === 1 ? "" : "s"}
          {q && <> for “<span className="font-semibold text-ink">{q}</span>”</>}
        </p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
          <span className="type-label mr-1 text-ink-muted">Level</span>
          {[undefined, ...Object.keys(LEVEL_LABELS)].map((l) => (
            <Link
              key={l ?? "any"}
              href={buildHref(current, { level: l })}
              aria-current={level === l ? "true" : undefined}
              className={cn("rounded-full px-3 py-1 font-medium", level === l ? "bg-ink text-white" : "text-ink-muted hover:bg-canvas hover:text-ink")}
            >
              {l ? LEVEL_LABELS[l as CourseLevel] : "Any"}
            </Link>
          ))}
          <span className="mx-2 hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
          <span className="type-label mr-1 text-ink-muted">Sort</span>
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={buildHref(current, { sort: s.value === "newest" ? undefined : s.value })}
              aria-current={sort === s.value ? "true" : undefined}
              className={cn("rounded-full px-3 py-1 font-medium", sort === s.value ? "bg-ink text-white" : "text-ink-muted hover:bg-canvas hover:text-ink")}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          className="py-16"
          icon={SearchX}
          title={hasFilters ? "No courses match" : "Courses are on the way"}
          description={hasFilters ? "Try a different word, or clear the filters to see everything." : "New courses are being prepared. Check back soon."}
          action={hasFilters ? <ButtonLink href="/courses" variant="secondary">Clear filters</ButtonLink> : undefined}
        />
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((c) => (
            <li key={c.id} className="flex"><div className="w-full"><CourseCard course={c} /></div></li>
          ))}
        </ul>
      )}
    </div>
  );
}
