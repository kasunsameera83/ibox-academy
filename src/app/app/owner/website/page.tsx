import type { Metadata } from "next";
import { WebsiteScreen } from "@/features/screens/website";
import type { SearchParams } from "@/lib/utils";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Website" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("owner");
  return <WebsiteScreen user={user} base="/app/owner" searchParams={searchParams} />;
}
