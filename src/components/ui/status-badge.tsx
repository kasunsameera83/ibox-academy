import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted border-line",
  brand: "bg-brand-soft text-brand border-brand/20",
  success: "bg-success-soft text-success-ink border-success/25",
  warning: "bg-warning-soft text-warning-ink border-warning/25",
  danger: "bg-danger-soft text-danger-ink border-danger/25",
};

/** Global status vocabulary (blueprint §11). Text is always shown — never colour alone. */
const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "warning" },
  changes_requested: { label: "Changes requested", tone: "warning" },
  scheduled: { label: "Scheduled", tone: "brand" },
  published: { label: "Published", tone: "success" },
  unpublished: { label: "Unpublished", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  under_review: { label: "Under review", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  partially_refunded: { label: "Partially refunded", tone: "neutral" },
  refunded: { label: "Refunded", tone: "neutral" },
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "brand" },
  completed: { label: "Completed", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "danger" },
  invited: { label: "Invited", tone: "brand" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "danger" },
  deactivated: { label: "Deactivated", tone: "neutral" },
};

export function StatusBadge({ status, label, tone, className }: { status: string; label?: string; tone?: Tone; className?: string }) {
  const def = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone ?? def.tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label ?? def.label}
    </span>
  );
}
