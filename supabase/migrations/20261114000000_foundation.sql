-- =====================================================================
-- iBox Academy — Phase 1 foundation
-- Roles, profiles, staff permissions, site settings and audit log.
-- Every table in `public` has RLS enabled and explicit, minimal grants.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Types
-- Add 'instructor' later with: alter type public.app_role add value 'instructor';
-- ---------------------------------------------------------------------
create type public.app_role as enum ('owner', 'staff', 'student');
create type public.account_status as enum ('invited', 'active', 'suspended', 'deactivated');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text check (char_length(full_name) <= 120),
  avatar_url  text check (char_length(avatar_url) <= 2048),
  role        public.app_role not null default 'student',
  status      public.account_status not null default 'active',
  locale      text not null default 'en' check (locale in ('en', 'si', 'ta')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (lower(email));

create table public.permissions (
  key          text primary key,
  group_name   text not null,
  description  text not null,
  is_sensitive boolean not null default false
);

create table public.staff_permissions (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  granted_by     uuid references public.profiles (id) on delete set null,
  granted_at     timestamptz not null default now(),
  primary key (user_id, permission_key)
);
create index staff_permissions_granted_by_idx on public.staff_permissions (granted_by);

-- Brand overrides, contact details, bank transfer details, etc.
-- Never store secrets here (payment secrets stay in server env vars).
create table public.site_settings (
  key         text primary key check (key ~ '^[a-z0-9_.]+$'),
  value       jsonb not null default '{}'::jsonb,
  is_public   boolean not null default false,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create index site_settings_updated_by_idx on public.site_settings (updated_by);

-- Append-only audit trail (no UPDATE/DELETE grants).
create table public.audit_events (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null check (char_length(action) <= 100),
  target_type  text check (char_length(target_type) <= 50),
  target_id    text check (char_length(target_id) <= 100),
  outcome      text not null default 'success' check (outcome in ('success', 'failure', 'denied')),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index audit_events_created_at_idx on public.audit_events (created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id);

-- ---------------------------------------------------------------------
-- Helper functions (private schema = not exposed through the Data API).
-- SECURITY DEFINER is needed so RLS policies on `profiles` can look up
-- the caller's role without recursing; each function only ever reads
-- the caller's own row via auth.uid().
-- ---------------------------------------------------------------------
create or replace function private.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active'
$$;

create or replace function private.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'owner', false)
$$;

create or replace function private.has_permission(p_key text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and (
        p.role = 'owner'
        or (p.role = 'staff' and exists (
          select 1 from public.staff_permissions sp
          where sp.user_id = p.id and sp.permission_key = p_key
        ))
      )
  )
$$;

revoke all on function private.current_app_role() from public;
revoke all on function private.is_owner() from public;
revoke all on function private.has_permission(text) from public;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_owner() to authenticated;
grant execute on function private.has_permission(text) to authenticated;

-- updated_at maintenance
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

-- New sign-ups always become students. Role is never read from metadata.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120),
    left(new.raw_user_meta_data ->> 'avatar_url', 2048)
  );
  return new;
end
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profiles.email in sync when a user changes their email.
create or replace function private.sync_user_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end
$$;
revoke all on function private.sync_user_email() from public;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_user_email();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.permissions       enable row level security;
alter table public.staff_permissions enable row level security;
alter table public.site_settings     enable row level security;
alter table public.audit_events      enable row level security;

-- Start from zero, then grant only what each role needs.
revoke all on public.profiles, public.permissions, public.staff_permissions,
              public.site_settings, public.audit_events
  from anon, authenticated;

-- profiles --------------------------------------------------------------
grant select on public.profiles to authenticated;
-- Users may only edit these columns of their own row. Role and status
-- changes go through trusted server code (service role) with an audit event.
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;

create policy "profiles: users read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: owner reads all"
  on public.profiles for select to authenticated
  using ((select private.is_owner()));

create policy "profiles: staff with students.read read students"
  on public.profiles for select to authenticated
  using (role = 'student' and (select private.has_permission('students.read')));

create policy "profiles: users update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- permissions (reference catalogue) ------------------------------------
grant select on public.permissions to authenticated;

create policy "permissions: signed-in users read"
  on public.permissions for select to authenticated
  using (true);

-- staff_permissions ------------------------------------------------------
-- Writes happen only in trusted server code (Owner permission editor, Phase 4).
grant select on public.staff_permissions to authenticated;

create policy "staff_permissions: read own"
  on public.staff_permissions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "staff_permissions: owner reads all"
  on public.staff_permissions for select to authenticated
  using ((select private.is_owner()));

-- site_settings ----------------------------------------------------------
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

create policy "site_settings: anyone reads public settings"
  on public.site_settings for select to anon, authenticated
  using (is_public);

create policy "site_settings: owner reads all"
  on public.site_settings for select to authenticated
  using ((select private.is_owner()));

create policy "site_settings: owner inserts"
  on public.site_settings for insert to authenticated
  with check ((select private.is_owner()));

create policy "site_settings: owner updates"
  on public.site_settings for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

-- audit_events ------------------------------------------------------------
grant select, insert on public.audit_events to authenticated;

create policy "audit_events: users record their own actions"
  on public.audit_events for insert to authenticated
  with check (actor_id = (select auth.uid()));

create policy "audit_events: owner or audit.read can view"
  on public.audit_events for select to authenticated
  using ((select private.has_permission('audit.read')));

-- ---------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------
insert into public.permissions (key, group_name, description, is_sensitive) values
  ('courses.read',                  'Content',  'View course drafts',          false),
  ('courses.create',                'Content',  'Create course drafts',        false),
  ('courses.edit',                  'Content',  'Edit course drafts',          false),
  ('courses.upload',                'Content',  'Upload course media',         false),
  ('courses.submit_review',         'Content',  'Submit courses for review',   false),
  ('courses.publish',               'Content',  'Publish courses',             true),
  ('students.read',                 'Learners', 'View learner accounts',       false),
  ('students.update_limited',       'Learners', 'Update learner details',      false),
  ('students.suspend',              'Learners', 'Suspend learners',            true),
  ('orders.read',                   'Finance',  'View orders',                 false),
  ('payments.read',                 'Finance',  'View payments',               false),
  ('payments.verify_bank_transfer', 'Finance',  'Verify bank transfers',       true),
  ('refunds.request',               'Finance',  'Prepare refund requests',     false),
  ('refunds.approve',               'Finance',  'Approve refunds',             true),
  ('exports.finance',               'Finance',  'Export finance data',         true),
  ('tickets.read',                  'Support',  'View support tickets',        false),
  ('tickets.reply',                 'Support',  'Reply to tickets',            false),
  ('tickets.assign',                'Support',  'Assign tickets',              false),
  ('tickets.close',                 'Support',  'Close tickets',               false),
  ('cms.read',                      'Website',  'View website content',        false),
  ('cms.edit_draft',                'Website',  'Edit website drafts',         false),
  ('cms.publish',                   'Website',  'Publish website changes',     true),
  ('reports.read',                  'Reports',  'View reports',                false),
  ('audit.read',                    'Security', 'View audit log',              true),
  ('sessions.revoke',               'Security', 'Revoke sessions',             true);

insert into public.site_settings (key, value, is_public) values
  ('brand', '{}'::jsonb, true);

-- ---------------------------------------------------------------------
-- Make yourself the Owner (run once, manually, after you sign up):
--
--   update public.profiles set role = 'owner'
--   where id = (select id from auth.users where email = 'you@example.com');
-- ---------------------------------------------------------------------
