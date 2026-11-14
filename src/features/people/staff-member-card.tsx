"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, UserMinus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import type { StaffMember } from "@/lib/dal/people";
import { cn } from "@/lib/utils";
import { AccountStatusControl } from "./account-status-control";
import { removeStaffAction, updateStaffPermissionsAction } from "./actions";
import { ActionDialog } from "./action-dialog";
import { PermissionPicker } from "./permission-picker";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export function StaffMemberCard({ member }: { member: StaffMember }) {
  const router = useRouter();
  const name = member.full_name || member.email || "Staff member";
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState(member.permissions);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = permissions.join() !== member.permissions.join();

  function save() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await updateStaffPermissionsAction(member.id, permissions);
      if (!res.ok) return setError(res.error);
      setMessage(res.message ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <li className="rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lilac text-sm font-bold text-ink" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
            {name}
            {member.status !== "active" && <StatusBadge status={member.status} />}
            {member.invitePending && member.status === "active" && <StatusBadge status="invited" label="Invite pending" />}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {member.email}
            {member.lastSignInAt ? ` · Last signed in ${dateFormat.format(new Date(member.lastSignInAt))}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-canvas"
        >
          <KeyRound className="size-4" aria-hidden="true" />
          {member.permissions.length} permission{member.permissions.length === 1 ? "" : "s"}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      {!open && member.permissions.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-4 pb-4">
          {member.permissions.map((k) => (
            <li key={k} className="rounded-full bg-canvas px-2.5 py-0.5 text-xs text-ink-muted">
              {(PERMISSIONS as Record<string, { label: string }>)[k as PermissionKey]?.label ?? k}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <PermissionPicker idPrefix={member.id} value={permissions} onChange={setPermissions} />
          {error && <Alert tone="danger">{error}</Alert>}
          {message && !dirty && <Alert tone="success">{message}</Alert>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button size="sm" onClick={save} loading={pending} disabled={!dirty} className="rounded-full">Save permissions</Button>
            {dirty && (
              <Button size="sm" variant="tertiary" onClick={() => setPermissions(member.permissions)} disabled={pending}>Discard</Button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <AccountStatusControl userId={member.id} name={name} status={member.status} />
              <ActionDialog
                trigger={<><UserMinus className="size-4" aria-hidden="true" /> Remove from team</>}
                triggerVariant="tertiary"
                title={`Remove ${name} from your team?`}
                body="All their permissions are removed and their account becomes a learner account. Courses they bought stay with them."
                confirmLabel="Remove from team"
                confirmVariant="destructive"
                run={() => removeStaffAction(member.id)}
              />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
