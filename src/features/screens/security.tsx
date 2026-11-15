import Link from "next/link";
import { Download, KeyRound, LogOut, ShieldCheck, ShieldOff, Smartphone, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { revokeSessionsAction } from "@/features/security/actions";
import {
  failedSigninSummary,
  listActivity,
  listSessions,
  listSignins,
  listTeamSecurity,
  type ActivityRow,
  type TeamMember,
} from "@/lib/dal/security";
import type { SessionUser } from "@/lib/dal/session";
import { ACTIVITY_GROUPS, PERIODS, SIGNIN_EVENTS, SIGNIN_FILTERS, actionLabel, deviceLabel, isSensitive, type ActivityGroup } from "@/lib/security/labels";
import { cn, param, type SearchParams } from "@/lib/utils";

const TABS = [
  { value: "activity", label: "Activity log" },
  { value: "signins", label: "Sign-in activity" },
  { value: "team", label: "Team security" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const ROLE_LABEL = { owner: "Owner", staff: "Staff", student: "Learner" } as const;

function when(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ago(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function Pills<T extends string | number>({
  items,
  current,
  href,
  label,
  wrap = false,
}: {
  items: readonly { value: T; label: string }[];
  current: T;
  href: (v: T) => string;
  label: string;
  /** Separate chips that wrap onto more lines, for long filter lists. */
  wrap?: boolean;
}) {
  if (wrap) {
    return (
      <nav aria-label={label}>
        <ul className="flex flex-wrap gap-2">
          {items.map((i) => (
            <li key={String(i.value)}>
              <Link
                href={href(i.value)}
                aria-current={current === i.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold",
                  current === i.value ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink/30",
                )}
              >
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
        {items.map((i) => (
          <li key={String(i.value)}>
            <Link
              href={href(i.value)}
              aria-current={current === i.value ? "page" : undefined}
              className={cn("inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold", current === i.value ? "bg-ink text-white" : "text-ink hover:bg-ink/5")}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NoAccess() {
  return (
    <Alert tone="warning">
      This page needs two-step sign-in. Sign out and back in with your authenticator code, then try again.
    </Alert>
  );
}

/** Security page: what happened, who signed in, and how the team's accounts are protected. */
export async function SecurityScreen({ user, base, searchParams }: { user: SessionUser; base: string; searchParams: SearchParams }) {
  const sp = await searchParams;
  const tabParam = param(sp.tab);
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : "activity";
  const canRevoke = user.role === "owner";

  return (
    <>
      <PageHeader title="Security" description="What changed and who changed it, who signed in, and how the team's accounts are protected." />
      <div className="mb-6">
        <Pills label="Security sections" items={TABS} current={tab} href={(v) => `${base}/security?tab=${v}`} />
      </div>
      {tab === "activity" && <ActivityTab base={base} sp={sp} />}
      {tab === "signins" && <SigninsTab base={base} sp={sp} />}
      {tab === "team" && <TeamTab base={base} sp={sp} canRevoke={canRevoke} selfId={user.id} />}
    </>
  );
}

type SP = Awaited<SearchParams>;

function periodFrom(sp: SP, fallback: number): number {
  const d = Number(param(sp.days));
  return PERIODS.some((p) => p.value === d) ? d : fallback;
}

// ------------------------------------------------------------------ activity

function metaSummary(row: ActivityRow): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(row.metadata ?? {})) {
    if (parts.length >= 3) break;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") parts.push(`${k.replace(/_/g, " ")}: ${String(v).slice(0, 60)}`);
  }
  return parts.join(" · ");
}

async function ActivityTab({ base, sp }: { base: string; sp: SP }) {
  const groupParam = param(sp.group);
  const group = (ACTIVITY_GROUPS.find((g) => g.value === groupParam) ?? ACTIVITY_GROUPS[0]);
  const days = periodFrom(sp, 30);
  const before = Number(param(sp.before)) || null;
  const rows = await listActivity({ prefixes: group.prefixes, days, before });
  if (rows === null) return <NoAccess />;

  const href = (o: { group?: ActivityGroup; days?: number; before?: number | null }) => {
    const q = new URLSearchParams({ tab: "activity", group: o.group ?? group.value, days: String(o.days ?? days) });
    if (o.before) q.set("before", String(o.before));
    return `${base}/security?${q}`;
  };
  const exportHref = `/api/security/activity?${new URLSearchParams({ group: group.value, days: String(days) })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Pills wrap label="Kind of activity" items={ACTIVITY_GROUPS} current={group.value} href={(v) => href({ group: v })} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pills label="Period" items={PERIODS.filter((p) => p.value !== 1)} current={days} href={(v) => href({ days: v })} />
          <a href={exportHref} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas">
            <Download className="size-4" aria-hidden="true" /> Export CSV
          </a>
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nothing recorded" description={before ? "There's nothing older in this period." : "No changes of this kind in this period."} className="border-0" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-1 px-5 py-3.5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-4">
                <time dateTime={r.created_at} className="text-sm text-ink-muted" title={when(r.created_at)}>
                  {when(r.created_at)}
                </time>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-ink">
                    <span className="font-semibold">{r.actor_name}</span>
                    {r.actor_role && r.actor_role !== "student" && <span className="text-xs text-ink-muted">{ROLE_LABEL[r.actor_role]}</span>}
                    <span>{actionLabel(r.action)}</span>
                    {isSensitive(r.action) && <StatusBadge status="sensitive" label="Sensitive" tone="warning" />}
                    {r.outcome !== "success" && <StatusBadge status={r.outcome} label={r.outcome === "denied" ? "Refused" : "Failed"} tone="danger" />}
                  </p>
                  {(r.target_id || metaSummary(r)) && (
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {[r.target_id && `${(r.target_type ?? "item").replace(/_/g, " ")} ${r.target_id.length > 24 ? `${r.target_id.slice(0, 8)}…` : r.target_id}`, metaSummary(r)].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {rows.length === 50 && (
        <Link href={href({ before: rows[rows.length - 1].id })} className="self-center text-sm font-semibold text-brand hover:underline">
          Show older
        </Link>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ sign-ins

async function SigninsTab({ base, sp }: { base: string; sp: SP }) {
  const filterParam = param(sp.show);
  const filter = SIGNIN_FILTERS.find((f) => f.value === filterParam) ?? SIGNIN_FILTERS[0];
  const days = periodFrom(sp, 7);
  const before = Number(param(sp.before)) || null;
  const [rows, flagged] = await Promise.all([listSignins({ events: filter.events, days: Math.min(days, 90), before }), failedSigninSummary()]);
  if (rows === null) return <NoAccess />;

  const href = (o: { show?: string; days?: number; before?: number | null }) => {
    const q = new URLSearchParams({ tab: "signins", show: o.show ?? filter.value, days: String(o.days ?? days) });
    if (o.before) q.set("before", String(o.before));
    return `${base}/security?${q}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {flagged.length > 0 && (
        <Alert tone="warning">
          <p className="font-semibold">Several failed sign-ins in the last 24 hours</p>
          <ul className="mt-1 list-disc pl-5">
            {flagged.map((f) => (
              <li key={f.email}>
                {f.user_name ? `${f.user_name} (${f.email})` : `${f.email} (no account)`}: {f.failures} attempts, last {ago(f.last_at)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            Supabase slows down repeated attempts automatically. If it&apos;s a team member who didn&apos;t do this, ask them to change their password, and sign them out everywhere from Team security.
          </p>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Pills wrap label="Kind of event" items={SIGNIN_FILTERS} current={filter.value} href={(v) => href({ show: v })} />
        <Pills label="Period" items={PERIODS.filter((p) => p.value <= 90)} current={days} href={(v) => href({ days: v })} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={KeyRound} title="No sign-in events" description="Nothing in this period. Events are kept for 90 days." className="border-0" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const ev = SIGNIN_EVENTS[r.event] ?? { label: r.event, tone: "neutral" as const };
              return (
                <li key={r.id} className="grid gap-1 px-5 py-3.5 md:grid-cols-[11rem_minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <time dateTime={r.created_at} className="text-sm text-ink-muted">{when(r.created_at)}</time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.event} label={ev.label} tone={ev.tone} />
                      <span className="truncate font-semibold text-ink">{r.user_name ?? r.email ?? "Unknown"}</span>
                      {r.user_role && r.user_role !== "student" && <span className="text-xs text-ink-muted">{ROLE_LABEL[r.user_role]}</span>}
                      {!r.user_id && r.event === "signin_failed" && <span className="text-xs text-ink-muted">no account with this email</span>}
                    </p>
                    {r.user_name && r.email && <p className="truncate text-sm text-ink-muted">{r.email}</p>}
                  </div>
                  <p className="text-sm text-ink-muted md:text-right">
                    {deviceLabel(r.user_agent)}
                    {r.ip && <span className="block font-mono text-xs">{r.ip}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {rows.length === 50 && (
        <Link href={href({ before: rows[rows.length - 1].id })} className="self-center text-sm font-semibold text-brand hover:underline">
          Show older
        </Link>
      )}
      <p className="text-xs text-ink-muted">Recorded from today&apos;s update onwards and kept for 90 days.</p>
    </div>
  );
}

// ------------------------------------------------------------------ team

async function TeamTab({ base, sp, canRevoke, selfId }: { base: string; sp: SP; canRevoke: boolean; selfId: string }) {
  const team = await listTeamSecurity();
  if (team === null) return <NoAccess />;
  const memberId = param(sp.member);
  const member = team.find((m) => m.id === memberId) ?? null;
  const sessions = member ? await listSessions(member.id) : [];
  const signedOut = param(sp.signed_out);
  const failed = param(sp.error) === "revoke";
  const withoutMfa = team.filter((m) => !m.mfa_enabled && m.status === "active");

  return (
    <div className="flex flex-col gap-4">
      {signedOut !== undefined && (
        <Alert tone="success">
          Signed out of {signedOut} {signedOut === "1" ? "device" : "devices"}. Pages they already have open stop working within the hour.
        </Alert>
      )}
      {failed && <Alert tone="danger">They couldn&apos;t be signed out. Please try again.</Alert>}
      {withoutMfa.length > 0 && (
        <Alert tone="warning">
          {withoutMfa.map((m) => m.name).join(", ")} {withoutMfa.length === 1 ? "hasn't" : "haven't"} set up two-step sign-in yet. They can&apos;t open the dashboard until they do.
        </Alert>
      )}

      <Card>
        {team.length === 0 ? (
          <EmptyState icon={UserRound} title="No team members" description="Add staff from Staff & roles." className="border-0" />
        ) : (
          <ul className="divide-y divide-line">
            {team.map((m) => (
              <li key={m.id}>
                <Link
                  href={`${base}/security?tab=team&member=${m.id}`}
                  aria-current={member?.id === m.id ? "true" : undefined}
                  className={cn("grid gap-2 px-5 py-4 hover:bg-canvas md:grid-cols-[minmax(0,1fr)_auto] md:items-center", member?.id === m.id && "bg-canvas")}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{m.name}</span>
                      <span className="text-xs text-ink-muted">{ROLE_LABEL[m.role]}</span>
                      {m.status !== "active" && <StatusBadge status={m.status} />}
                    </p>
                    <p className="truncate text-sm text-ink-muted">{m.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted md:justify-end">
                    <TwoStep member={m} />
                    <span>Last sign-in: {ago(m.last_sign_in_at)}</span>
                    <span>
                      {m.active_sessions} {m.active_sessions === 1 ? "device" : "devices"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {member && (
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Where {member.name} is signed in</h2>
              <p className="text-sm text-ink-muted">Devices and browsers with an active sign-in, most recently used first.</p>
            </div>
            {canRevoke && sessions.length > 0 && (
              <ConfirmForm
                action={revokeSessionsAction}
                fields={{ userId: member.id }}
                triggerVariant="secondary"
                trigger={
                  <>
                    <LogOut className="size-4" aria-hidden="true" /> Sign out everywhere
                  </>
                }
                title={member.id === selfId ? "Sign yourself out everywhere?" : `Sign ${member.name} out everywhere?`}
                body={
                  member.id === selfId
                    ? "You'll be signed out on every device, including this one, and need to sign in again with your password and two-step code."
                    : `${member.name} will be signed out on all ${sessions.length} ${sessions.length === 1 ? "device" : "devices"} and need their password and two-step code to get back in. If you think their password is known to someone else, also ask them to change it.`
                }
                confirmLabel="Sign out everywhere"
                confirmVariant="destructive"
              />
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Not signed in anywhere right now.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-card border border-line">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Smartphone className="size-4 text-ink-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{deviceLabel(s.user_agent)}</p>
                    <p className="text-sm text-ink-muted">
                      Signed in {when(s.created_at)} · last active {ago(s.last_active_at)}
                      {s.ip && <span className="font-mono"> · {s.ip}</span>}
                    </p>
                  </div>
                  {s.two_step ? <StatusBadge status="aal2" label="Two-step verified" tone="success" /> : <StatusBadge status="aal1" label="Password only" tone="neutral" />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function TwoStep({ member }: { member: TeamMember }) {
  return member.mfa_enabled ? (
    <span className="inline-flex items-center gap-1 font-semibold text-success-ink">
      <ShieldCheck className="size-4" aria-hidden="true" /> Two-step on
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-danger-ink">
      <ShieldOff className="size-4" aria-hidden="true" /> No two-step
    </span>
  );
}

