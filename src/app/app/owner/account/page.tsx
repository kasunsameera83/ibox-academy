import type { Metadata } from "next";
import { AccountPage } from "@/features/account/account-page";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Account settings" };

export default async function OwnerAccountPage() {
  const user = await requireRole("owner");
  return <AccountPage user={user} />;
}
