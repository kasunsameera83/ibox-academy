"use server";

import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { getCourseBySlug } from "@/lib/dal/courses";
import { requireRole, requireUser } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";
import { revalidateWorkspaces } from "@/lib/workspace";

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string; field?: string };

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));

const couponSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use 3–30 letters, numbers, dashes or underscores, with no spaces."),
    description: z.string().trim().max(200, "Keep the note under 200 characters."),
    discountType: z.enum(["percent", "fixed"]),
    discountValue: z.coerce.number().positive("Enter a discount above zero."),
    startsOn: date,
    endsOn: date,
    maxRedemptions: z.string().trim().regex(/^\d*$/, "Enter a whole number, or leave it empty."),
    perLearnerLimit: z.coerce.number().int().min(1).max(100),
    appliesToAll: z.boolean(),
    courseIds: z.array(z.string().uuid()).max(500),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "percent" && v.discountValue > 100) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "A percentage can't be more than 100." });
    if (v.discountType === "percent" && !Number.isInteger(v.discountValue)) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Use a whole percentage, e.g. 20." });
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "The end date must be after the start date." });
    if (!v.appliesToAll && v.courseIds.length === 0) ctx.addIssue({ code: "custom", path: ["courseIds"], message: "Choose at least one course, or apply it to all courses." });
    if (v.maxRedemptions && Number(v.maxRedemptions) < 1) ctx.addIssue({ code: "custom", path: ["maxRedemptions"], message: "Use at least 1, or leave it empty for no limit." });
  });

export type CouponInput = z.input<typeof couponSchema>;

// Dates are whole days in Sri Lanka time.
const startOfDay = (d: string) => (d ? new Date(`${d}T00:00:00+05:30`).toISOString() : null);
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:59+05:30`).toISOString() : null);

export async function saveCouponAction(input: CouponInput): Promise<Result> {
  const user = await requireRole("owner");
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the details and try again.", field: String(issue?.path[0] ?? "") };
  }
  const v = parsed.data;
  const row = {
    code: v.code,
    description: v.description || null,
    discount_type: v.discountType,
    discount_value: v.discountValue,
    starts_at: startOfDay(v.startsOn),
    ends_at: endOfDay(v.endsOn),
    max_redemptions: v.maxRedemptions ? Number(v.maxRedemptions) : null,
    per_learner_limit: v.perLearnerLimit,
    applies_to_all: v.appliesToAll,
  };

  const supabase = await createClient();
  const { data, error } = v.id
    ? await supabase.from("coupons").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("coupons").insert({ ...row, created_by: user.id }).select("id").single();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "Another promotion already uses that code.", field: "code" };
    return { ok: false, error: "The promotion couldn't be saved. Please try again." };
  }
  const id = (data as { id: string }).id;

  // Replace the course list.
  await supabase.from("coupon_courses").delete().eq("coupon_id", id);
  if (!v.appliesToAll && v.courseIds.length) {
    const { error: linkError } = await supabase.from("coupon_courses").insert(v.courseIds.map((course_id) => ({ coupon_id: id, course_id })));
    if (linkError) return { ok: false, error: "The code was saved, but its courses couldn't be. Please save again." };
  }

  await recordAudit(user.id, v.id ? "coupon.update" : "coupon.create", { type: "coupon", id }, { code: v.code });
  revalidateWorkspaces("/promotions", "layout");
  return { ok: true, id, message: v.id ? "Promotion saved." : `${v.code} is ready to share.` };
}

export async function setCouponActiveAction(id: string, active: boolean): Promise<Result> {
  const user = await requireRole("owner");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Promotion not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: "The promotion couldn't be updated. Please try again." };
  await recordAudit(user.id, active ? "coupon.resume" : "coupon.pause", { type: "coupon", id });
  revalidateWorkspaces("/promotions", "layout");
  return { ok: true, message: active ? "Code is live again." : "Code paused. Learners can't use it until you resume it." };
}

export async function deleteCouponAction(id: string): Promise<Result> {
  const user = await requireRole("owner");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Promotion not found." };
  const supabase = await createClient();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("coupon_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: "This code has been used, so it's kept for your records. Pause it instead." };
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: "The promotion couldn't be deleted. Please try again." };
  await recordAudit(user.id, "coupon.delete", { type: "coupon", id });
  revalidateWorkspaces("/promotions", "layout");
  return { ok: true, message: "Promotion deleted." };
}

// ---------------------------------------------------------------- checkout

export type CouponPreview = { code: string; listPrice: number; discount: number; total: number };

export async function previewCouponAction(slug: string, code: string): Promise<{ ok: true; preview: CouponPreview } | { ok: false; error: string }> {
  await requireUser();
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,30}$/.test(clean)) return { ok: false, error: "That code isn't valid." };
  const course = await getCourseBySlug(slug);
  if (!course) return { ok: false, error: "This course isn't available right now." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_coupon", { p_course_id: course.id, p_code: clean });
  if (error) return { ok: false, error: error.code === "22023" ? `${error.message}.` : "The code couldn't be checked. Please try again." };
  const p = data as { code: string; listPrice: number; discount: number; total: number };
  return { ok: true, preview: { code: p.code, listPrice: Number(p.listPrice), discount: Number(p.discount), total: Number(p.total) } };
}
