import type { Metadata } from "next";
import { brand } from "@/brand";
import { PageSections } from "@/features/cms/page-sections";
import { getHomeContent, getMediaMap, getSiteSettings } from "@/lib/dal/cms";

/** Home page content comes from Owner → Website. */
export async function generateMetadata(): Promise<Metadata> {
  const [{ seo }, site] = await Promise.all([getHomeContent(), getSiteSettings()]);
  const image = seo.imageId ? (await getMediaMap([seo.imageId])).get(seo.imageId) : undefined;
  const title = seo.title || `${brand.name} — ${site.tagline}`;
  const description = seo.description || site.description;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    robots: seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: "/",
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined,
    },
  };
}

export default async function HomePage() {
  const [content, site] = await Promise.all([getHomeContent(), getSiteSettings()]);
  return <PageSections content={content} site={site} />;
}
