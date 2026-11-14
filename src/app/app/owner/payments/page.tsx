import type { Metadata } from "next";
import { PaymentsScreen } from "@/features/screens/payments";
import { requireRole } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("owner");
  return <PaymentsScreen searchParams={searchParams} user={user} base="/app/owner" />;
}
