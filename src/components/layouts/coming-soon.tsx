import { Hammer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "./page-header";

/** Honest placeholder for screens scheduled in a later build phase. */
export function ComingSoon({
  title,
  description,
  phase,
  backHref,
  backLabel = "Back to overview",
}: {
  title: string;
  description?: string;
  phase?: number;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={Hammer}
          title="This screen isn't built yet"
          description={phase ? `It is scheduled for Phase ${phase} of the build plan.` : "It is scheduled for a later build phase."}
          action={<ButtonLink href={backHref} variant="secondary" size="sm">{backLabel}</ButtonLink>}
        />
      </Card>
    </>
  );
}
