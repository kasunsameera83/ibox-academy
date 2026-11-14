import { CheckCircle2, Clapperboard, Settings2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/**
 * Integration status for video hosting. The Owner sees how to connect it;
 * staff see a plain message without technical details.
 */
export function VideoHostingNotice({ connected, isOwner, compact = false }: { connected: boolean; isOwner: boolean; compact?: boolean }) {
  if (connected) {
    if (!compact) return null;
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" /> Video hosting connected
      </p>
    );
  }

  if (!isOwner) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-card border border-line bg-canvas p-4">
        <Clapperboard className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-ink">Video uploads aren't available right now</p>
          <p className="text-sm text-ink-muted">You can still build lessons. Ask the Owner to connect video hosting.</p>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col gap-4 rounded-card border border-warning/30 bg-warning-soft/60 p-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface text-warning-ink">
        <Clapperboard className="size-5" aria-hidden="true" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold text-ink">
          Video hosting <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-warning-ink">Not connected</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">Connect your video provider to upload and process course videos.</p>
      </div>
      <ButtonLink href="/app/owner/settings/integrations" size="sm">
        <Settings2 className="size-4" aria-hidden="true" /> Configure integration
      </ButtonLink>
    </div>
  );
}
