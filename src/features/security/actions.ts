"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";

/** Owner only: signs a team member out on every device. */
export async function revokeSessionsAction(formData: FormData) {
  await requireRole("owner");
  const parsed = z.uuid().safeParse(formData.get("userId"));
  if (!parsed.success) redirect("/app/owner/security?tab=team&error=revoke");
  const userId = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("security_revoke_sessions", { p_user: userId });
  if (error) redirect(`/app/owner/security?tab=team&member=${userId}&error=revoke`);
  redirect(`/app/owner/security?tab=team&member=${userId}&signed_out=${Number(data) || 0}`);
}
