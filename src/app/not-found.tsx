import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that page"
        description="The link may be broken, or the page may have moved."
        action={<ButtonLink href="/">Go to home page</ButtonLink>}
      />
    </main>
  );
}
