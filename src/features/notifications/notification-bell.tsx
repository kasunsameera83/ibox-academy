"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Bell, BellRing, CheckCheck, ClipboardCheck, CreditCard, FileCheck2, Gift, UserPlus, X, type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Kind =
  | "signup" | "payment_received" | "free_enrolment" | "slip_uploaded" | "payment_review" | "payment_failed" | "chargeback"
  | "assignment_submitted" | "assignment_reviewed";

type Notification = {
  id: string;
  kind: Kind;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_STYLE: Record<Kind, { icon: LucideIcon; className: string }> = {
  signup: { icon: UserPlus, className: "bg-brand-soft text-brand" },
  payment_received: { icon: CreditCard, className: "bg-success-soft text-success-ink" },
  free_enrolment: { icon: Gift, className: "bg-lilac text-ink" },
  slip_uploaded: { icon: FileCheck2, className: "bg-warning-soft text-warning-ink" },
  payment_review: { icon: AlertTriangle, className: "bg-warning-soft text-warning-ink" },
  payment_failed: { icon: AlertTriangle, className: "bg-danger-soft text-danger-ink" },
  chargeback: { icon: AlertTriangle, className: "bg-danger-soft text-danger-ink" },
  assignment_submitted: { icon: ClipboardCheck, className: "bg-lilac text-ink" },
  assignment_reviewed: { icon: ClipboardCheck, className: "bg-success-soft text-success-ink" },
};

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function timeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

function KindIcon({ kind }: { kind: Kind }) {
  const { icon: Icon, className } = KIND_STYLE[kind] ?? KIND_STYLE.signup;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", className)} aria-hidden="true">
      <Icon className="size-4" />
    </span>
  );
}

/** Bell with unread count, dropdown list, live pop-ups and optional desktop alerts. */
export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [desktop, setDesktop] = useState<NotificationPermission | "unsupported">("default");
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }, []);

  // Initial load + live subscription.
  useEffect(() => {
    void load();
    setDesktop(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 30));
          setToasts((prev) => [...prev, n].slice(-3));
          setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== n.id)), 7000);
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            const desktopNote = new Notification(n.title, { body: n.body ?? undefined, tag: n.id });
            desktopNote.onclick = () => {
              window.focus();
              if (n.link) router.push(n.link);
            };
          }
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load, router]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)));
    await createClient().from("notifications").update({ read_at: now }).in("id", ids);
  }

  function openItem(n: Notification) {
    void markRead([n.id]);
    setOpen(false);
    setToasts((prev) => prev.filter((t) => t.id !== n.id));
    if (n.link) router.push(n.link);
  }

  async function enableDesktop() {
    if (!("Notification" in window)) return;
    setDesktop(await Notification.requestPermission());
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink"
      >
        {unread ? <BellRing className="size-5" aria-hidden="true" /> : <Bell className="size-5" aria-hidden="true" />}
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-5 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-card border border-line bg-surface shadow-float">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Notifications</p>
            <button
              type="button"
              disabled={!unread}
              onClick={() => void markRead(items.filter((n) => !n.read_at).map((n) => n.id))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:text-ink-muted disabled:no-underline"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all as read
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">You're all caught up. New alerts appear here instantly.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-canvas", !n.read_at && "bg-brand-soft/40")}>
                    <KindIcon kind={n.kind} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("text-sm text-ink", !n.read_at ? "font-bold" : "font-medium")}>{n.title}</span>
                        <span className="shrink-0 text-[11px] text-ink-muted">{timeAgo(n.created_at)}</span>
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{n.body}</span>}
                    </span>
                    {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {desktop === "default" && (
            <div className="border-t border-line px-4 py-3">
              <button type="button" onClick={() => void enableDesktop()} className="text-xs font-semibold text-brand hover:underline">
                Also show alerts on my computer when this tab is in the background
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live pop-ups */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((n) => (
          <div key={n.id} className="pointer-events-auto flex gap-3 rounded-card border border-line bg-surface p-3 shadow-float rise-in">
            <KindIcon kind={n.kind} />
            <button type="button" onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold text-ink">{n.title}</span>
              {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">{n.body}</span>}
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== n.id))}
              className="flex size-7 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-canvas"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
