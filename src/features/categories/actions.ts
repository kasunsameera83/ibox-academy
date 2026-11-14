"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireRole } from "@/lib/dal/session";
import { slugify } from "@/lib/courses/format";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a name (2–80 characters).").max(80, "Use 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens only.")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(500, "Use 500 characters or fewer.").optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isVisible: z.boolean(),
});

function parse(formData: FormData) {
  const values = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  };
  const parsed = categorySchema.safeParse({ ...values, isVisible: formData.get("isVisible") === "on" });
  return { values, parsed };
}

function revalidateCategories() {
  revalidatePath("/app/owner/categories");
  revalidatePath("/courses");
  revalidatePath("/");
}

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("owner");
  const id = String(formData.get("id") ?? "") || null;
  const { values, parsed } = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>, values };
  }

  const row = {
    name: parsed.data.name,
    slug: parsed.data.slug || slugify(parsed.data.name),
    description: parsed.data.description || null,
    sort_order: parsed.data.sortOrder,
    is_visible: parsed.data.isVisible,
  };
  if (!row.slug) return { fieldErrors: { slug: ["Enter a web address (slug)."] }, values };

  const supabase = await createClient();
  const result = id
    ? await supabase.from("categories").update(row).eq("id", id).select("id").single()
    : await supabase.from("categories").insert(row).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") {
      return { fieldErrors: { slug: ["Another category already uses this web address."] }, values };
    }
    return { error: "The category couldn't be saved. Please try again.", values };
  }

  await recordAudit(supabase, user.id, id ? "category.update" : "category.create", { type: "category", id: result.data.id });
  revalidateCategories();
  if (!id) redirect("/app/owner/categories?saved=1");
  return { success: "Category saved." };
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await requireRole("owner");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { count } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("category_id", id);
  if ((count ?? 0) > 0) redirect(`/app/owner/categories/${id}?error=in_use`);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) redirect(`/app/owner/categories/${id}?error=delete_failed`);
  await recordAudit(supabase, user.id, "category.delete", { type: "category", id });
  revalidateCategories();
  redirect("/app/owner/categories?deleted=1");
}
