import type { Metadata } from "next";
import { ComingSoon } from "@/components/layouts/coming-soon";

export const metadata: Metadata = { title: "Contact us" };

export default function Page() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <ComingSoon title="Contact us" description="Support channels and response times." phase={2} backHref="/" backLabel="Back to home" />
    </div>
  );
}
