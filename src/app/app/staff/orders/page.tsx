import type { Metadata } from "next";
import { OrdersScreen } from "@/features/screens/orders";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("orders.read");
  return <OrdersScreen searchParams={searchParams} user={user} base="/app/staff" />;
}
