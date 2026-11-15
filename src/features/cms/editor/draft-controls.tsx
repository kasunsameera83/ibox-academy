"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, History, Loader2, TriangleAlert, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PageVersion } from "@/lib/dal/cms";
import { cn } from "@/lib/utils";
import { discardDraftAction, publishPageAction, restoreVersionAction, saveDraftAction } from "../actions";

export type SaveState = "saved" | "unsaved" | "saving" | "invalid" | "error" | "conflict";

/** Key-sorted JSON, so "has it changed?" doesn't depend on key order. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

const NOTICE_KEY = "cms-notice";
const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

/**
 * Draft state shared by every editor: autosaves a second after the last
 * change, refuses to overwrite someone else's newer save, and warns before
 * leaving with unsaved changes.
 */
export function useDraft<T>({
  slug, initial, savedAt, canEdit, prepare, check,
}: {
  slug: string;
  initial: T;
  savedAt: string | null;
  canEdit: boolean;
  /** Tidy the value before saving (e.g. drop blank lines). */
  prepare: (value: T) => T;
  /** Returns a message when the value isn't ready to save. */
  check: (value: T) => string | null;
}) {
  const [value, setValue] = useState<T>(initial);
  const [savedJson, setSavedJson] = useState(() => (savedAt ? stable(initial) : ""));
  const [expected, setExpected] = useState<string | null>(savedAt);
  const [state, setState] = useState<SaveState>(savedAt ? "saved" : "unsaved");
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const json = useMemo(() => stable(value), [value]);
  const dirty = json !== savedJson;

  const save = useCallback(async () => {
    const prepared = prepare(value);
    const problem = check(prepared);
    if (problem) {
      setState("invalid");
      setMessage(problem);
      return;
    }
    setState("saving");
    const res = await saveDraftAction(slug, prepared, expected);
    if (!res.ok) {
      setState(res.conflict ? "conflict" : "error");
      setMessage(res.error);
      return;
    }
    setExpected(res.updatedAt);
    setSavedJson(stable(value));
    setState("saved");
    setMessage(null);
    setReloadKey((k) => k + 1);
  }, [value, expected, slug, prepare, check]);

  useEffect(() => {
    if (!canEdit || !dirty || state === "conflict" || state === "saving") return;
    setState((s) => (s === "invalid" || s === "error" ? s : "unsaved"));
    const t = setTimeout(() => void save(), 1200);
    return () => clearTimeout(t);
    // Re-checked after each save finishes, so edits made while saving are saved too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, canEdit, state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return { value, setValue, state, message, dirty, save, reloadKey };
}

function rememberNotice(text: string) {
  try { sessionStorage.setItem(NOTICE_KEY, text); } catch { /* storage unavailable */ }
}

/**
 * Title, save status, preview link, history and publish for one page,
 * plus the messages that go with them.
 */
export function DraftToolbar({
  slug, label, publicPath, previewHref, draft, differsFromLive, publishedAt, publishedBy, versions, canEdit, canPublish, extra,
}: {
  slug: string;
  label: string;
  publicPath: string;
  previewHref: string;
  draft: { state: SaveState; message: string | null; dirty: boolean; save: () => Promise<void> };
  differsFromLive: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  versions: PageVersion[];
  canEdit: boolean;
  canPublish: boolean;
  /** Extra controls, e.g. the device switcher. */
  extra?: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const publishRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const publishTitle = useId();
  const historyTitle = useId();
  const [note, setNote] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const n = sessionStorage.getItem(NOTICE_KEY);
      if (n) { setNotice(n); sessionStorage.removeItem(NOTICE_KEY); }
    } catch { /* storage unavailable */ }
  }, []);

  const { state, message, dirty } = draft;
  const isLive = Boolean(publishedAt);

  function publish() {
    setDialogError(null);
    start(async () => {
      const res = await publishPageAction(slug, note);
      if (!res.ok) return setDialogError(res.error);
      publishRef.current?.close();
      setNote("");
      setNotice(`Published as version ${res.version}. ${label} on the live site now shows these changes.`);
      router.refresh();
    });
  }

  function restore(versionId: string, versionNo: number) {
    setDialogError(null);
    start(async () => {
      const res = await restoreVersionAction(slug, versionId);
      if (!res.ok) return setDialogError(res.error);
      rememberNotice(`Version ${versionNo} is back in your draft. Publish it to make it live.`);
      window.location.reload();
    });
  }

  function discard() {
    setDialogError(null);
    start(async () => {
      const res = await discardDraftAction(slug);
      if (!res.ok) return setDialogError(res.error);
      rememberNotice("Unpublished changes discarded. The draft now matches the live site.");
      window.location.reload();
    });
  }

  const status = (() => {
    switch (state) {
      case "saving": return { icon: <Loader2 className="size-4 animate-spin" />, text: "Saving…", tone: "text-ink-muted" };
      case "unsaved": return { icon: <span className="size-2 rounded-full bg-warning" />, text: "Unsaved changes", tone: "text-ink-muted" };
      case "invalid": return { icon: <TriangleAlert className="size-4" />, text: "Not saved", tone: "text-warning-ink" };
      case "error": return { icon: <TriangleAlert className="size-4" />, text: "Not saved", tone: "text-danger-ink" };
      case "conflict": return { icon: <TriangleAlert className="size-4" />, text: "Changed elsewhere", tone: "text-danger-ink" };
      default: return { icon: <Check className="size-4" />, text: "Draft saved", tone: "text-success-ink" };
    }
  })();

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface px-4 py-3">
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink">{label}</h2>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink", !isLive ? "bg-block-lemon" : differsFromLive ? "bg-block-sky" : "bg-block-mint")}>
              {!isLive ? "Not published yet" : differsFromLive ? "Draft differs from live" : "Live matches draft"}
            </span>
          </div>
          <p role="status" className={cn("mt-0.5 flex flex-wrap items-center gap-1.5 text-sm", status.tone)}>
            {status.icon} {status.text}
            {publishedAt && <span className="text-ink-muted"> · Last published {dateTime.format(new Date(publishedAt))}{publishedBy ? ` by ${publishedBy}` : ""}</span>}
          </p>
        </div>
        {extra}
        <div className="flex flex-wrap items-center gap-2">
          <a href={previewHref} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-ink/5">
            <ExternalLink className="size-4" aria-hidden="true" /> Preview
          </a>
          <Button variant="secondary" size="sm" onClick={() => { setDialogError(null); historyRef.current?.showModal(); }}>
            <History className="size-4" aria-hidden="true" /> History
          </Button>
          {canPublish && (
            <Button
              size="sm"
              disabled={dirty || state !== "saved" || !differsFromLive}
              title={dirty ? "Wait for the draft to save" : !differsFromLive ? "Nothing new to publish" : undefined}
              onClick={() => { setDialogError(null); publishRef.current?.showModal(); }}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      {!canEdit && <Alert tone="info">You can view this page and its history. Ask the Owner for “Edit website drafts” to make changes.</Alert>}
      {canEdit && !canPublish && <Alert tone="info">Your changes are saved as a draft. Someone with “Publish website changes” makes them live.</Alert>}
      {message && (state === "invalid" || state === "error" || state === "conflict") && (
        <Alert tone={state === "invalid" ? "warning" : "danger"}>
          {message}
          {state === "conflict" && <> <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Reload</button></>}
          {state === "error" && <> <button type="button" onClick={() => void draft.save()} className="font-semibold underline">Try again</button></>}
        </Alert>
      )}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-tile bg-block-mint px-4 py-3 text-sm text-ink">
          {notice}
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X className="size-4" /></button>
        </div>
      )}

      <dialog ref={publishRef} aria-labelledby={publishTitle} className="m-auto w-[min(480px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40">
        <div className="flex flex-col gap-4 p-6">
          <h2 id={publishTitle} className="text-lg font-bold">Publish {label.toLowerCase()}?</h2>
          <p className="text-sm text-ink-muted">
            Everyone visiting <span className="font-semibold text-ink">{publicPath}</span> sees the draft right away. You can restore an earlier version from History.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            What changed? (optional)
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Updated refund rule" className="h-10 rounded-control border border-line px-3 text-sm font-normal focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30" />
          </label>
          {dialogError && <Alert tone="danger">{dialogError}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => publishRef.current?.close()}>Cancel</Button>
            <Button onClick={publish} loading={pending} disabled={pending}>Publish now</Button>
          </div>
        </div>
      </dialog>

      <dialog ref={historyRef} aria-labelledby={historyTitle} className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40">
        <div className="flex max-h-[80dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 id={historyTitle} className="text-lg font-bold">Version history</h2>
            <button type="button" aria-label="Close" onClick={() => historyRef.current?.close()} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink/5"><X className="size-5" /></button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto p-6">
            {dialogError && <Alert tone="danger">{dialogError}</Alert>}
            {versions.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing published yet. Each publish is kept here so you can go back.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {versions.map((v, i) => (
                  <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        Version {v.versionNo}{i === 0 && <span className="ml-2 rounded-full bg-block-mint px-2 py-0.5 text-xs">Live</span>}
                      </p>
                      <p className="text-xs text-ink-muted">{dateTime.format(new Date(v.publishedAt))}{v.publishedBy ? ` · ${v.publishedBy}` : ""}</p>
                      {v.note && <p className="mt-0.5 truncate text-sm text-ink">{v.note}</p>}
                    </div>
                    {canEdit && (
                      <Button size="sm" variant="secondary" disabled={pending} onClick={() => restore(v.id, v.versionNo)}>Restore to draft</Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {canEdit && isLive && (
              <div className="mt-2 rounded-tile bg-canvas p-4">
                <p className="text-sm font-semibold text-ink">Discard unpublished changes</p>
                <p className="mt-1 text-sm text-ink-muted">Resets the draft to what's live now. This can't be undone.</p>
                <Button className="mt-3" size="sm" variant="destructive" disabled={pending} onClick={discard}>Discard changes</Button>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
