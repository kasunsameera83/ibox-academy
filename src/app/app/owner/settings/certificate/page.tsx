import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import { CertificateDesigner } from "@/features/certificates/certificate-designer";
import { getDefaultCertificate } from "@/lib/dal/certificates";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Certificate" };

/** The academy-wide certificate: every course uses it unless customised in the course builder. */
export default async function CertificateSettingsPage() {
  await requireRole("owner");
  const { design } = await getDefaultCertificate();

  return (
    <>
      <Link href="/app/owner/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Settings
      </Link>
      <PageHeader
        title="Default certificate"
        description="Set the look, signatures and wording once. Every course uses this unless you customise its certificate in the course builder."
      />
      <Card className="p-5 sm:p-7">
        <CertificateDesigner mode="default" initial={design} />
      </Card>
    </>
  );
}
