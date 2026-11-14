import { notFound, redirect } from "next/navigation";
import { ComingSoon } from "@/components/layouts/coming-soon";
import { staffNav } from "@/config/navigation";
import { hasPermission, requireRole } from "@/lib/dal/session";
import { findNavItem } from "@/lib/navigation";

export default async function StaffSectionPage({ params }: { params: Promise<{ section: string[] }> }) {
  const user = await requireRole("staff");
  const { section } = await params;
  const item = findNavItem(staffNav, `/app/staff/${section.join("/")}`);
  if (!item) notFound();
  if (item.permission && !hasPermission(user, item.permission)) {
    redirect(`/access-denied?permission=${encodeURIComponent(item.permission)}`);
  }
  return <ComingSoon title={item.label} description={item.description} phase={item.phase} backHref="/app/staff" backLabel="Back to my workspace" />;
}
