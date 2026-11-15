import Link from "next/link";
import { brand } from "@/brand";
import { PageHeader } from "@/components/layouts/page-header";
import { SiteEditor } from "@/features/cms/editor/site-editor";
import { WebsiteEditor } from "@/features/cms/editor/website-editor";
import { PAGE_DEFS, PAGE_ORDER, SITE_SLUG } from "@/lib/cms/pages";
import { getPageForEditor, getSiteForEditor, listCourseOptions, listMedia } from "@/lib/dal/cms";
import { hasPermission, type SessionUser } from "@/lib/dal/session";
import { cn, param, type SearchParams } from "@/lib/utils";

const TABS = [...PAGE_ORDER.map((slug) => ({ slug, label: PAGE_DEFS[slug].label })), { slug: SITE_SLUG, label: "Menus & footer" }];

/** Website editor (blueprint §7): pages, menus and footer, SEO, media, preview, publish and history. */
export async function WebsiteScreen({ user, base, searchParams }: { user: SessionUser; base: string; searchParams: SearchParams }) {
  const sp = await searchParams;
  const requested = param(sp.page) ?? "home";
  const slug = TABS.some((t) => t.slug === requested) ? requested : "home";
  const canEdit = hasPermission(user, "cms.edit_draft");
  const canPublish = hasPermission(user, "cms.publish");
  const host = new URL(brand.url).host;

  return (
    <>
      <PageHeader
        title="Website"
        description="Change your public pages without a developer. Edits save as a draft; visitors only see them after you publish."
      />
      <nav aria-label="Website pages" className="-mx-1 mb-4 overflow-x-auto px-1">
        <ul className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
          {TABS.map((t) => (
            <li key={t.slug}>
              <Link
                href={`${base}/website${t.slug === "home" ? "" : `?page=${t.slug}`}`}
                aria-current={t.slug === slug ? "page" : undefined}
                className={cn("inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold", t.slug === slug ? "bg-ink text-white" : "text-ink hover:bg-ink/5")}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {slug === SITE_SLUG ? (
        <SiteEditor key="site" site={await getSiteForEditor()} canEdit={canEdit} canPublish={canPublish} publicHost={host} />
      ) : (
        <PageEditor slug={slug} canEdit={canEdit} canPublish={canPublish} host={host} />
      )}
    </>
  );
}

async function PageEditor({ slug, canEdit, canPublish, host }: { slug: string; canEdit: boolean; canPublish: boolean; host: string }) {
  const def = PAGE_DEFS[slug];
  const [page, media, courses] = await Promise.all([getPageForEditor(slug, def.starter, def.label), listMedia(), listCourseOptions()]);
  return (
    <WebsiteEditor
      key={slug}
      page={page}
      media={media}
      courses={courses}
      canEdit={canEdit}
      canPublish={canPublish}
      pageLabel={def.label === "Home" ? "Homepage" : `${def.label} page`}
      publicPath={`${host}${def.path === "/" ? "" : def.path}`}
      sectionTypes={def.sections}
    />
  );
}
