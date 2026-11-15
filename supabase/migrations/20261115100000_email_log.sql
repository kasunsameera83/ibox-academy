-- Record of app emails already sent, so retries (PayHere re-notifying, a double
-- click) never send the same email twice. Written only by the server with the
-- secret key; nobody else can read or write it.
create table public.email_log (
  kind          text not null check (char_length(kind) between 1 and 40),
  ref           text not null check (char_length(ref) between 1 and 200),
  recipient_id  uuid references public.profiles (id) on delete cascade,
  sent_at       timestamptz not null default now(),
  primary key (kind, ref)
);
create index email_log_recipient_idx on public.email_log (recipient_id);

alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
-- No policies: only the service role (which bypasses RLS) uses this table.
