import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/layouts/coming-soon";
import { ownerNav } from "@/config/navigation";
import { requireRole } from "@/lib/dal/session";
import { findNavItem } from "@/lib/navigation";

export default async function OwnerSectionPage({ params }: { params: Promise<{ section: string[] }> }) {
  await requireRole("owner");
  const { section } = await params;
  const item = findNavItem(ownerNav, `/app/owner/${section.join("/")}`);
  if (!item) notFound();
  return <ComingSoon title={item.label} description={item.description} phase={item.phase} backHref="/app/owner" />;
}
