import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records an append-only audit event. Signed-in users can't write to the
 * audit log directly, so this uses the server-only service-role client.
 * Call it only after the server has checked who the user is and what they
 * may do; actorId must come from the verified session, never from a form.
 * Never include secrets or personal data in metadata.
 */
export async function recordAudit(
  actorId: string,
  action: string,
  target?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
) {
  try {
    const { error } = await createAdminClient().from("audit_events").insert({
      actor_id: actorId,
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      metadata,
    });
    if (error) console.error("audit_events insert failed", action);
  } catch {
    console.error("audit_events insert failed (service key missing?)", action);
  }
}
