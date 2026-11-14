import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/dal/session";
import { PERMISSIONS, homePathFor, isPermissionKey } from "@/lib/auth/permissions";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Access restricted" };

export default async function AccessDeniedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reason = param(params.reason);
  const permissionKey = param(params.permission);
  const user = await getCurrentUser();
  const permission = permissionKey && isPermissionKey(permissionKey) ? PERMISSIONS[permissionKey] : null;

  let description = "You don't have access to this area.";
  if (reason === "account") {
    description = "Your account is not active. If you think this is a mistake, please contact support.";
  } else if (permission && user?.role === "staff") {
    description = `This needs the “${permission.label}” permission. Ask the Owner to grant it if you need it for your work.`;
  } else if (user?.role === "staff") {
    description = "This area isn't part of your assigned work. Ask the Owner if you need access.";
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-5 sm:px-8"><Logo /></header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 pb-20">
        <EmptyState
          icon={ShieldAlert}
          title="Access restricted"
          description={description}
          action={
            user && reason !== "account" ? (
              <ButtonLink href={homePathFor(user.role)}>Back to my dashboard</ButtonLink>
            ) : (
              <ButtonLink href="/">Go to home page</ButtonLink>
            )
          }
        />
      </main>
    </div>
  );
}
