import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listPublishedCourses, type CatalogueCourse } from "./courses";
import { getCurrentUser } from "./session";

/** Courses the signed-in learner saved. Empty when signed out. */
export const getWishlistIds = cache(async (): Promise<Set<string>> => {
  const user = await getCurrentUser();
  if (!user) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("wishlist_items").select("course_id").eq("student_id", user.id);
  return new Set(((data ?? []) as { course_id: string }[]).map((r) => r.course_id));
});

export type WishlistEntry = { course: CatalogueCourse; savedAt: string; enrolled: boolean };

/** The learner's saved courses that are still published, newest first. */
export async function listWishlist(userId: string): Promise<WishlistEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlist_items")
    .select("course_id, created_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { course_id: string; created_at: string }[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.course_id);
  const [courses, { data: enrolments }] = await Promise.all([
    listPublishedCourses({ ids }, 200),
    supabase.from("enrolments").select("course_id").eq("student_id", userId).eq("status", "active").in("course_id", ids),
  ]);
  const byId = new Map(courses.map((c) => [c.id, c]));
  const enrolled = new Set(((enrolments ?? []) as { course_id: string }[]).map((e) => e.course_id));
  return rows.flatMap((r) => {
    const course = byId.get(r.course_id);
    return course ? [{ course, savedAt: r.created_at, enrolled: enrolled.has(r.course_id) }] : [];
  });
}
