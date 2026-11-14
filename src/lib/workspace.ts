import "server-only";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "@/lib/dal/session";

/** Dashboard root for a signed-in team member: the Owner area or the staff workspace. */
export function workspaceBase(user: Pick<SessionUser, "role">): "/app/owner" | "/app/staff" {
  return user.role === "owner" ? "/app/owner" : "/app/staff";
}

/** Refresh a screen in both workspaces, e.g. revalidateWorkspaces("/courses"). */
export function revalidateWorkspaces(path: string, type?: "page" | "layout") {
  revalidatePath(`/app/owner${path}`, type);
  revalidatePath(`/app/staff${path}`, type);
}
