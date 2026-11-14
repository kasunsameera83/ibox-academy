import type { PermissionKey } from "@/lib/auth/permissions";

/** Icon names map to lucide icons in components/layouts/nav-icons.tsx. */
export type NavIcon =
  | "home" | "book" | "compass" | "heart" | "award" | "receipt" | "help" | "settings"
  | "globe" | "folder" | "users" | "shield" | "cart" | "wallet" | "tag" | "life-buoy"
  | "chart" | "lock" | "inbox" | "list" | "bell";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  /** Staff only see this item when granted this permission. */
  permission?: PermissionKey;
  /** Build phase that delivers this screen (shown on placeholders). */
  phase?: number;
  description?: string;
};

export const studentNav: NavItem[] = [
  { label: "Overview", href: "/app/student", icon: "home" },
  { label: "My Learning", href: "/app/student/learning", icon: "book", phase: 3, description: "All your enrolled courses, progress and next lessons." },
  { label: "Explore", href: "/courses", icon: "compass" },
  { label: "Wishlist", href: "/app/student/wishlist", icon: "heart", phase: 3, description: "Courses you saved for later." },
  { label: "Certificates", href: "/app/student/certificates", icon: "award", phase: 3, description: "Certificates you earn by completing every lesson of a course." },
  { label: "Payments", href: "/app/student/payments", icon: "receipt", phase: 3, description: "Orders, receipts, payment status and refund requests." },
  { label: "Help", href: "/app/student/help", icon: "help", phase: 4, description: "Search help articles and contact support." },
  { label: "Settings", href: "/app/student/settings", icon: "settings", phase: 1, description: "Profile, password, sessions and preferences." },
];

/** Mobile bottom navigation for students (blueprint §14). */
export const studentBottomNav: NavItem[] = [
  { label: "Overview", href: "/app/student", icon: "home" },
  { label: "Learning", href: "/app/student/learning", icon: "book" },
  { label: "Explore", href: "/courses", icon: "compass" },
  { label: "Account", href: "/app/student/settings", icon: "settings" },
];

export const ownerNav: NavItem[] = [
  { label: "Overview", href: "/app/owner", icon: "home" },
  { label: "Website", href: "/app/owner/website", icon: "globe", phase: 2, description: "Edit the landing page, menus, footer, SEO, media and brand settings." },
  { label: "Courses", href: "/app/owner/courses", icon: "book", phase: 2, description: "Create, edit, preview and publish courses." },
  { label: "Categories", href: "/app/owner/categories", icon: "folder", phase: 2, description: "Category hierarchy, images, ordering and SEO." },
  { label: "Students", href: "/app/owner/students", icon: "users", phase: 4, description: "Search learners, view enrolments and manage account status." },
  { label: "Staff & roles", href: "/app/owner/staff", icon: "shield", phase: 4, description: "Invite staff and assign permissions." },
  { label: "Orders", href: "/app/owner/orders", icon: "cart", phase: 3, description: "Order search, details and status timeline." },
  { label: "Payments", href: "/app/owner/payments", icon: "wallet", phase: 3, description: "PayHere reconciliation, bank transfer verification and refunds." },
  { label: "Promotions", href: "/app/owner/promotions", icon: "tag", phase: 4, description: "Coupon codes, limits and expiry." },
  { label: "Support", href: "/app/owner/support", icon: "life-buoy", phase: 4, description: "Ticket queue, assignment and internal notes." },
  { label: "Reports", href: "/app/owner/reports", icon: "chart", phase: 4, description: "Sales, enrolments, completion and exports." },
  { label: "Security", href: "/app/owner/security", icon: "lock", phase: 4, description: "Login events, role changes, audit log and sessions." },
  { label: "Settings", href: "/app/owner/settings", icon: "settings", phase: 4, description: "Platform identity, locale, email templates and payment settings." },
];

export const staffNav: NavItem[] = [
  { label: "My workspace", href: "/app/staff", icon: "home" },
  { label: "My tasks", href: "/app/staff/tasks", icon: "list", phase: 5, description: "Work assigned to you, with due dates and priority." },
  { label: "Content", href: "/app/staff/content", icon: "book", permission: "courses.read", phase: 5, description: "Course drafts, curriculum and media uploads." },
  { label: "Learners", href: "/app/staff/learners", icon: "users", permission: "students.read", phase: 5, description: "Learner account summaries and support context." },
  { label: "Orders", href: "/app/staff/orders", icon: "cart", permission: "orders.read", phase: 5, description: "Order lookup and payment references." },
  { label: "Support", href: "/app/staff/support", icon: "inbox", permission: "tickets.read", phase: 5, description: "Ticket queue and replies." },
  { label: "Reports", href: "/app/staff/reports", icon: "chart", permission: "reports.read", phase: 5, description: "Reports assigned to you." },
  { label: "Settings", href: "/app/staff/settings", icon: "settings", phase: 1, description: "Profile, password, MFA and sessions." },
];

export const publicNav = [
  { label: "Explore courses", href: "/courses" },
  { label: "About", href: "/about" },
  { label: "Help", href: "/help" },
];

export const footerNav = [
  {
    title: "Learn",
    links: [
      { label: "Explore courses", href: "/courses" },
      { label: "Help centre", href: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Terms & policies", href: "/policies" },
    ],
  },
];
