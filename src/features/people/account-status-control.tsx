"use client";

import { Ban, RotateCcw, UserX } from "lucide-react";
import type { AccountStatus } from "@/lib/dal/session";
import { setAccountStatusAction } from "./actions";
import { ActionDialog } from "./action-dialog";

export function AccountStatusControl({ userId, name, status }: { userId: string; name: string; status: AccountStatus }) {
  if (status === "suspended" || status === "deactivated") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionDialog
          trigger={<><RotateCcw className="size-4" aria-hidden="true" /> Reactivate</>}
          title={`Reactivate ${name}?`}
          body="They can sign in again and get back to every course they still have access to."
          confirmLabel="Reactivate account"
          reasonLabel="Reason"
          run={(reason) => setAccountStatusAction(userId, "active", reason)}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionDialog
        trigger={<><Ban className="size-4" aria-hidden="true" /> Suspend</>}
        title={`Suspend ${name}?`}
        body="They're signed out everywhere and can't sign in or open their courses until you reactivate them. Nothing is deleted."
        confirmLabel="Suspend account"
        confirmVariant="destructive"
        reasonLabel="Reason"
        run={(reason) => setAccountStatusAction(userId, "suspended", reason)}
      />
      <ActionDialog
        trigger={<><UserX className="size-4" aria-hidden="true" /> Deactivate</>}
        triggerVariant="tertiary"
        title={`Deactivate ${name}?`}
        body="Use this when someone asks to close their account. They're signed out and can't sign in. Their orders and certificates stay on record, and you can reactivate later."
        confirmLabel="Deactivate account"
        confirmVariant="destructive"
        reasonLabel="Reason"
        run={(reason) => setAccountStatusAction(userId, "deactivated", reason)}
      />
    </div>
  );
}
