"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { setWishlistAction } from "./actions";

/**
 * Heart toggle with an accessible name and spoken feedback (blueprint:
 * "Wishlist/save control must have accessible label and signed-in feedback").
 * Signed-out visitors go to sign-in and come back to the course.
 */
export function WishlistButton({
  courseId, courseTitle, courseSlug, saved: initial, signedIn, variant = "icon",
}: {
  courseId: string; courseTitle: string; courseSlug: string; saved: boolean; signedIn: boolean; variant?: "icon" | "full";
}) {
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const label = saved ? `Remove ${courseTitle} from wishlist` : `Save ${courseTitle} to wishlist`;
  const shape =
    variant === "icon"
      ? "size-10 rounded-full bg-surface/95 shadow-sm hover:bg-surface"
      : "h-11 w-full gap-2 rounded-full border border-ink/15 bg-surface px-5 text-sm font-semibold hover:border-ink/30";
  const base = cn(
    "relative z-10 inline-flex items-center justify-center text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    shape,
  );
  const icon = <Heart className={cn("size-5", saved && "fill-danger text-danger")} aria-hidden="true" />;

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/courses/${courseSlug}`)}`} aria-label={variant === "icon" ? `Sign in to save ${courseTitle}` : undefined} className={base}>
        {icon}
        {variant === "full" && "Sign in to save"}
      </Link>
    );
  }

  function toggle() {
    const next = !saved;
    setSaved(next);
    start(async () => {
      const res = await setWishlistAction(courseId, next);
      if (!res.ok) {
        setSaved(!next);
        setMessage(res.error);
        return;
      }
      setMessage(next ? `Saved ${courseTitle} to your wishlist.` : `Removed ${courseTitle} from your wishlist.`);
    });
  }

  return (
    <>
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={saved} aria-label={variant === "icon" ? label : undefined} title={variant === "icon" ? label : undefined} className={base}>
        {icon}
        {variant === "full" && (saved ? "Saved to wishlist" : "Save to wishlist")}
      </button>
      <span role="status" className="sr-only">{message}</span>
    </>
  );
}
