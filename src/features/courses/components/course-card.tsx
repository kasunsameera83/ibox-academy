import Link from "next/link";
import { blockFor } from "@/lib/courses/block-color";
import { accessLabel, effectivePrice, formatDuration, formatPrice, mediaUrl } from "@/lib/courses/format";
import { LEVEL_LABELS } from "@/lib/courses/types";
import type { CatalogueCourse } from "@/lib/dal/courses";
import { cn } from "@/lib/utils";
import { WishlistButton } from "@/features/wishlist/wishlist-button";

/** Pass `wishlist` to show the save heart (it needs the visitor's saved list). */
export function CourseCard({ course, wishlist }: { course: CatalogueCourse; wishlist?: { saved: boolean; signedIn: boolean } }) {
  const thumb = mediaUrl(course.thumbnail_path);
  const price = effectivePrice(course);
  const onSale = course.sale_price_lkr !== null && course.price_lkr !== null;

  return (
    <article className="group relative flex h-full flex-col rounded-card bg-canvas p-2.5 transition-colors hover:bg-[color-mix(in_oklab,var(--color-canvas),var(--color-ink)_5%)]">
      {wishlist && (
        <div className="absolute right-4 top-4 z-10">
          <WishlistButton courseId={course.id} courseTitle={course.title} courseSlug={course.slug} saved={wishlist.saved} signedIn={wishlist.signedIn} />
        </div>
      )}
      <div className="aspect-video overflow-hidden rounded-tile">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className={cn("flex size-full items-end p-4", blockFor(course.id))}>
            <span className="line-clamp-3 text-xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink">{course.title}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2 pt-4">
        <p className="type-label text-ink-muted">
          {course.category?.name ?? "Course"} · {LEVEL_LABELS[course.level]}
        </p>
        <h3 className="text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        {course.subtitle && <p className="line-clamp-2 text-sm text-ink-muted">{course.subtitle}</p>}
        <p className="text-xs text-ink-muted">
          {course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}
          {course.total_seconds ? `, ${formatDuration(course.total_seconds)}` : ""} · {accessLabel(course.access_type, course.access_days)}
        </p>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-xl font-bold tracking-[-0.02em] text-ink">{formatPrice(price)}</span>
          {onSale && <span className="text-sm text-ink-muted line-through">{formatPrice(course.price_lkr)}</span>}
        </div>
      </div>
      {/* Keyboard focus ring for the whole card */}
      <span className="pointer-events-none absolute inset-0 rounded-card ring-ink ring-offset-2 group-has-[:focus-visible]:ring-2" aria-hidden="true" />
    </article>
  );
}
