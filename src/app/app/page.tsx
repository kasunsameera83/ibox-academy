import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal/session";
import { homePathFor } from "@/lib/auth/permissions";
import { param, type SearchParams } from "@/lib/utils";

/** Sends each signed-in user to their own workspace. */
export default async function AppIndex({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const password = param((await searchParams).password);
  redirect(`${homePathFor(user.role)}${password === "updated" ? "?password=updated" : ""}`);
}
