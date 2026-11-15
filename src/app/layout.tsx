import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { brand } from "@/brand";
import { brandFont, brandMonoFont, scriptFont } from "@/brand/fonts";
import { getSiteSettings } from "@/lib/dal/cms";
import "./globals.css";

/** Tagline and description can be changed in Website → Menus & footer. */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    metadataBase: new URL(brand.url),
    title: { default: `${brand.name} — ${site.tagline}`, template: `%s · ${brand.name}` },
    description: site.description,
    applicationName: brand.name,
    icons: { icon: brand.icons.favicon },
    openGraph: { siteName: brand.name, type: "website", locale: "en_LK" },
  };
}

export const viewport: Viewport = {
  themeColor: "#131418",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={brand.locale.default} className={`${brandFont.variable} ${brandMonoFont.variable} ${scriptFont.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
