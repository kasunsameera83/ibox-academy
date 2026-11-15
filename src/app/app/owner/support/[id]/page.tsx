import type { Metadata } from "next";
import { SupportTicketScreen } from "@/features/screens/support-ticket";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Support ticket" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("owner");
  const { id } = await params;
  return <SupportTicketScreen id={id} user={user} base="/app/owner" />;
}
