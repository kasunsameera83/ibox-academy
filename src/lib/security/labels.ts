/** Plain-English labels for the Security page. */

export const ACTIVITY_GROUPS = [
  { value: "all", label: "Everything", prefixes: null },
  { value: "team", label: "Team & permissions", prefixes: ["staff"] },
  { value: "accounts", label: "Accounts & sign-in", prefixes: ["account", "security"] },
  { value: "payments", label: "Payments & enrolments", prefixes: ["enrolment", "settings", "report"] },
  { value: "courses", label: "Courses", prefixes: ["course", "lesson", "category", "assignment"] },
  { value: "promotions", label: "Promotions", prefixes: ["coupon"] },
  { value: "website", label: "Website", prefixes: ["cms", "media"] },
  { value: "support", label: "Support", prefixes: ["ticket"] },
] as const;
export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number]["value"];

export const PERIODS = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
] as const;

const ACTIONS: Record<string, string> = {
  "staff.add": "Added a team member",
  "staff.remove": "Removed a team member",
  "staff.permissions": "Changed a team member's permissions",
  "account.status": "Changed an account's status",
  "account.password_changed": "Changed their password",
  "account.mfa_enabled": "Turned on two-step sign-in",
  "account.mfa_removed": "Removed two-step sign-in",
  "account.signed_out_others": "Signed out their other devices",
  "security.sessions_revoked": "Signed a team member out everywhere",
  "security.export_activity": "Exported the activity log",
  "enrolment.grant": "Gave a learner access to a course",
  "enrolment.update": "Changed a learner's course access",
  "settings.bank_details_updated": "Changed the bank transfer details",
  "report.export_orders": "Exported the orders report",
  "course.create": "Created a course",
  "course.delete": "Deleted a course",
  "course.publish": "Published a course",
  "course.unpublish": "Unpublished a course",
  "course.archive": "Archived a course",
  "course.pricing_update": "Changed a course price",
  "course.certificate_design": "Changed a certificate design",
  "course.intro_upload_started": "Uploaded a course intro video",
  "lesson.update": "Edited a lesson",
  "lesson.video_upload_started": "Uploaded a lesson video",
  "category.create": "Created a category",
  "category.update": "Edited a category",
  "category.delete": "Deleted a category",
  "assignment.approve": "Approved an assignment",
  "assignment.request_changes": "Asked for changes to an assignment",
  "coupon.create": "Created a promo code",
  "coupon.update": "Edited a promo code",
  "coupon.pause": "Paused a promo code",
  "coupon.resume": "Resumed a promo code",
  "coupon.delete": "Deleted a promo code",
  "cms.publish": "Published a website page",
  "cms.restore_version": "Restored an older version of a page",
  "media.upload": "Uploaded an image",
  "media.delete": "Deleted an image",
  "ticket.update": "Updated a support ticket",
};

export function actionLabel(action: string): string {
  if (ACTIONS[action]) return ACTIONS[action];
  const words = action.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Actions that deserve a second look are highlighted. */
const SENSITIVE = new Set([
  "staff.add", "staff.remove", "staff.permissions", "account.status", "account.mfa_removed",
  "security.sessions_revoked", "security.export_activity", "settings.bank_details_updated", "report.export_orders", "course.delete", "enrolment.grant",
]);
export const isSensitive = (action: string) => SENSITIVE.has(action);

export const SIGNIN_EVENTS = {
  signin: { label: "Signed in", tone: "success" },
  google_signin: { label: "Signed in with Google", tone: "success" },
  signin_failed: { label: "Wrong email or password", tone: "danger" },
  mfa_failed: { label: "Wrong two-step code", tone: "danger" },
  password_reset_requested: { label: "Asked to reset password", tone: "warning" },
  signout: { label: "Signed out", tone: "neutral" },
} as const;
export type SigninEvent = keyof typeof SIGNIN_EVENTS;

export const SIGNIN_FILTERS = [
  { value: "all", label: "All events", events: null },
  { value: "failed", label: "Failed only", events: ["signin_failed", "mfa_failed"] },
  { value: "signins", label: "Successful sign-ins", events: ["signin", "google_signin"] },
  { value: "resets", label: "Password resets", events: ["password_reset_requested"] },
] as const;

/** "Chrome on Windows" from a user-agent string. Rough on purpose: it's for recognising a device. */
export function deviceLabel(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? (/iPad/.test(ua) ? "iPad" : "iPhone") : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
