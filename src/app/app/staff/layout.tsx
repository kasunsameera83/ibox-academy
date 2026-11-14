import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { staffNav } from "@/config/navigation";
import { requireRole } from "@/lib/dal/session";
import { navFor } from "@/lib/navigation";
import { toShellUser } from "@/lib/shell-user";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("staff");
  return (
    <DashboardShell workspaceLabel="Staff workspace" rootHref="/app/staff" nav={navFor(staffNav, user)} user={toShellUser(user)}>
      {children}
    </DashboardShell>
  );
}
