"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveMyTicketAction } from "./actions";

export function ResolveMyTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() => start(async () => {
          const res = await resolveMyTicketAction(ticketId);
          if (!res.ok) setError(res.error);
          else router.refresh();
        })}
      >
        <CheckCircle2 className="size-4" aria-hidden="true" /> My problem is solved
      </Button>
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}
