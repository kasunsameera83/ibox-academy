import type { SessionUser } from "@/lib/dal/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";

/** Minimal, non-sensitive user data passed to client components. */
export function toShellUser(user: SessionUser) {
  return {
    name: user.fullName || user.email.split("@")[0] || "Account",
    email: user.email,
    roleLabel: ROLE_LABELS[user.role],
  };
}

export function firstName(user: SessionUser) {
  return (user.fullName || user.email.split("@")[0] || "there").split(" ")[0];
}

export function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Colombo" }).format(date));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
