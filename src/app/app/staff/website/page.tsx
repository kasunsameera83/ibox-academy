import type { Metadata } from "next";
import { WebsiteScreen } from "@/features/screens/website";
import { requirePermission } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Website" };

export default async function Page() {
  const user = await requirePermission("cms.read");
  return <WebsiteScreen user={user} base="/app/staff" />;
}
