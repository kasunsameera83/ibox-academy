import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { ownerNav } from "@/config/navigation";
import { requireRole } from "@/lib/dal/session";
import { toShellUser } from "@/lib/shell-user";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("owner");
  return (
    <DashboardShell workspaceLabel="Owner" rootHref="/app/owner" nav={ownerNav} user={toShellUser(user)}>
      {children}
    </DashboardShell>
  );
}
