/**
 * Role and permission catalogue. Keep in sync with the `permissions`
 * seed in supabase/migrations. A staff "profile" is just a bundle of
 * these keys — not a separate account role.
 */
export const APP_ROLES = ["owner", "staff", "student"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  staff: "Staff",
  student: "Student",
};

export const PERMISSIONS = {
  "courses.read": { group: "Content", label: "View course drafts" },
  "courses.create": { group: "Content", label: "Create course drafts" },
  "courses.edit": { group: "Content", label: "Edit course drafts" },
  "courses.upload": { group: "Content", label: "Upload course media" },
  "courses.submit_review": { group: "Content", label: "Submit courses for review" },
  "courses.publish": { group: "Content", label: "Publish courses", sensitive: true },

  "students.read": { group: "Learners", label: "View learner accounts" },
  "students.update_limited": { group: "Learners", label: "Update learner details" },
  "students.suspend": { group: "Learners", label: "Suspend learners", sensitive: true },

  "orders.read": { group: "Finance", label: "View orders" },
  "payments.read": { group: "Finance", label: "View payments" },
  "payments.verify_bank_transfer": { group: "Finance", label: "Verify bank transfers", sensitive: true },
  "refunds.request": { group: "Finance", label: "Prepare refund requests" },
  "refunds.approve": { group: "Finance", label: "Approve refunds", sensitive: true },
  "exports.finance": { group: "Finance", label: "Export finance data", sensitive: true },

  "tickets.read": { group: "Support", label: "View support tickets" },
  "tickets.reply": { group: "Support", label: "Reply to tickets" },
  "tickets.assign": { group: "Support", label: "Assign tickets" },
  "tickets.close": { group: "Support", label: "Close tickets" },

  "cms.read": { group: "Website", label: "View website content" },
  "cms.edit_draft": { group: "Website", label: "Edit website drafts" },
  "cms.publish": { group: "Website", label: "Publish website changes", sensitive: true },

  "reports.read": { group: "Reports", label: "View reports" },

  "audit.read": { group: "Security", label: "View audit log", sensitive: true },
  "sessions.revoke": { group: "Security", label: "Revoke sessions", sensitive: true },
} as const satisfies Record<string, { group: string; label: string; sensitive?: boolean }>;

export type PermissionKey = keyof typeof PERMISSIONS;

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

export function homePathFor(role: AppRole): string {
  return `/app/${role}`;
}
