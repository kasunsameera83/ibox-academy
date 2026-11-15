import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/permissions";
import type { SigninEvent } from "@/lib/security/labels";

/** Reads for the Security page. Each database function checks 'audit.read' itself. */

export type ActivityRow = {
  id: number;
  created_at: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  outcome: "success" | "failure" | "denied";
  metadata: Record<string, unknown>;
  actor_id: string | null;
  actor_name: string;
  actor_role: AppRole | null;
};

export async function listActivity(o: { prefixes: readonly string[] | null; actor?: string | null; days: number; before?: number | null; limit?: number }): Promise<ActivityRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("security_activity", {
    p_groups: o.prefixes ? [...o.prefixes] : null,
    p_actor: o.actor ?? null,
    p_days: o.days,
    p_before: o.before ?? null,
    p_limit: o.limit ?? 50,
  });
  if (error) return null;
  return (data ?? []) as ActivityRow[];
}

export type SigninRow = {
  id: number;
  created_at: string;
  event: SigninEvent;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  user_id: string | null;
  user_name: string | null;
  user_role: AppRole | null;
};

export async function listSignins(o: { events: readonly string[] | null; days: number; before?: number | null }): Promise<SigninRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("security_signins", {
    p_events: o.events ? [...o.events] : null,
    p_days: o.days,
    p_before: o.before ?? null,
    p_limit: 50,
  });
  if (error) return null;
  return (data ?? []) as SigninRow[];
}

export type FailedSummary = { email: string; user_id: string | null; user_name: string | null; failures: number; last_at: string };

export async function failedSigninSummary(): Promise<FailedSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("security_failed_signin_summary", { p_min: 5 });
  return ((data ?? []) as FailedSummary[]).map((r) => ({ ...r, failures: Number(r.failures) }));
}

export type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  role: AppRole;
  status: "active" | "suspended" | "deactivated";
  mfa_enabled: boolean;
  last_sign_in_at: string | null;
  active_sessions: number;
};

export async function listTeamSecurity(): Promise<TeamMember[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("security_team");
  if (error) return null;
  return (data ?? []) as TeamMember[];
}

export type SessionRow = { id: string; created_at: string; last_active_at: string | null; user_agent: string | null; ip: string | null; two_step: boolean };

export async function listSessions(userId: string): Promise<SessionRow[]> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("security_sessions", { p_user: userId });
  if (error) return [];
  return (data ?? []) as SessionRow[];
}
