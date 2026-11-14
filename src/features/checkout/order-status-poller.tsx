"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrderStatusAction } from "./actions";

/** Re-checks a pending PayHere order until the server confirms it. */
export function OrderStatusPoller({ reference, initialStatus }: { reference: string; initialStatus: string }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const status = await getOrderStatusAction(reference);
      if ((status && status !== initialStatus) || tries > 40) {
        clearInterval(timer);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [reference, initialStatus, router]);
  return null;
}
