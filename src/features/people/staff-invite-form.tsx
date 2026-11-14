"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteStaffAction, promoteToStaffAction } from "./actions";
import { PermissionPicker } from "./permission-picker";

export function StaffInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null);
  const [pending, start] = useTransition();

  function reset(msg: string) {
    setMessage(msg);
    setEmail("");
    setFullName("");
    setPermissions([]);
    setExisting(null);
    router.refresh();
  }

  function invite() {
    setError(null);
    setMessage(null);
    setExisting(null);
    start(async () => {
      const res = await inviteStaffAction({ email, fullName, permissions });
      if ("existing" in res) return setExisting(res.existing);
      if (!res.ok) return setError(res.error);
      reset(res.message ?? "Invite sent.");
    });
  }

  function promote() {
    if (!existing) return;
    setError(null);
    start(async () => {
      const res = await promoteToStaffAction(existing.id, permissions);
      if (!res.ok) return setError(res.error);
      reset(res.message ?? "Staff access given.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" name="staff-name" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
        <Input label="Email" name="staff-email" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">What can they do?</p>
        <PermissionPicker idPrefix="invite" value={permissions} onChange={setPermissions} />
      </div>

      {existing && (
        <Alert tone="warning" title="This email already has a learner account">
          <span className="block">
            {existing.name} can become staff and keep their courses. They'll need to set up two-step verification next time they sign in.
          </span>
          <span className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={promote} loading={pending} className="rounded-full">
              <UserPlus className="size-4" aria-hidden="true" /> Give them staff access
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setExisting(null)} disabled={pending}>Cancel</Button>
          </span>
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {!existing && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={invite} loading={pending} className="rounded-full">
            <Send className="size-4" aria-hidden="true" /> Send invite
          </Button>
          {permissions.length === 0 && <p className="text-xs text-ink-muted">You can invite with no permissions and add them later.</p>}
        </div>
      )}
    </div>
  );
}
