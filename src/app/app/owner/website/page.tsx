import type { Metadata } from "next";
import { WebsiteScreen } from "@/features/screens/website";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Website" };

export default async function Page() {
  const user = await requireRole("owner");
  return <WebsiteScreen user={user} base="/app/owner" />;
}
