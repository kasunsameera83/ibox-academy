/**
 * BRAND FONT — change the font family here.
 * Sinhala and Tamil fonts (e.g. Noto Sans Sinhala / Tamil) will be
 * added here when localisation is switched on.
 */
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

export const brandFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

/** Small uppercase labels (categories, meta, IDs). Used sparingly. */
export const brandMonoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-brand-mono",
  display: "swap",
  weight: ["400", "500"],
});
