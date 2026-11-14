import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { brand } from "@/brand";
import { brandFont, brandMonoFont } from "@/brand/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  icons: { icon: brand.icons.favicon },
  openGraph: { siteName: brand.name, type: "website", locale: "en_LK" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={brand.locale.default} className={`${brandFont.variable} ${brandMonoFont.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
