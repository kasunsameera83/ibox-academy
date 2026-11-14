import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { studentBottomNav, studentNav } from "@/config/navigation";
import { requireRole } from "@/lib/dal/session";
import { toShellUser } from "@/lib/shell-user";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  // Owner may view the student area for support context (blueprint role matrix).
  const user = await requireRole("student", "owner");
  return (
    <DashboardShell
      workspaceLabel="My learning"
      rootHref="/app/student"
      nav={studentNav}
      bottomNav={studentBottomNav}
      user={toShellUser(user)}
    >
      {children}
    </DashboardShell>
  );
}
