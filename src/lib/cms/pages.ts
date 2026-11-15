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
              { question: "Can I get a refund?", answer: "Yes, within the time limit in our Refund Policy (iboxacademy.com/refund-policy). Open a support request with your order reference to ask." },
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
  terms: {
    slug: "terms",
    label: "Terms & Conditions",
    path: "/terms",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo(`The terms for using ${brand.name} and buying its courses.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Terms & Conditions", text: "[Last updated: add the date you publish.]", tone: "cream" } },
        {
          id: "terms",
          type: "text",
          enabled: true,
          data: {
            title: "",
            body: `[Have these terms checked by someone qualified before you publish.]

## Who we are
${brand.name} is run by [your business name, as registered], [address], Sri Lanka. Contact us at hello@iboxacademy.com.

## Your account
- You must give accurate details when you sign up and keep your password private.
- You're responsible for what happens on your account.
- One account is for one person. Course access can't be shared or resold.

## Buying a course
- Prices are shown in Sri Lankan rupees (LKR) and include [any taxes, or "no taxes apply"].
- You can pay by card through PayHere, or by bank transfer.
- A course opens when payment is confirmed. For bank transfers, that's after our team checks your slip.
- How long you can access a course is shown on the course page (lifetime, or a set number of days).

## Using the content
- Courses are for your own learning. Don't copy, download, record, share or resell the videos or materials.
- We may suspend accounts that break these terms, without a refund.

## Certificates
Certificates are issued when you finish every lesson and any assignments are approved. Each has a public link so others can check it's real.

## Refunds
See our [Refund Policy](/refund-policy).

## Changes and availability
- We may update courses to keep them current, and update these terms. We'll show the date of the latest change at the top.
- We try to keep the site running at all times, but can't promise it will never be unavailable.

## Law
These terms are governed by the laws of Sri Lanka.`,
          },
        },
      ],
    },
  },
  "refund-policy": {
    slug: "refund-policy",
    label: "Refund Policy",
    path: "/refund-policy",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo(`When and how you can get a refund for a ${brand.name} course.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Refund Policy", text: "[Last updated: add the date you publish.]", tone: "mint" } },
        {
          id: "policy",
          type: "text",
          enabled: true,
          data: {
            title: "",
            body: `[Decide the numbers in brackets, then delete these notes.]

## When you can get a refund
You can ask for a full refund within **[7] days** of buying a course, as long as you've completed less than **[20]%** of it.

## When we can't refund
- After [7] days from purchase.
- If you've completed [20]% or more of the course, or downloaded its resources.
- If a certificate has already been issued for the course.
- If your account was suspended for breaking our [Terms & Conditions](/terms).

## How to ask
Open a support request from your account (Help → Ask for help → Refund), or email hello@iboxacademy.com with your order reference (it looks like IBX-261115-A1B2C3).

## How you get your money back
- **Card payments (PayHere):** refunded to the same card. Your bank usually shows it within [5–10] working days.
- **Bank transfers:** refunded to the bank account you name, within [7] working days.
- Course access ends when the refund is made.

## Courses we cancel
If we remove a course you paid for before you could finish it, we'll refund you in full or offer another course of the same price.`,
          },
        },
      ],
    },
  },
  privacy: {
    slug: "privacy",
    label: "Privacy Policy",
    path: "/privacy",
    sections: INFO_SECTIONS,
    liveBeforePublish: false,
    starter: {
      seo: seo(`What personal information ${brand.name} collects and how it's used.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Privacy Policy", text: "[Last updated: add the date you publish.]", tone: "sky" } },
        {
          id: "policy",
          type: "text",
          enabled: true,
          data: {
            title: "",
            body: `[Have this checked by someone qualified before you publish.]

## What we collect
- **Account details:** your name, email address and password (stored securely; we can't see it).
- **Learning activity:** courses you're enrolled in, lessons completed, quiz answers and assignment files.
- **Payments:** order details and, for bank transfers, the slip you upload. Card details are handled by PayHere; we never see or store your card number.
- **Support:** messages you send us.
- **Technical data:** basic logs such as your browser type and IP address, to keep the site secure.

## Why we use it
To give you access to courses, process payments, issue certificates, answer support requests and keep accounts secure. We don't sell your information.

## Who else handles it
We use trusted providers to run the site: Supabase (accounts and data), Vercel (hosting), Bunny Stream (video), PayHere (card payments) and our email provider. They handle data only to provide their service to us.

## Certificates
If you earn a certificate, your name, the course and the date can be seen by anyone with the certificate link.

## Cookies
We use essential cookies to keep you signed in. We don't use advertising cookies.

## How long we keep it
While your account is open, and for [how long] after, unless the law requires longer (for example, payment records).

## Your choices
You can update your name in Settings, and ask us for a copy of your data or to delete your account by emailing hello@iboxacademy.com.`,
          },
        },
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
      seo: seo(`Terms, refunds and privacy at ${brand.name}.`),
      sections: [
        { id: "intro", type: "intro", enabled: true, data: { title: "Our policies", text: "The rules for using the site, getting a refund, and how we handle your information.", tone: "cream" } },
        {
          id: "links",
          type: "text",
          enabled: true,
          data: {
            title: "",
            body: "- [Terms & Conditions](/terms)\n- [Refund Policy](/refund-policy)\n- [Privacy Policy](/privacy)",
          },
        },
      ],
    },
  },
};

export const PAGE_ORDER = ["home", "about", "contact", "help", "terms", "refund-policy", "privacy", "policies"] as const;
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
