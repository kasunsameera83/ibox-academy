/**
 * ============================================================
 *  BRAND SETTINGS — the single place to rebrand the platform.
 * ============================================================
 *  Change the name, tagline, logo, icon and contact details here.
 *  Colours, radius and shadows live in ./tokens.css.
 *  The font lives in ./fonts.ts.
 *
 *  Later (Phase 2) the Owner can override these values from the
 *  dashboard (Website → Brand settings). These remain the defaults.
 */
export const brand = {
  name: "iBox Academy",
  shortName: "iBox",
  tagline: "Learn skills that move you forward.",
  description:
    "Practical online courses, clear learning paths and skills you can use in real life.",

  /** Public site URL (set NEXT_PUBLIC_SITE_URL in each environment). */
  /** Production domain: https://iboxacademy.com */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  logo: {
    /**
     * Full logo image (mark + name), e.g. "/brand/logo.svg".
     * Leave null to show the icon + brand name as text, so a name
     * change above updates the logo automatically.
     */
    full: null as string | null,
    /** Full logo for dark backgrounds. Falls back to `full`. */
    fullOnDark: null as string | null,
    /** Square icon/mark image. Leave null to use the built-in mark. */
    mark: null as string | null,
  },

  icons: {
    /** Browser tab icon. Replace the file in /public/brand/. */
    favicon: "/brand/icon.svg",
  },

  /** Empty values are hidden in the UI. */
  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    address: "Sri Lanka",
  },

  social: {
    facebook: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    linkedin: "",
  },

  locale: {
    default: "en",
    supported: ["en", "si", "ta"] as const,
    currency: "LKR",
    timeZone: "Asia/Colombo",
  },
};

export type Brand = typeof brand;
