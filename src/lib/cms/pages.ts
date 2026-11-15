import { brand } from "@/brand";
import { footerNav, publicNav } from "@/config/navigation";
import { DEFAULT_HOME } from "./defaults";
import type { PageContent, SectionType, SiteSettings } from "./schema";

/**
 * Pages the website editor manages. Starter content is only ever a draft:
 * info pages show "coming soon" until someone reads and publishes them.
 */
export type PageDef = {
  slug: string;
  label: string;
  path: string;
  /** Section types offered in "Add section". */
  sections: SectionType[];
  starter: PageContent;
  /** Show the starter content publicly before the first publish (homepage only). */
  liveBeforePublish: boolean;
};

const INFO_SECTIONS: SectionType[] = ["intro", "text", "contact", "faq", "features", "steps", "courses", "testimonials", "cta"];
const seo = (description: string) => ({ title: "", description, imageId: null, noindex: false });

export const PAGE_DEFS: Record<string, PageDef> = {
  home: {
    slug: "home",
    label: "Home",
    path: "/",
    sections: ["hero", "topics", "courses", "steps", "features", "testimonials", "faq", "cta", "text"],
    starter: DEFAULT_HOME,
    liveBeforePublish: true,
  },
  about: {
    slug: "about",
    label: "About",
    path: "/about",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo(`Who we are and how ${brand.name} makes short, practical courses.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: `About ${brand.name}`, text: "Practical courses made for learning on your phone, priced in rupees.", tone: "lilac" } },
        {
          id: "story",
          type: "text",
          enabled: true,
          data: {
            title: "Why we started",
            body: "[Replace this with your story: who you are, why you started teaching, and who the courses are for.]\n\n[Add a paragraph about how you make each course: the experience behind it and how you keep it up to date.]",
          },
        },
        {
          id: "promise",
          type: "features",
          enabled: true,
          data: {
            title: "What you can expect",
            items: [
              { title: "Short lessons that get to the point", text: "Most lessons fit into a commute or a lunch break.", icon: "clock" },
              { title: "Pay in rupees", text: "Card through PayHere, or a bank transfer.", icon: "card" },
              { title: "A certificate you can share", text: "Every certificate has a link anyone can check.", icon: "certificate" },
            ],
          },
        },
        { id: "cta", type: "cta", enabled: true, data: { headline: "Find your next course", text: "Every course has free preview lessons.", cta: { label: "Browse courses", href: "/courses" } } },
      ],
    },
  },
  contact: {
    slug: "contact",
    label: "Contact",
    path: "/contact",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo(`Contact the ${brand.name} team about courses, payments or your account.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Contact us", text: "Questions about a course, a payment or your account? A real person on our team will reply.", tone: "mint" } },
        { id: "details", type: "contact", enabled: true, data: { title: "Ways to reach us", text: "Include your order reference if you're asking about a payment.", showEmail: true, showPhone: true, showWhatsapp: true, showAddress: true, showHours: true } },
        {
          id: "quick",
          type: "faq",
          enabled: true,
          data: {
            title: "Before you write",
            items: [
              { question: "Where do I find my order reference?", answer: "It's on your order page and in Payments in your account, and looks like IBX-261115-A1B2C3." },
              { question: "I paid by bank transfer. When will my course open?", answer: "As soon as our team checks your slip, usually within one working day." },
            ],
          },
        },
      ],
    },
  },
  help: {
    slug: "help",
    label: "Help",
    path: "/help",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo("Answers about buying courses, paying, learning and certificates."),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Help centre", text: "Quick answers about paying, learning and certificates.", tone: "sky" } },
        {
          id: "payments",
          type: "faq",
          enabled: true,
          data: {
            title: "Paying for a course",
            items: [
              { question: "How can I pay?", answer: "By card through PayHere, or by bank transfer. For a transfer, upload a photo or PDF of your slip on the order page." },
              { question: "Are prices in rupees?", answer: "Yes. Every price is in Sri Lankan rupees (LKR)." },
              { question: "Can I get a refund?", answer: "[Write your refund rule here, e.g. how many days after buying and how to ask.]" },
            ],
          },
        },
        {
          id: "learning",
          type: "faq",
          enabled: true,
          data: {
            title: "Learning and certificates",
            items: [
              { question: "Can I learn on my phone?", answer: "Yes. Lessons work on any phone or computer, and your place is saved." },
              { question: "When do I get my certificate?", answer: "When you've finished every lesson and any assignments have been approved." },
              { question: "How long can I access a course?", answer: "[Write your access rule here, e.g. lifetime access or a set number of months.]" },
            ],
          },
        },
        { id: "contact-cta", type: "cta", enabled: true, data: { headline: "Still stuck?", text: "Send us a message and we'll help.", cta: { label: "Contact us", href: "/contact" } } },
      ],
    },
  },
  policies: {
    slug: "policies",
    label: "Policies",
    path: "/policies",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo(`Terms of use, payments and refunds, and privacy at ${brand.name}.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Terms & policies", text: "[Last updated: add the date you publish.]", tone: "cream" } },
        {
          id: "terms",
          type: "text",
          enabled: true,
          data: {
            title: "Terms of use",
            body: "[Have these terms checked before you publish. Cover at least:]\n\n- Who can create an account\n- That course access is for the buyer only and can't be shared\n- That course content may not be copied or resold\n- What happens if an account breaks these rules",
          },
        },
        {
          id: "payments-refunds",
          type: "text",
          enabled: true,
          data: {
            title: "Payments and refunds",
            body: "Prices are in Sri Lankan rupees. You can pay by card through PayHere or by bank transfer.\n\nCourses paid by bank transfer open after our team checks the slip.\n\n## Refunds\n[Write your refund rule: the time limit, what counts, and how to ask.]",
          },
        },
        {
          id: "privacy",
          type: "text",
          enabled: true,
          data: {
            title: "Privacy",
            body: "[Have this checked before you publish. Explain:]\n\n- What you collect: name, email, phone, payment slips, course progress\n- Why: to give course access, handle payments and issue certificates\n- Who else handles it: PayHere for card payments, plus your hosting and video providers\n- How long you keep it, and how to ask for a copy or deletion",
          },
        },
        {
          id: "certificates",
          type: "text",
          enabled: true,
          data: {
            title: "Certificates",
            body: "A certificate is issued when every lesson is complete and any assignments are approved. Each certificate has a public link so employers can check it's real.",
          },
        },
      ],
    },
  },
};

export const PAGE_ORDER = ["home", "about", "contact", "help", "policies"] as const;
export const SITE_SLUG = "site";

/** Menus and footer before the first publish: today's built-in values. */
export const DEFAULT_SITE: SiteSettings = {
  tagline: brand.tagline,
  description: brand.description,
  announcement: { enabled: false, text: "", link: null, tone: "lemon" },
  headerLinks: publicNav.map((l) => ({ label: l.label, href: l.href })),
  footer: { columns: footerNav.map((g) => ({ title: g.title, links: g.links.map((l) => ({ label: l.label, href: l.href })) })) },
  contact: { email: brand.contact.email, phone: brand.contact.phone, whatsapp: brand.contact.whatsapp, address: brand.contact.address, hours: "" },
  social: { facebook: brand.social.facebook, instagram: brand.social.instagram, youtube: brand.social.youtube, tiktok: brand.social.tiktok, linkedin: brand.social.linkedin },
};
