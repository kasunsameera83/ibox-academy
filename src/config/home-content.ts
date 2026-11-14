/**
 * Home page copy. In Phase 2 this moves into the Owner's website editor
 * (CMS); until then, edit it here.
 */
export const homeContent = {
  hero: {
    headline: "Learn the skills your feed keeps talking about.",
    subheading:
      "Short video lessons you can finish on the bus. Pay in rupees, learn at your own pace, and get a certificate when you finish.",
    searchPlaceholder: "Try “video editing”",
    primaryCta: { label: "Find a course", href: "/courses" },
    secondaryCta: { label: "See how it works", href: "#how-it-works" },
    reassurance: ["Card or bank transfer", "Prices in LKR", "Preview lessons free"],
  },

  /** Illustrative lesson shown inside the hero phone (decorative). */
  phoneLesson: {
    course: "Video editing for reels",
    lesson: "Cut the boring bits",
    minutes: 8,
    progress: 62,
    upNext: ["Add captions people read", "Export for TikTok & Reels"],
  },

  stickers: {
    short: "8-minute lessons",
    done: "Lesson 3 done",
    cert: "Certificate unlocked",
  },

  topics: {
    title: "What do you want to get good at?",
    items: [
      "Video editing",
      "Graphic design",
      "Freelancing",
      "Spoken English",
      "Coding",
      "AI tools",
      "Content creation",
      "Digital marketing",
      "Excel",
      "UI design",
    ],
  },

  steps: {
    title: "How it works",
    items: [
      { title: "Pick a course", text: "Watch the free preview lessons first, so you know it's for you." },
      { title: "Pay your way", text: "Card through PayHere, or bank transfer with a slip upload. All in LKR." },
      { title: "Learn in short bursts", text: "Lessons save your spot, so you can stop and pick up anywhere." },
      { title: "Get your certificate", text: "Finish every lesson and share a certificate anyone can verify." },
    ],
  },

  features: {
    title: "Built for how you actually learn",
    phone: {
      title: "Made for your phone first",
      text: "Big controls, captions, playback speed and a player that remembers where you stopped.",
    },
    pay: {
      title: "No foreign card needed",
      text: "Pay by card or a simple bank transfer, in rupees.",
    },
    cert: {
      title: "Proof you did the work",
      text: "Every certificate has a verification link you can add to your CV or LinkedIn.",
    },
    support: {
      title: "Stuck? Ask us",
      text: "Questions about a lesson or a payment go to a real person on our team.",
    },
  },

  closingCta: {
    headline: "Your next skill starts with one short lesson.",
    text: "Preview any course for free before you pay.",
    cta: { label: "Browse courses", href: "/courses" },
  },
};
