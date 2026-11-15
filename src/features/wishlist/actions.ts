"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";

/** Save or remove a course. Database rules allow only published courses and your own list. */
export async function setWishlistAction(courseId: string, save: boolean): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save courses." };
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return { ok: false, error: "Course not found." };
  const supabase = await createClient();
  if (save) {
    const { error } = await supabase.from("wishlist_items").upsert({ student_id: user.id, course_id: courseId }, { onConflict: "student_id,course_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: "This course couldn't be saved. Your wishlist may be full." };
  } else {
    const { error } = await supabase.from("wishlist_items").delete().eq("student_id", user.id).eq("course_id", courseId);
    if (error) return { ok: false, error: "This course couldn't be removed. Please try again." };
  }
  revalidatePath("/app/student/wishlist");
  return { ok: true, saved: save };
}
