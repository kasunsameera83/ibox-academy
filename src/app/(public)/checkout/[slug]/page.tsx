import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { CheckoutForm } from "@/features/checkout/checkout-form";
import { accessLabel, effectivePrice, formatPrice, mediaUrl } from "@/lib/courses/format";
import { getCourseBySlug } from "@/lib/dal/courses";
import { bankDetailsComplete, getBankDetails, hasActiveEnrolment } from "@/lib/dal/orders";
import { getCurrentUser } from "@/lib/dal/session";
import { isPayhereConfigured, payhereMode } from "@/lib/payhere";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  // Share links can carry a promo code: /checkout/<course>?code=LAUNCH20
  const code = (param(sp.code) ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${slug}${code ? `?code=${code}` : ""}`)}`);

  const course = await getCourseBySlug(slug);
  if (!course || course.status !== "published") notFound();
  if (await hasActiveEnrolment(user.id, course.id)) redirect(`/app/student/learning?enrolled=${course.slug}`);

  const price = effectivePrice(course) ?? 0;
  const onSale = course.sale_price_lkr !== null && course.price_lkr !== null;
  const thumb = mediaUrl(course.thumbnail_path);
  const cardAvailable = isPayhereConfigured();
  const bankAvailable = bankDetailsComplete(await getBankDetails());

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6 lg:px-8">
      <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to the course
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="pay-heading" className="rounded-[24px] border border-line bg-surface p-6 sm:p-8">
          <h2 id="pay-heading" className="mb-5 text-lg font-bold text-ink">{price === 0 ? "Confirm your enrolment" : "Payment"}</h2>
          {cardAvailable && payhereMode() === "sandbox" && price > 0 && (
            <Alert tone="warning" className="mb-5">Test mode: card payments go to the PayHere sandbox and no real money is taken.</Alert>
          )}
          {!cardAvailable && !bankAvailable && price > 0 ? (
            <Alert tone="warning">Payments aren't open yet. Please check back soon.</Alert>
          ) : (
            <CheckoutForm slug={course.slug} listPrice={price} isFree={price === 0} cardAvailable={cardAvailable} bankAvailable={bankAvailable} initialCode={code} />
          )}
        </section>

        <aside aria-label="Order summary" className="self-start rounded-[24px] border border-line bg-surface p-6">
          <h2 className="text-sm font-semibold text-ink-muted">Order summary</h2>
          <div className="mt-4 flex gap-3">
            <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-control bg-brand-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
            </div>
            <p className="font-bold leading-snug text-ink">{course.title}</p>
          </div>
          <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            {onSale && (
              <div className="flex justify-between text-ink-muted">
                <dt>Regular price</dt>
                <dd className="line-through">{formatPrice(course.price_lkr)}</dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-extrabold text-ink">
              <dt>Price</dt>
              <dd>{formatPrice(price)}</dd>
            </div>
            {price > 0 && <p className="text-xs text-ink-muted">Have a promo code? Add it with your payment details.</p>}
          </dl>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-muted">
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> {accessLabel(course.access_type, course.access_days)}, starting when payment is confirmed</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> Signed in as {user.email}</li>
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            By paying you agree to our <Link href="/policies" className="underline hover:text-ink">terms and refund policy</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
}
