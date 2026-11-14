"use server";

import { z } from "zod";
import { isPermissionKey } from "@/lib/auth/permissions";
import { requirePermission, requireRole } from "@/lib/dal/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";
import { revalidateWorkspaces } from "@/lib/workspace";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const uuid = z.string().uuid();

function dbError(error: { code?: string; message: string }, fallback: string): Result {
  if (error.code === "22023") return { ok: false, error: error.message };
  if (error.code === "42501") return { ok: false, error: "You don't have permission to do that. Sign in again with two-step verification." };
  return { ok: false, error: fallback };
}

/** Blocks or restores sign-in at the auth level, so a suspended person's sessions stop working too. */
async function setSignInBlocked(userId: string, blocked: boolean): Promise<boolean> {
  try {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: blocked ? "876000h" : "none" });
    return !error;
  } catch {
    return false;
  }
}

function refreshPeople(userId?: string) {
  revalidateWorkspaces("/students");
  revalidateWorkspaces("/staff");
  if (userId) revalidateWorkspaces(`/students/${userId}`);
}

// ---------------------------------------------------------------- accounts

export async function setAccountStatusAction(userId: string, status: "active" | "suspended" | "deactivated", reason: string): Promise<Result> {
  // Staff with students.suspend can change learners only; the database enforces that.
  await requirePermission("students.suspend");
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Account not found." };
  if (!["active", "suspended", "deactivated"].includes(status)) return { ok: false, error: "Choose a valid status." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_account_status", { p_user: userId, p_status: status, p_reason: reason.trim().slice(0, 500) || null });
  if (error) return dbError(error, "The account couldn't be updated. Please try again.");

  const blocked = await setSignInBlocked(userId, status !== "active");
  refreshPeople(userId);
  if (!blocked) {
    return {
      ok: true,
      message:
        status === "active"
          ? "Account reactivated, but sign-in couldn't be unblocked automatically. Check SUPABASE_SECRET_KEY in Vercel."
          : "Access removed, but existing sign-ins couldn't be ended automatically. Check SUPABASE_SECRET_KEY in Vercel.",
    };
  }
  return { ok: true, message: status === "active" ? "Account reactivated." : status === "suspended" ? "Account suspended and signed out." : "Account deactivated and signed out." };
}

// ---------------------------------------------------------------- course access

const grantSchema = z.object({
  studentId: uuid,
  courseId: uuid,
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  note: z.string().trim().max(500),
});

/** Course access without an order: gifts, scholarships, corrections. */
export async function grantAccessAction(input: z.input<typeof grantSchema>): Promise<Result> {
  await requireRole("owner");
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a course and, if needed, a valid end date." };
  const { studentId, courseId, until, note } = parsed.data;
  // An end date means access until the end of that day, Sri Lanka time.
  const expires = until ? new Date(`${until}T23:59:59+05:30`).toISOString() : null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_enrolment", { p_student: studentId, p_course: courseId, p_expires_at: expires, p_note: note || null });
  if (error) return dbError(error, "Access couldn't be given. Please try again.");
  refreshPeople(studentId);
  return { ok: true, message: "Access given. The course is now in their My Learning." };
}

const enrolmentSchema = z.object({
  enrolmentId: uuid,
  studentId: uuid,
  status: z.enum(["active", "revoked"]),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
});

export async function updateEnrolmentAction(input: z.input<typeof enrolmentSchema>): Promise<Result> {
  await requireRole("owner");
  const parsed = enrolmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the details and try again." };
  const { enrolmentId, studentId, status, until } = parsed.data;
  const expires = until ? new Date(`${until}T23:59:59+05:30`).toISOString() : null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_enrolment", { p_enrolment: enrolmentId, p_status: status, p_expires_at: expires, p_note: null });
  if (error) return dbError(error, "The enrolment couldn't be updated. Please try again.");
  refreshPeople(studentId);
  return { ok: true, message: status === "revoked" ? "Access removed." : "Access updated." };
}

// ---------------------------------------------------------------- staff

const permissionsSchema = z.array(z.string()).max(60).refine((keys) => keys.every(isPermissionKey), "Unknown permission.");

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  fullName: z.string().trim().min(2, "Enter their name.").max(120),
  permissions: permissionsSchema,
});

export type InviteResult = Result | { ok: false; existing: { id: string; name: string; role: string } };

export async function inviteStaffAction(input: z.input<typeof inviteSchema>): Promise<InviteResult> {
  await requireRole("owner");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const { email, fullName, permissions } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id, full_name, role").ilike("email", email).maybeSingle();
  if (existing) {
    const e = existing as { id: string; full_name: string | null; role: string };
    if (e.role === "owner") return { ok: false, error: "That's an Owner account. It already has every permission." };
    if (e.role === "staff") return { ok: false, error: "This person is already on your team. Edit their permissions below." };
    return { ok: false, existing: { id: e.id, name: e.full_name || email, role: e.role } };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Invites need SUPABASE_SECRET_KEY in your environment variables." };
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    // Works with Supabase's standard invite email (no template changes needed).
    redirectTo: `${siteUrl()}/auth/accept?next=/welcome`,
  });
  if (error || !data.user) {
    if (error?.status === 429 || /rate/i.test(error?.message ?? "")) {
      return { ok: false, error: "Supabase's built-in email limit was reached. Set up custom SMTP in Supabase, or try again in an hour." };
    }
    return { ok: false, error: "The invite couldn't be sent. Check the email address and try again." };
  }

  const { error: roleError } = await supabase.rpc("admin_set_staff", { p_user: data.user.id, p_permissions: permissions });
  if (roleError) return dbError(roleError, "The invite was sent, but permissions couldn't be saved. Edit them below.");
  refreshPeople();
  return { ok: true, message: `Invite sent to ${email}. They'll set a password and turn on two-step verification when they accept.` };
}

/** Give staff access to someone who already has a learner account. */
export async function promoteToStaffAction(userId: string, permissions: string[]): Promise<Result> {
  await requireRole("owner");
  if (!uuid.safeParse(userId).success || !permissionsSchema.safeParse(permissions).success) return { ok: false, error: "Check the details and try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_staff", { p_user: userId, p_permissions: permissions });
  if (error) return dbError(error, "Staff access couldn't be given. Please try again.");
  refreshPeople(userId);
  return { ok: true, message: "Staff access given. They'll see the staff workspace next time they sign in, after setting up two-step verification." };
}

export async function updateStaffPermissionsAction(userId: string, permissions: string[]): Promise<Result> {
  await requireRole("owner");
  if (!uuid.safeParse(userId).success || !permissionsSchema.safeParse(permissions).success) return { ok: false, error: "Check the details and try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_staff", { p_user: userId, p_permissions: permissions });
  if (error) return dbError(error, "Permissions couldn't be saved. Please try again.");
  refreshPeople(userId);
  return { ok: true, message: "Permissions saved. They apply the next time this person loads a page." };
}

export async function removeStaffAction(userId: string): Promise<Result> {
  await requireRole("owner");
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Account not found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_staff", { p_user: userId });
  if (error) return dbError(error, "Staff access couldn't be removed. Please try again.");
  refreshPeople(userId);
  return { ok: true, message: "Staff access removed. Their account is now a learner account." };
}
