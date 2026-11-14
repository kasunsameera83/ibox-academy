import Link from "next/link";
import { accessLabel, effectivePrice, formatDuration, formatPrice, mediaUrl } from "@/lib/courses/format";
import { LEVEL_LABELS } from "@/lib/courses/types";
import type { CatalogueCourse } from "@/lib/dal/courses";

export function CourseCard({ course }: { course: CatalogueCourse }) {
  const thumb = mediaUrl(course.thumbnail_path);
  const price = effectivePrice(course);
  const onSale = course.sale_price_lkr !== null && course.price_lkr !== null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-line bg-surface transition-shadow hover:shadow-float">
      <div className="aspect-video overflow-hidden bg-brand-soft">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-end bg-brand p-4">
            <span className="line-clamp-2 text-lg font-extrabold leading-tight text-on-brand">{course.title}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold text-brand">
          {course.category?.name ?? "Course"} <span className="text-ink-muted">/ {LEVEL_LABELS[course.level]}</span>
        </p>
        <h3 className="text-base font-bold leading-snug text-ink">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        {course.subtitle && <p className="line-clamp-2 text-sm text-ink-muted">{course.subtitle}</p>}
        <p className="text-xs text-ink-muted">
          {course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}
          {course.total_seconds ? `, ${formatDuration(course.total_seconds)}` : ""}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <span className="text-lg font-extrabold text-ink">{formatPrice(price)}</span>
            {onSale && <span className="ml-2 text-sm text-ink-muted line-through">{formatPrice(course.price_lkr)}</span>}
          </div>
          <span className="text-xs text-ink-muted">{accessLabel(course.access_type, course.access_days)}</span>
        </div>
      </div>
    </article>
  );
}
