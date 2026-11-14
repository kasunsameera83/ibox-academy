import type { Metadata } from "next";
import { ComingSoon } from "@/components/layouts/coming-soon";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <ComingSoon
        title="Checkout"
        description="Card payments through PayHere and bank transfer with slip upload."
        phase={3}
        backHref={`/courses/${slug}`}
        backLabel="Back to the course"
      />
    </div>
  );
}
