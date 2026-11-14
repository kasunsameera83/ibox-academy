import type { Metadata } from "next";
import { ShieldCheck, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { StaffInviteForm } from "@/features/people/staff-invite-form";
import { StaffMemberCard } from "@/features/people/staff-member-card";
import { listStaff } from "@/lib/dal/people";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  await requireRole("owner");
  const staff = await listStaff();

  return (
    <>
      <PageHeader title="Staff & roles" description="Invite people to help run the academy and choose exactly what each person can do." />

      <Alert tone="info" className="mb-6">
        <span className="inline-flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Every staff member must set up two-step verification before they can use any permission. Only you can give out courses, change payments settings or manage staff.
        </span>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title="Invite someone" description="They get an email to set their password." />
          <div className="p-5">
            <StaffInviteForm />
          </div>
        </Card>

        <section aria-labelledby="team-heading" className="flex flex-col gap-3">
          <h2 id="team-heading" className="text-base font-semibold text-ink">
            Your team <span className="font-normal text-ink-muted">({staff.length})</span>
          </h2>
          {staff.length === 0 ? (
            <Card>
              <EmptyState icon={Users} title="No staff yet" description="Invite your first team member. You stay in control of what they can see and do." />
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {staff.map((m) => (
                <StaffMemberCard key={`${m.id}-${m.permissions.join()}-${m.status}`} member={m} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
