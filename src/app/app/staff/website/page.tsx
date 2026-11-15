import type { Metadata } from "next";
import { WebsiteScreen } from "@/features/screens/website";
import type { SearchParams } from "@/lib/utils";
import { requirePermission } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Website" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("cms.read");
  return <WebsiteScreen user={user} base="/app/staff" searchParams={searchParams} />;
}
