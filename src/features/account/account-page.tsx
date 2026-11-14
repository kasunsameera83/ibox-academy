import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import type { SessionUser } from "@/lib/dal/session";
import { PasswordForm, ProfileForm } from "./account-forms";
import { SecurityPanel } from "./security-panel";

/** Shared account settings for every role. */
export function AccountPage({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader title="Account settings" description="Your profile, password and sign-in security." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader title="Profile" />
          <div className="p-5"><ProfileForm fullName={user.fullName ?? ""} email={user.email} /></div>
        </Card>
        <Card>
          <CardHeader title="Password" description="Signed in with Google? You can still set a password to sign in with email." />
          <div className="p-5"><PasswordForm /></div>
        </Card>
        <Card>
          <CardHeader title="Security" />
          <div className="p-5"><SecurityPanel mfaRequired={user.role === "owner"} /></div>
        </Card>
      </div>
    </>
  );
}
