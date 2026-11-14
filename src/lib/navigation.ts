import "server-only";
import type { NavItem } from "@/config/navigation";
import { hasPermission, type SessionUser } from "@/lib/dal/session";

/** Removes items the user is not allowed to see (blueprint §9: no disabled items). */
export function navFor(items: NavItem[], user: SessionUser): NavItem[] {
  return items.filter((item) => !item.permission || hasPermission(user, item.permission));
}

export function findNavItem(items: NavItem[], pathname: string): NavItem | undefined {
  return items.find((item) => item.href === pathname);
}
