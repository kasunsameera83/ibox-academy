import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Records an append-only audit event. Never include secrets or personal data in metadata. */
export async function recordAudit(
  supabase: SupabaseServerClient,
  actorId: string,
  action: string,
  target?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("audit_events").insert({
    actor_id: actorId,
    action,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    metadata,
  });
  if (error) console.error("audit_events insert failed", action);
}
