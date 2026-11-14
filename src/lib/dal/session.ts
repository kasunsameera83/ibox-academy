import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  APP_ROLES,
  isPermissionKey,
  type AppRole,
  type PermissionKey,
} from "@/lib/auth/permissions";

export type AccountStatus = "invited" | "active" | "suspended" | "deactivated";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AppRole;
  status: AccountStatus;
  /** Explicit grants for staff. Owner is implicitly allowed everything. */
  permissions: PermissionKey[];
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  status: AccountStatus;
};

/**
 * Returns the verified signed-in user, or null.
 * getClaims() validates the JWT signature — never trust getSession() on the server.
 * Cached per request, so layouts and pages can both call it cheaply.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const userId = data.claims.sub;
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, status")
    .eq("id", userId)
    .maybeSingle();
  const profile = profileData as ProfileRow | null;

  if (!profile || !(APP_ROLES as readonly string[]).includes(profile.role)) return null;

  let permissions: PermissionKey[] = [];
  if (profile.role === "staff") {
    const { data: rows } = await supabase
      .from("staff_permissions")
      .select("permission_key")
      .eq("user_id", userId);
    permissions = ((rows ?? []) as { permission_key: string }[])
      .map((r) => r.permission_key)
      .filter(isPermissionKey);
  }

  return {
    id: profile.id,
    email: profile.email ?? (typeof data.claims.email === "string" ? data.claims.email : ""),
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    role: profile.role as AppRole,
    status: profile.status,
    permissions,
  };
});

export function hasPermission(user: SessionUser, key: PermissionKey): boolean {
  if (user.status !== "active") return false;
  if (user.role === "owner") return true;
  if (user.role === "staff") return user.permissions.includes(key);
  return false;
}

/** Signed-in and active, otherwise redirect. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "active") redirect("/access-denied?reason=account");
  return user;
}

export async function requireRole(...roles: AppRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/access-denied");
  return user;
}

export async function requirePermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireRole("owner", "staff");
  if (!hasPermission(user, key)) redirect(`/access-denied?permission=${encodeURIComponent(key)}`);
  return user;
}
