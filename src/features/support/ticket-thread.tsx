import { Lock } from "lucide-react";
import type { TicketMessage } from "@/lib/dal/support";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

/** Conversation, oldest first. Internal notes (team view only) are marked and tinted. */
export function TicketThread({ messages, viewer }: { messages: TicketMessage[]; viewer: "learner" | "team" }) {
  return (
    <ol className="flex flex-col gap-4" aria-label="Conversation">
      {messages.map((m) => {
        const mine = viewer === "learner" ? !m.from_team : m.from_team;
        return (
          <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <article
              className={cn(
                "w-full max-w-[640px] rounded-card p-4 sm:p-5",
                m.is_internal ? "border border-dashed border-warning/50 bg-warning-soft" : m.from_team ? "bg-block-lilac" : "bg-surface border border-line",
              )}
            >
              <header className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-bold text-ink">{viewer === "learner" && !m.from_team ? "You" : m.author_name}</span>
                {m.is_internal && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-ink">
                    <Lock className="size-3" aria-hidden="true" /> Internal note, learner can't see
                  </span>
                )}
                <time dateTime={m.created_at} className="text-ink-muted">{when.format(new Date(m.created_at))}</time>
              </header>
              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink">{m.body}</p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
