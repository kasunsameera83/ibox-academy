import { notFound } from "next/navigation";
import { PageSections } from "@/features/cms/page-sections";
import { PAGE_DEFS, SITE_SLUG } from "@/lib/cms/pages";
import { getPageForEditor, getSiteSettingsDraft } from "@/lib/dal/cms";

/** Draft content of one page. "site" shows the homepage draft, to preview menus and footer around it. */
export default async function PreviewPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = PAGE_DEFS[page === SITE_SLUG ? "home" : page];
  if (!def) notFound();
  const [editor, site] = await Promise.all([
    getPageForEditor(def.slug, def.starter, def.label).catch(() => null),
    getSiteSettingsDraft(),
  ]);
  if (!editor || !site) notFound();
  return <PageSections content={editor.draft} site={site} fallbackTitle={def.label} />;
}
