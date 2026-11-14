"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { hasPermission, requirePermission } from "@/lib/dal/session";
import { getCourseForEditor } from "@/lib/dal/courses";
import { linesToList, slugify } from "@/lib/courses/format";
import { isReadyToPublish, publishChecklist } from "@/lib/courses/checklist";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

function revalidateCourse(id: string, slug?: string) {
  revalidatePath(`/app/owner/courses/${id}`);
  revalidatePath("/app/owner/courses");
  revalidatePath("/courses");
  if (slug) revalidatePath(`/courses/${slug}`);
  revalidatePath("/");
}

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string, excludeId?: string) {
  const root = base || "course";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    let query = supabase.from("courses").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Math.random().toString(36).slice(2, 7)}`;
}

// ------------------------------------------------------------------ create

export async function createCourseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("courses.create");
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3 || title.length > 120) {
    return { fieldErrors: { title: ["Enter a course title (3–120 characters)."] }, values: { title } };
  }
  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, slugify(title));
  const { data, error } = await supabase
    .from("courses")
    .insert({ title, slug, status: "draft", created_by: user.id, updated_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "The course couldn't be created. Please try again.", values: { title } };

  await recordAudit(supabase, user.id, "course.create", { type: "course", id: data.id });
  revalidatePath("/app/owner/courses");
  redirect(`/app/owner/courses/${data.id}?step=overview`);
}

// ------------------------------------------------------------------ overview

const overviewSchema = z.object({
  title: z.string().trim().min(3, "Enter a title (3–120 characters).").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Enter a web address (3–100 characters).")
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens only."),
  subtitle: z.string().trim().max(200, "Use 200 characters or fewer."),
  description: z.string().trim().max(10000, "Use 10,000 characters or fewer."),
  categoryId: z.uuid().or(z.literal("")),
  level: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
  language: z.enum(["en", "si", "ta"]),
});

export async function saveOverviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("courses.edit");
  const id = String(formData.get("id") ?? "");
  const values = Object.fromEntries(
    ["title", "slug", "subtitle", "description", "categoryId", "level", "language"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = overviewSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      subtitle: parsed.data.subtitle || null,
      description: parsed.data.description || null,
      category_id: parsed.data.categoryId || null,
      level: parsed.data.level,
      language: parsed.data.language,
      updated_by: user.id,
    })
    .eq("id", id)
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: ["Another course already uses this web address."] }, values };
    return { error: "Changes couldn't be saved. Please try again.", values };
  }
  revalidateCourse(id, data.slug);
  return { success: "Overview saved.", values };
}

/** Called after the browser uploads a thumbnail directly to Storage. */
export async function setThumbnailAction(courseId: string, path: string | null): Promise<{ error?: string }> {
  const user = await requirePermission("courses.upload");
  if (path !== null && !new RegExp(`^courses/${courseId}/[a-z0-9-]+\\.(jpg|jpeg|png|webp)$`).test(path)) {
    return { error: "Invalid image path." };
  }
  const supabase = await createClient();
  const { data: before } = await supabase.from("courses").select("thumbnail_path, slug").eq("id", courseId).single();
  const { error } = await supabase
    .from("courses")
    .update({ thumbnail_path: path, updated_by: user.id })
    .eq("id", courseId);
  if (error) return { error: "The image couldn't be saved." };
  // Remove the previous file so storage doesn't fill up with old thumbnails.
  if (before?.thumbnail_path && before.thumbnail_path !== path) {
    await supabase.storage.from("course-media").remove([before.thumbnail_path]);
  }
  revalidateCourse(courseId, before?.slug);
  return {};
}

// ------------------------------------------------------------------ outcomes

export async function saveOutcomesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("courses.edit");
  const id = String(formData.get("id") ?? "");
  const values = {
    outcomes: String(formData.get("outcomes") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    prerequisites: String(formData.get("prerequisites") ?? ""),
  };
  const lists = {
    outcomes: linesToList(values.outcomes),
    audience: linesToList(values.audience, 10),
    prerequisites: linesToList(values.prerequisites, 10),
  };
  const tooLong = Object.entries(lists).find(([, items]) => items.some((item) => item.length > 200));
  if (tooLong) return { fieldErrors: { [tooLong[0]]: ["Keep each line under 200 characters."] }, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ ...lists, updated_by: user.id })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { error: "Changes couldn't be saved. Please try again.", values };
  revalidateCourse(id, data.slug);
  return { success: "Outcomes saved.", values };
}

// ------------------------------------------------------------------ pricing

const pricingSchema = z
  .object({
    price: z.coerce.number().min(0, "Price can't be negative.").max(10_000_000),
    salePrice: z.union([z.literal(""), z.coerce.number().min(0).max(10_000_000)]),
    accessType: z.enum(["lifetime", "fixed_days"]),
    accessDays: z.union([z.literal(""), z.coerce.number().int().min(1).max(3650)]),
  })
  .refine((v) => v.salePrice === "" || v.salePrice < v.price, {
    message: "Sale price must be lower than the regular price.",
    path: ["salePrice"],
  })
  .refine((v) => v.accessType === "lifetime" || v.accessDays !== "", {
    message: "Enter how many days learners keep access.",
    path: ["accessDays"],
  });

export async function savePricingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("courses.edit");
  const id = String(formData.get("id") ?? "");
  const values = {
    price: String(formData.get("price") ?? ""),
    salePrice: String(formData.get("salePrice") ?? ""),
    accessType: String(formData.get("accessType") ?? "lifetime"),
    accessDays: String(formData.get("accessDays") ?? ""),
  };
  if (values.price.trim() === "") return { fieldErrors: { price: ["Enter a price in LKR (0 for a free course)."] }, values };
  const parsed = pricingSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({
      price_lkr: parsed.data.price,
      sale_price_lkr: parsed.data.salePrice === "" ? null : parsed.data.salePrice,
      access_type: parsed.data.accessType,
      access_days: parsed.data.accessType === "lifetime" ? null : parsed.data.accessDays,
      updated_by: user.id,
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { error: "Changes couldn't be saved. Please try again.", values };
  await recordAudit(supabase, user.id, "course.pricing_update", { type: "course", id }, { price_lkr: parsed.data.price });
  revalidateCourse(id, data.slug);
  return { success: "Pricing saved.", values };
}

// ------------------------------------------------------------------ SEO

export async function saveSeoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("courses.edit");
  const id = String(formData.get("id") ?? "");
  const values = {
    seoTitle: String(formData.get("seoTitle") ?? "").trim(),
    seoDescription: String(formData.get("seoDescription") ?? "").trim(),
  };
  if (values.seoTitle.length > 70) return { fieldErrors: { seoTitle: ["Use 70 characters or fewer."] }, values };
  if (values.seoDescription.length > 170) return { fieldErrors: { seoDescription: ["Use 170 characters or fewer."] }, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ seo_title: values.seoTitle || null, seo_description: values.seoDescription || null, updated_by: user.id })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { error: "Changes couldn't be saved. Please try again.", values };
  revalidateCourse(id, data.slug);
  return { success: "SEO settings saved.", values };
}

// ------------------------------------------------------------------ status

type StatusAction = "publish" | "unpublish" | "archive" | "restore";

export async function changeCourseStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as StatusAction;
  const user = await requirePermission("courses.edit");
  if (!hasPermission(user, "courses.publish")) redirect(`/access-denied?permission=courses.publish`);

  const course = await getCourseForEditor(id);
  if (!course) redirect("/app/owner/courses");

  const next: Record<StatusAction, string> = {
    publish: "published",
    unpublish: "unpublished",
    archive: "archived",
    restore: "draft",
  };
  if (!(action in next)) redirect(`/app/owner/courses/${id}?step=publish`);

  if (action === "publish") {
    if (!isReadyToPublish(publishChecklist(course))) redirect(`/app/owner/courses/${id}?step=publish&error=checklist`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ status: next[action], updated_by: user.id })
    .eq("id", id);
  if (error) redirect(`/app/owner/courses/${id}?step=publish&error=status`);

  await recordAudit(supabase, user.id, `course.${action}`, { type: "course", id }, { from: course.status, to: next[action] });
  revalidateCourse(id, course.slug);
  redirect(`/app/owner/courses/${id}?step=publish&done=${action}`);
}

export async function deleteDraftCourseAction(formData: FormData) {
  const user = await requirePermission("courses.edit");
  if (user.role !== "owner") redirect("/access-denied");
  const id = String(formData.get("id") ?? "");
  const course = await getCourseForEditor(id);
  if (!course) redirect("/app/owner/courses");
  if (course.status !== "draft") redirect(`/app/owner/courses/${id}?step=publish&error=delete_not_draft`);

  const lessonVideoIds = [
    ...course.sections.flatMap((s) => s.lessons).map((l) => l.bunny_video_id),
    course.intro_video_id,
  ].filter(Boolean) as string[];
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id).eq("status", "draft");
  if (error) redirect(`/app/owner/courses/${id}?step=publish&error=delete_failed`);

  // Best-effort clean-up of media.
  if (course.thumbnail_path) await supabase.storage.from("course-media").remove([course.thumbnail_path]);
  if (lessonVideoIds.length) {
    const { deleteVideo, isBunnyConfigured } = await import("@/lib/bunny");
    if (isBunnyConfigured()) await Promise.allSettled(lessonVideoIds.map((v) => deleteVideo(v)));
  }

  await recordAudit(supabase, user.id, "course.delete", { type: "course", id }, { title: course.title });
  revalidatePath("/app/owner/courses");
  redirect("/app/owner/courses?deleted=1");
}
