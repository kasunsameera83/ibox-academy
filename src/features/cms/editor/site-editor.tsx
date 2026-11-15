"use client";

import { useState, type ReactNode } from "react";
import { siteSettingsSchema, TONES, type SiteSettings } from "@/lib/cms/schema";
import type { PageVersion } from "@/lib/dal/cms";
import { cn } from "@/lib/utils";
import { DraftToolbar, stable, useDraft } from "./draft-controls";
import { AreaField, Repeater, SelectField, TextField, Toggle } from "./fields";
import { DEVICES, Preview, type Device } from "./website-editor";

type Link = { label: string; href: string };

const AREA_LABELS: Record<string, string> = {
  tagline: "Wording", description: "Wording", announcement: "Announcement bar", headerLinks: "Header menu",
  footer: "Footer", contact: "Contact details", social: "Social links",
};

function LinkList({ label, items, onChange, max, disabled }: { label: string; items: Link[]; onChange: (v: Link[]) => void; max: number; disabled: boolean }) {
  return (
    <Repeater
      label={label}
      items={items}
      max={max}
      disabled={disabled}
      itemLabel={(l, i) => l.label || `Link ${i + 1}`}
      create={() => ({ label: "", href: "/" })}
      onChange={onChange}
      render={(l, up) => (
        <>
          <TextField label="Text" value={l.label} max={30} required disabled={disabled} onChange={(v) => up({ ...l, label: v })} />
          <TextField label="Goes to" value={l.href} max={300} required disabled={disabled} placeholder="/courses" onChange={(v) => up({ ...l, href: v })} />
        </>
      )}
    />
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div>
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Header menu, announcement bar, footer, contact details, social links and site wording. */
export function SiteEditor({
  site, canEdit, canPublish, publicHost,
}: {
  site: {
    draft: SiteSettings; published: SiteSettings | null; draftUpdatedAt: string | null;
    publishedAt: string | null; publishedBy: string | null; versions: PageVersion[];
  };
  canEdit: boolean;
  canPublish: boolean;
  publicHost: string;
}) {
  const draft = useDraft<SiteSettings>({
    slug: "site",
    initial: site.draft,
    savedAt: site.draftUpdatedAt,
    canEdit,
    prepare: (v) => v,
    check: (v) => {
      const parsed = siteSettingsSchema.safeParse(v);
      if (parsed.success) return null;
      const issue = parsed.error.issues[0];
      return `${AREA_LABELS[String(issue?.path[0])] ?? "Settings"}: ${issue?.message ?? "check the fields"}.`;
    },
  });
  const v = draft.value;
  const set = draft.setValue;
  const off = !canEdit;
  const [device, setDevice] = useState<Device>("desktop");
  const differsFromLive = site.published ? stable(v) !== stable(site.published) : true;

  return (
    <div className="flex flex-col gap-4">
      <DraftToolbar
        slug="site"
        label="Menus & footer"
        publicPath={`every page of ${publicHost}`}
        previewHref="/cms-preview/site"
        draft={draft}
        differsFromLive={differsFromLive}
        publishedAt={site.publishedAt}
        publishedBy={site.publishedBy}
        versions={site.versions}
        canEdit={canEdit}
        canPublish={canPublish}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Group title="Announcement bar" description="A thin strip above the header on every public page, for launches or offers.">
            <Toggle label="Show the bar" checked={v.announcement.enabled} disabled={off} onChange={(e) => set({ ...v, announcement: { ...v.announcement, enabled: e } })} />
            {v.announcement.enabled && (
              <>
                <TextField label="Message" value={v.announcement.text} max={120} required disabled={off} onChange={(t) => set({ ...v, announcement: { ...v.announcement, text: t } })} />
                <SelectField
                  label="Colour"
                  value={v.announcement.tone}
                  disabled={off}
                  options={TONES.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
                  onChange={(t) => set({ ...v, announcement: { ...v.announcement, tone: t } })}
                />
                <Toggle
                  label="Add a link"
                  checked={v.announcement.link !== null}
                  disabled={off}
                  onChange={(on) => set({ ...v, announcement: { ...v.announcement, link: on ? { label: "See courses", href: "/courses" } : null } })}
                />
                {v.announcement.link && (
                  <>
                    <TextField label="Link text" value={v.announcement.link.label} max={30} required disabled={off} onChange={(t) => set({ ...v, announcement: { ...v.announcement, link: { ...v.announcement.link!, label: t } } })} />
                    <TextField label="Goes to" value={v.announcement.link.href} max={300} required disabled={off} onChange={(t) => set({ ...v, announcement: { ...v.announcement, link: { ...v.announcement.link!, href: t } } })} />
                  </>
                )}
              </>
            )}
          </Group>

          <Group title="Header menu" description="Links beside the logo. On phones they open from the menu button.">
            <LinkList label="Links" items={v.headerLinks} max={6} disabled={off} onChange={(l) => set({ ...v, headerLinks: l })} />
          </Group>

          <Group title="Footer columns" description="Up to four columns of links.">
            <Repeater
              label="Columns"
              items={v.footer.columns}
              max={4}
              disabled={off}
              itemLabel={(c, i) => c.title || `Column ${i + 1}`}
              create={() => ({ title: "", links: [{ label: "", href: "/" }] })}
              onChange={(columns) => set({ ...v, footer: { columns } })}
              render={(c, up) => (
                <>
                  <TextField label="Column title" value={c.title} max={30} required disabled={off} onChange={(t) => up({ ...c, title: t })} />
                  <LinkList label="Links" items={c.links} max={6} disabled={off} onChange={(links) => up({ ...c, links })} />
                </>
              )}
            />
          </Group>

          <Group title="Contact details" description="Shown in the footer and in Contact sections. Leave a field empty to hide it.">
            <TextField label="Email" value={v.contact.email} max={120} disabled={off} placeholder="hello@iboxacademy.com" onChange={(t) => set({ ...v, contact: { ...v.contact, email: t } })} />
            <TextField label="WhatsApp number" value={v.contact.whatsapp} max={20} disabled={off} placeholder="+94771234567" hint="With country code. Opens a WhatsApp chat." onChange={(t) => set({ ...v, contact: { ...v.contact, whatsapp: t } })} />
            <TextField label="Phone" value={v.contact.phone} max={30} disabled={off} placeholder="+94 11 234 5678" onChange={(t) => set({ ...v, contact: { ...v.contact, phone: t } })} />
            <AreaField label="Address" value={v.contact.address} max={200} rows={2} disabled={off} onChange={(t) => set({ ...v, contact: { ...v.contact, address: t } })} />
            <TextField label="Opening hours" value={v.contact.hours} max={120} disabled={off} placeholder="Mon–Fri, 9am–5pm" onChange={(t) => set({ ...v, contact: { ...v.contact, hours: t } })} />
          </Group>

          <Group title="Social links" description="Full https:// links. Empty ones are hidden.">
            {(["facebook", "instagram", "youtube", "tiktok", "linkedin"] as const).map((k) => (
              <TextField
                key={k}
                label={{ facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn" }[k]}
                value={v.social[k]}
                max={200}
                disabled={off}
                placeholder="https://"
                onChange={(t) => set({ ...v, social: { ...v.social, [k]: t } })}
              />
            ))}
          </Group>

          <Group title="Site wording" description="Used in search results, the footer and the sign-in page.">
            <TextField label="Tagline" value={v.tagline} max={80} required disabled={off} onChange={(t) => set({ ...v, tagline: t })} />
            <AreaField label="Short description" value={v.description} max={200} disabled={off} onChange={(t) => set({ ...v, description: t })} />
            <p className="text-xs text-ink-muted">The name, logo, colours and fonts are set in the brand file (src/brand), so they change everywhere at once.</p>
          </Group>
        </div>

        <section aria-label="Preview" className="flex min-h-[70dvh] flex-col overflow-hidden rounded-card border border-line xl:sticky xl:top-4 xl:h-[calc(100dvh-2rem)]">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
            <p className="text-sm font-semibold text-ink">Preview with the homepage</p>
            <div role="group" aria-label="Preview size" className="flex items-center rounded-full border border-line p-0.5">
              {(Object.keys(DEVICES) as Device[]).map((d) => (
                <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={cn("h-7 rounded-full px-3 text-xs font-semibold", device === d ? "bg-ink text-white" : "text-ink")}>
                  {DEVICES[d].label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <Preview slug="site" device={device} reloadKey={draft.reloadKey} />
          </div>
        </section>
      </div>
    </div>
  );
}
