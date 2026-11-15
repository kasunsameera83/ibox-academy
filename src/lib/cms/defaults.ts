import type { PageContent, Section, SectionOf, SectionType } from "./schema";

/** Section library shown in the editor's "Add section" menu (blueprint §7). */
export const SECTION_LIBRARY: Record<SectionType, { label: string; description: string; single?: boolean }> = {
  hero: { label: "Hero", description: "Headline, search and buttons at the top of the page.", single: true },
  topics: { label: "Topic ribbon", description: "A moving strip of topics or categories." },
  courses: { label: "Course collection", description: "Newest courses or ones you pick." },
  steps: { label: "How it works", description: "Numbered steps on a colour block." },
  features: { label: "Feature grid", description: "Up to four benefits in colour blocks." },
  testimonials: { label: "Testimonials", description: "Real quotes from learners." },
  faq: { label: "FAQ", description: "Questions and answers that open on tap." },
  cta: { label: "Call to action", description: "A closing message with one button." },
  intro: { label: "Page intro", description: "The page title and a short intro on a colour block.", single: true },
  text: { label: "Text", description: "Headings, paragraphs, lists and links." },
  contact: { label: "Contact details", description: "Email, phone, WhatsApp, address and hours from Menus & footer." },
};

export function newSectionId(type: SectionType): string {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A fresh section with sensible starting text. */
export function createSection<T extends SectionType>(type: T): SectionOf<T> {
  const id = newSectionId(type);
  const blank: { [K in SectionType]: SectionOf<K>["data"] } = {
    hero: {
      headline: "Learn something new this week.",
      subheading: "",
      showSearch: true,
      searchPlaceholder: "Search courses",
      primaryCta: { label: "Find a course", href: "/courses" },
      secondaryCta: null,
      reassurance: [],
      visual: "illustration",
      imageId: null,
      phone: { course: "", lesson: "", upNext: [] },
      stickers: { short: "", done: "", cert: "" },
    },
    topics: { title: "Popular topics", source: "categories", items: [] },
    courses: { title: "Popular courses", mode: "newest", courseIds: [], limit: 4, linkLabel: "See all courses" },
    steps: { title: "How it works", intro: "", items: [{ title: "Step one", text: "" }] },
    features: { title: "Why learn with us", items: [{ title: "A benefit", text: "", icon: "star" }] },
    testimonials: { title: "What learners say", items: [] },
    faq: { title: "Questions people ask", items: [{ question: "How do I pay?", answer: "By card through PayHere, or by bank transfer." }] },
    cta: { headline: "Ready to start?", text: "", cta: { label: "Browse courses", href: "/courses" } },
    intro: { title: "Page title", text: "", tone: "lilac" },
    text: { title: "", body: "Write here." },
    contact: { title: "Get in touch", text: "", showEmail: true, showPhone: true, showWhatsapp: true, showAddress: true, showHours: true },
  };
  return { id, type, enabled: true, data: blank[type] } as SectionOf<T>;
}

/** The homepage as it was before the editor existed. Used until something is published. */
export const DEFAULT_HOME: PageContent = {
  seo: {
    title: "",
    description: "Short video courses you can finish on your phone. Pay in rupees by card or bank transfer and get a verifiable certificate.",
    imageId: null,
    noindex: false,
  },
  sections: [
    {
      id: "hero-main",
      type: "hero",
      enabled: true,
      data: {
        headline: "Learn the skills your feed keeps talking about.",
        subheading:
          "Short video lessons you can finish on the bus. Pay in rupees, learn at your own pace, and get a certificate when you finish.",
        showSearch: true,
        searchPlaceholder: "Try “video editing”",
        primaryCta: { label: "Find a course", href: "/courses" },
        secondaryCta: { label: "See how it works", href: "#how-it-works" },
        reassurance: ["Card or bank transfer", "Prices in LKR", "Preview lessons free"],
        visual: "illustration",
        imageId: null,
        phone: {
          course: "Video editing for reels",
          lesson: "Cut the boring bits",
          upNext: ["Add captions people read", "Export for TikTok & Reels"],
        },
        stickers: { short: "8-minute lessons", done: "Lesson 3 done", cert: "Certificate unlocked" },
      },
    },
    {
      id: "topics-main",
      type: "topics",
      enabled: true,
      data: {
        title: "What do you want to get good at?",
        source: "manual",
        items: ["Video editing", "Graphic design", "Freelancing", "Spoken English", "Coding", "AI tools", "Content creation", "Digital marketing", "Excel", "UI design"],
      },
    },
    {
      id: "courses-new",
      type: "courses",
      enabled: true,
      data: { title: "Fresh courses", mode: "newest", courseIds: [], limit: 4, linkLabel: "See all courses" },
    },
    {
      id: "how-it-works",
      type: "steps",
      enabled: true,
      data: {
        title: "How it works",
        intro: "What do you want to get good at?",
        items: [
          { title: "Pick a course", text: "Watch the free preview lessons first, so you know it's for you." },
          { title: "Pay your way", text: "Card through PayHere, or bank transfer with a slip upload. All in LKR." },
          { title: "Learn in short bursts", text: "Lessons save your spot, so you can stop and pick up anywhere." },
          { title: "Get your certificate", text: "Finish every lesson and share a certificate anyone can verify." },
        ],
      },
    },
    {
      id: "features-main",
      type: "features",
      enabled: true,
      data: {
        title: "Built for how you actually learn",
        items: [
          { title: "Made for your phone first", text: "Big controls, captions, playback speed and a player that remembers where you stopped.", icon: "phone" },
          { title: "No foreign card needed", text: "Pay by card or a simple bank transfer, in rupees.", icon: "card" },
          { title: "Proof you did the work", text: "Every certificate has a verification link you can add to your CV or LinkedIn.", icon: "certificate" },
          { title: "Stuck? Ask us", text: "Questions about a lesson or a payment go to a real person on our team.", icon: "chat" },
        ],
      },
    },
    {
      id: "cta-closing",
      type: "cta",
      enabled: true,
      data: {
        headline: "Your next skill starts with one short lesson.",
        text: "Preview any course for free before you pay.",
        cta: { label: "Browse courses", href: "/courses" },
      },
    },
  ] satisfies Section[],
};
