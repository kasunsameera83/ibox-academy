/**
 * BRAND FONT — change the font family here.
 * Sinhala and Tamil fonts (e.g. Noto Sans Sinhala / Tamil) will be
 * added here when localisation is switched on.
 */
import { Plus_Jakarta_Sans } from "next/font/google";

export const brandFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});
