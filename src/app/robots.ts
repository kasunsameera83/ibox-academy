import type { MetadataRoute } from "next";
import { brand } from "@/brand";

/** Search engines may index the public site; accounts, checkout and tools stay out. */
export default function robots(): MetadataRoute.Robots {
  const base = brand.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/learn", "/checkout", "/cms-preview", "/preview", "/api", "/auth", "/mfa", "/welcome", "/login", "/signup", "/forgot-password", "/reset-password", "/access-denied"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
