import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { CourseCard } from "@/features/courses/components/course-card";
import { requireRole } from "@/lib/dal/session";
import { listWishlist } from "@/lib/dal/wishlist";

export const metadata: Metadata = { title: "Wishlist" };

/** Saved courses (blueprint: saved courses, remove, continue to detail). */
export default async function WishlistPage() {
  const user = await requireRole("student", "owner");
  const items = await listWishlist(user.id);

  return (
    <>
      <PageHeader
        title="Wishlist"
        description="Courses you saved for later. Tap the heart to remove one."
        actions={items.length > 0 ? <ButtonLink href="/courses" variant="secondary" size="sm">Find more courses</ButtonLink> : undefined}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any course to save it here for later."
          action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ course, enrolled }) => (
            <li key={course.id} className="flex flex-col gap-2">
              <CourseCard course={course} wishlist={{ saved: true, signedIn: true }} />
              {enrolled && (
                <p className="flex items-center justify-between gap-3 rounded-tile bg-block-mint px-4 py-2.5 text-sm font-semibold text-ink">
                  You already have this course
                  <Link href={`/learn/${course.slug}`} className="underline underline-offset-4">Go to course</Link>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
