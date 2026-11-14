import type { Metadata } from "next";
import { ComingSoon } from "@/components/layouts/coming-soon";

export const metadata: Metadata = { title: "Help centre" };

export default function Page() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <ComingSoon title="Help centre" description="Answers about courses, payments and your account." phase={4} backHref="/" backLabel="Back to home" />
    </div>
  );
}
