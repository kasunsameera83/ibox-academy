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
     * Full logo image (wordmark), e.g. "/brand/logo.svg".
     * Leave null to show the icon + brand name as text, so a name
     * change above updates the logo automatically.
     */
    full: "/brand/logo.svg" as string | null,
    /** Full logo for dark backgrounds. Falls back to `full`. */
    fullOnDark: "/brand/logo-white.svg" as string | null,
    /** Square icon/mark image. Leave null to use the built-in mark. */
    mark: "/brand/icon-light.svg" as string | null,
    /** Versions with the "Learn · Create · Grow" tagline, for certificates, posters and social. Too small to read in the header. */
    withTagline: "/brand/logo-tagline.svg",
    withTaglineOnDark: "/brand/logo-tagline-white.svg",
    /** PNG for emails (many email apps don't show SVG). Shown at 200px wide. */
    email: "/brand/logo-email.png",
    /** Width ÷ height of the full logo, so it can be sized without layout shift. */
    aspect: 335.8 / 52.39,
  },

  icons: {
    /** Browser tab icon (dark iB). Replace the file in /public/brand/. */
    favicon: "/brand/icon.svg",
    /** Square app/social icon (yellow iB), 512px PNG. */
    app: "/brand/icon-512.png",
  },

  /** Empty values are hidden in the UI. */
  contact: {
    email: "hello@iboxacademy.com",
    phone: "+94 75 526 9644",
    whatsapp: "+94 75 526 9644",
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
