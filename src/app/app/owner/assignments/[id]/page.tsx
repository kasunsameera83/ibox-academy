import type { Metadata } from "next";
import { AssignmentReviewScreen } from "@/features/screens/assignment-review";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Review assignment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("owner");
  return <AssignmentReviewScreen params={params} user={user} base="/app/owner" />;
}
