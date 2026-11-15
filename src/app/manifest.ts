import type { MetadataRoute } from "next";
import { brand } from "@/brand";

/** Name, colours and icon used when someone adds the site to their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#131418",
    icons: [
      { src: brand.icons.app, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brand.icons.favicon, sizes: "any", type: "image/svg+xml" },
    ],
  };
}
