import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSections } from "@/features/cms/page-sections";
import { DEFAULT_HOME } from "@/lib/cms/defaults";
import { getPageForEditor } from "@/lib/dal/cms";
import { getCurrentUser, hasPermission } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PAGES: Record<string, { slug: string; title: string; fallback: typeof DEFAULT_HOME }> = {
  home: { slug: "home", title: "Home", fallback: DEFAULT_HOME },
};

/** Draft preview for the website team, shown inside the editor. Never public. */
export default async function PreviewPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = PAGES[page];
  const user = await getCurrentUser();
  if (!def || !user || !hasPermission(user, "cms.read")) notFound();
  // Fails without a two-step verified session; show nothing rather than an error.
  const editor = await getPageForEditor(def.slug, def.fallback, def.title).catch(() => null);
  if (!editor) notFound();
  return <PageSections content={editor.draft} />;
}
