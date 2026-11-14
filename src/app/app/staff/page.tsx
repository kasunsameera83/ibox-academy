import type { Metadata } from "next";
import { ClipboardList, KeyRound } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { requireRole } from "@/lib/dal/session";
import { firstName, greeting } from "@/lib/shell-user";

export const metadata: Metadata = { title: "My workspace" };

const counters = ["Assigned to me", "Due today", "Needs attention"];

export default async function StaffWorkspacePage() {
  const user = await requireRole("staff");

  return (
    <>
      <PageHeader title={`${greeting()}, ${firstName(user)}`} description="Your assigned work" />

      <section aria-label="Work summary" className="grid gap-4 sm:grid-cols-3">
        {counters.map((label) => (
          <Card key={label} className="p-5">
            <p className="text-sm font-medium text-ink-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-ink">0</p>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardHeader title="Work queue" />
        {user.permissions.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No modules assigned yet"
            description="The Owner hasn't granted you any work areas. Once they do, those tools will appear in your menu."
          />
        ) : (
          <EmptyState icon={ClipboardList} title="Nothing in your queue" description="New tasks assigned to you will appear here." />
        )}
      </Card>
    </>
  );
}
