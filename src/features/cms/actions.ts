"use server";

import { revalidatePath } from "next/cache";
import { pageContentSchema, type PageContent } from "@/lib/cms/schema";
import { requirePermission } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";
import { revalidateWorkspaces } from "@/lib/workspace";

/** Pages the editor can change, with the public path each one updates. */
const PAGES: Record<string, { title: string; path: string }> = {
  home: { title: "Home", path: "/" },
};

type Fail = { ok: false; error: string; conflict?: boolean };

function page(slug: string) {
  const p = PAGES[slug];
  if (!p) throw new Error("Unknown page");
  return p;
}

function refresh(slug: string) {
  revalidatePath(`/preview/${slug}`);
  revalidateWorkspaces("/website");
}

export async function saveDraftAction(
  slug: string,
  content: PageContent,
  expected: string | null,
): Promise<{ ok: true; updatedAt: string } | Fail> {
  await requirePermission("cms.edit_draft");
  const p = page(slug);
  const parsed = pageContentSchema.safeParse(content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Check the highlighted fields (${issue?.path.join(" › ") || "page"}): ${issue?.message ?? "invalid"}.` };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cms_save_draft", {
    p_slug: slug, p_title: p.title, p_content: parsed.data, p_expected: expected,
  });
  if (error) {
    if (error.code === "40001") return { ok: false, conflict: true, error: "Someone else changed this page. Reload to see their changes before editing." };
    return { ok: false, error: "The draft couldn't be saved. Check your connection and try again." };
  }
  // No revalidation here: autosave runs often, and the preview page is always dynamic.
  return { ok: true, updatedAt: data as string };
}

export async function publishPageAction(slug: string, note: string): Promise<{ ok: true; version: number } | Fail> {
  await requirePermission("cms.publish");
  const p = page(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cms_publish", { p_slug: slug, p_note: note.slice(0, 200) || null });
  if (error) return { ok: false, error: error.code === "P0002" ? "Save the page before publishing." : "The page couldn't be published. Please try again." };
  revalidatePath(p.path);
  refresh(slug);
  return { ok: true, version: data as number };
}

export async function restoreVersionAction(slug: string, versionId: string): Promise<{ ok: true } | Fail> {
  await requirePermission("cms.edit_draft");
  page(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cms_restore_version", { p_version_id: versionId });
  if (error) return { ok: false, error: "That version couldn't be restored." };
  refresh(slug);
  return { ok: true };
}

export async function discardDraftAction(slug: string): Promise<{ ok: true } | Fail> {
  await requirePermission("cms.edit_draft");
  page(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cms_discard_draft", { p_slug: slug });
  if (error) return { ok: false, error: error.code === "P0002" ? "Nothing has been published yet." : "The changes couldn't be discarded." };
  refresh(slug);
  return { ok: true };
}

// ---------------------------------------------------------------- media

const MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export async function registerMediaAction(input: {
  path: string; mime: string; size: number; width: number; height: number; alt: string; fileName: string;
}): Promise<{ ok: true; id: string } | Fail> {
  await requirePermission("cms.edit_draft");
  const ext = MIME[input.mime];
  if (!ext || !new RegExp(`^[a-f0-9-]{36}\\.${ext}$`).test(input.path)) return { ok: false, error: "Use a JPG, PNG, WebP or AVIF image." };
  if (!(input.size > 0 && input.size <= 5 * 1024 * 1024)) return { ok: false, error: "Use an image under 5 MB." };
  const dim = (n: number) => (Number.isInteger(n) && n > 0 && n <= 10000 ? n : null);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cms_register_media", {
    p_path: input.path, p_mime: input.mime, p_size: input.size, p_width: dim(input.width), p_height: dim(input.height),
    p_alt: input.alt.slice(0, 250), p_file_name: input.fileName.slice(0, 200),
  });
  if (error) return { ok: false, error: "The image couldn't be saved to the library." };
  revalidateWorkspaces("/website");
  return { ok: true, id: data as string };
}

export async function updateMediaAltAction(id: string, alt: string): Promise<{ ok: true } | Fail> {
  await requirePermission("cms.edit_draft");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cms_update_media_alt", { p_id: id, p_alt: alt.slice(0, 250) });
  if (error) return { ok: false, error: "The description couldn't be saved." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMediaAction(id: string): Promise<{ ok: true } | Fail> {
  await requirePermission("cms.edit_draft");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cms_delete_media", { p_id: id });
  if (error) return { ok: false, error: error.code === "23503" ? "This image is still used on a page. Remove it there first." : "The image couldn't be deleted." };
  await supabase.storage.from("site-media").remove([data as string]);
  revalidateWorkspaces("/website");
  return { ok: true };
}
