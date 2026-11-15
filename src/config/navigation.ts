import type { PermissionKey } from "@/lib/auth/permissions";

/** Icon names map to lucide icons in components/layouts/nav-icons.tsx. */
export type NavIcon =
  | "home" | "book" | "compass" | "heart" | "award" | "receipt" | "help" | "settings"
  | "globe" | "folder" | "users" | "shield" | "cart" | "wallet" | "tag" | "life-buoy"
  | "chart" | "lock" | "inbox" | "list" | "bell" | "user" | "clipboard";

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
  { label: "My Learning", href: "/app/student/learning", icon: "book" },
  { label: "Explore", href: "/courses", icon: "compass" },
  { label: "Wishlist", href: "/app/student/wishlist", icon: "heart" },
  { label: "Certificates", href: "/app/student/certificates", icon: "award" },
  { label: "Payments", href: "/app/student/payments", icon: "receipt", phase: 3, description: "Orders, receipts, payment status and refund requests." },
  { label: "Help", href: "/app/student/help", icon: "help" },
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
  { label: "Website", href: "/app/owner/website", icon: "globe" },
  { label: "Courses", href: "/app/owner/courses", icon: "book", phase: 2, description: "Create, edit, preview and publish courses." },
  { label: "Assignments", href: "/app/owner/assignments", icon: "clipboard" },
  { label: "Categories", href: "/app/owner/categories", icon: "folder", phase: 2, description: "Category hierarchy, images, ordering and SEO." },
  { label: "Students", href: "/app/owner/students", icon: "users" },
  { label: "Staff & roles", href: "/app/owner/staff", icon: "shield" },
  { label: "Orders", href: "/app/owner/orders", icon: "cart", phase: 3, description: "Order search, details and status timeline." },
  { label: "Payments", href: "/app/owner/payments", icon: "wallet", phase: 3, description: "PayHere reconciliation, bank transfer verification and refunds." },
  { label: "Promotions", href: "/app/owner/promotions", icon: "tag" },
  { label: "Support", href: "/app/owner/support", icon: "life-buoy" },
  { label: "Reports", href: "/app/owner/reports", icon: "chart" },
  { label: "Security", href: "/app/owner/security", icon: "lock", phase: 4, description: "Login events, role changes, audit log and sessions." },
  { label: "Settings", href: "/app/owner/settings", icon: "settings", phase: 4, description: "Platform identity, locale, email templates and payment settings." },
  { label: "My account", href: "/app/owner/account", icon: "user" },
];

export const staffNav: NavItem[] = [
  { label: "My workspace", href: "/app/staff", icon: "home" },
  { label: "Courses", href: "/app/staff/courses", icon: "book", permission: "courses.read" },
  { label: "Assignments", href: "/app/staff/assignments", icon: "clipboard", permission: "courses.edit" },
  { label: "Learners", href: "/app/staff/students", icon: "users", permission: "students.read" },
  { label: "Website", href: "/app/staff/website", icon: "globe", permission: "cms.read" },
  { label: "Orders", href: "/app/staff/orders", icon: "cart", permission: "orders.read" },
  { label: "Payments", href: "/app/staff/payments", icon: "wallet", permission: "payments.read" },
  { label: "Support", href: "/app/staff/support", icon: "inbox", permission: "tickets.read" },
  { label: "Reports", href: "/app/staff/reports", icon: "chart", permission: "reports.read" },
  { label: "Settings", href: "/app/staff/settings", icon: "settings", description: "Profile, password, two-step verification and sessions." },
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
