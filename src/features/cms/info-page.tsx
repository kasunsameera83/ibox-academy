import type { Metadata } from "next";
import { ComingSoon } from "@/components/layouts/coming-soon";
import { PAGE_DEFS } from "@/lib/cms/pages";
import { getMediaMap, getPublishedPage, getSiteSettings } from "@/lib/dal/cms";
import { PageSections } from "./page-sections";

/** Published content when there is some, else the built-in starter (if it's ready to show). */
async function liveContent(slug: string) {
  const def = PAGE_DEFS[slug];
  return (await getPublishedPage(slug)) ?? (def.liveBeforePublish ? def.starter : null);
}

/** About, Contact, Help and Policies: published content from Website, or the built-in text until the first publish. */
export async function InfoPage({ slug }: { slug: string }) {
  const def = PAGE_DEFS[slug];
  const [content, site] = await Promise.all([liveContent(slug), getSiteSettings()]);
  if (!content) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
        <ComingSoon title={def.label} description="This page is being written." backHref="/" backLabel="Back to home" />
      </div>
    );
  }
  return <PageSections content={content} site={site} fallbackTitle={def.label} />;
}

export async function infoPageMetadata(slug: string): Promise<Metadata> {
  const def = PAGE_DEFS[slug];
  const content = await liveContent(slug);
  if (!content) return { title: def.label, robots: { index: false } };
  const { seo } = content;
  const intro = content.sections.find((s) => s.type === "intro" && s.enabled);
  const title = seo.title || (intro?.type === "intro" ? intro.data.title : def.label);
  const image = seo.imageId ? (await getMediaMap([seo.imageId])).get(seo.imageId) : undefined;
  return {
    title,
    description: seo.description || undefined,
    alternates: { canonical: def.path },
    robots: seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description: seo.description || undefined,
      url: def.path,
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined,
    },
  };
}
