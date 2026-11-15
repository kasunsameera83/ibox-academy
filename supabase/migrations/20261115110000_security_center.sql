-- Security page: activity log, sign-in activity, team security and sessions.
--
-- Who can see it: the Owner (with two-step sign-in) and staff granted
-- 'audit.read'. Only the Owner can sign someone out everywhere.
-- Everything is read through security-definer functions that check that
-- permission first; nobody can read the tables directly.

-- ---------------------------------------------------------------------
-- Sign-in events, written by the server (secret key) on sign-in, failed
-- sign-in, Google sign-in, wrong two-step code, password reset request and
-- sign-out. Kept 90 days. Rows tied to an account go when the account does.
-- ---------------------------------------------------------------------
create table public.signin_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles (id) on delete cascade,
  email       text check (char_length(email) <= 254),
  event       text not null check (event in ('signin', 'signin_failed', 'google_signin', 'mfa_failed', 'password_reset_requested', 'signout')),
  ip          inet,
  user_agent  text check (char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);
create index signin_events_created_idx on public.signin_events (created_at desc);
create index signin_events_user_idx on public.signin_events (user_id, created_at desc);
create index signin_events_email_idx on public.signin_events (lower(email), created_at desc);

alter table public.signin_events enable row level security;
revoke all on public.signin_events from anon, authenticated;
-- No policies: written with the secret key, read through the functions below.

-- ---------------------------------------------------------------------
-- Activity log: audit events with the person's name, newest first.
-- p_groups filters by the part of the action before the dot (e.g. 'staff').
-- Paged with p_before (the last id already shown).
-- ---------------------------------------------------------------------
create or replace function public.security_activity(
  p_groups text[] default null,
  p_actor  uuid default null,
  p_days   integer default 30,
  p_before bigint default null,
  p_limit  integer default 50
)
returns table (
  id bigint, created_at timestamptz, action text, target_type text, target_id text,
  outcome text, metadata jsonb, actor_id uuid, actor_name text, actor_role public.app_role
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('audit.read') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select e.id, e.created_at, e.action, e.target_type, e.target_id, e.outcome, e.metadata, e.actor_id,
           coalesce(nullif(btrim(p.full_name), ''), p.email, 'System'), p.role
    from public.audit_events e
    left join public.profiles p on p.id = e.actor_id
    where (p_groups is null or split_part(e.action, '.', 1) = any (p_groups))
      and (p_actor is null or e.actor_id = p_actor)
      and e.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 3650))
      and (p_before is null or e.id < p_before)
    order by e.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;
revoke all on function public.security_activity(text[], uuid, integer, bigint, integer) from public, anon;
grant execute on function public.security_activity(text[], uuid, integer, bigint, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Sign-in activity, newest first, with the account's name and role.
-- ---------------------------------------------------------------------
create or replace function public.security_signins(
  p_events text[] default null,
  p_days   integer default 7,
  p_before bigint default null,
  p_limit  integer default 50
)
returns table (
  id bigint, created_at timestamptz, event text, email text, ip text, user_agent text,
  user_id uuid, user_name text, user_role public.app_role
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('audit.read') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select s.id, s.created_at, s.event, coalesce(p.email, s.email), host(s.ip), s.user_agent, s.user_id,
           coalesce(nullif(btrim(p.full_name), ''), p.email), p.role
    from public.signin_events s
    left join public.profiles p on p.id = s.user_id
    where (p_events is null or s.event = any (p_events))
      and s.created_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 90))
      and (p_before is null or s.id < p_before)
    order by s.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;
revoke all on function public.security_signins(text[], integer, bigint, integer) from public, anon;
grant execute on function public.security_signins(text[], integer, bigint, integer) to authenticated;

-- Accounts (or typed emails) with several failed sign-ins in the last 24 hours.
create or replace function public.security_failed_signin_summary(p_min integer default 5)
returns table (email text, user_id uuid, user_name text, failures bigint, last_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('audit.read') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select lower(coalesce(p.email, s.email)), max(s.user_id::text)::uuid,
           max(coalesce(nullif(btrim(p.full_name), ''), p.email)), count(*), max(s.created_at)
    from public.signin_events s
    left join public.profiles p on p.id = s.user_id
    where s.event in ('signin_failed', 'mfa_failed') and s.created_at >= now() - interval '24 hours'
    group by lower(coalesce(p.email, s.email))
    having count(*) >= greatest(coalesce(p_min, 5), 1)
    order by count(*) desc
    limit 20;
end;
$$;
revoke all on function public.security_failed_signin_summary(integer) from public, anon;
grant execute on function public.security_failed_signin_summary(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Team security: the Owner and staff, with two-step status, last sign-in
-- and how many places they're signed in.
-- ---------------------------------------------------------------------
create or replace function public.security_team()
returns table (
  id uuid, name text, email text, role public.app_role, status public.account_status,
  mfa_enabled boolean, last_sign_in_at timestamptz, active_sessions integer
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('audit.read') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, coalesce(nullif(btrim(p.full_name), ''), p.email), p.email, p.role, p.status,
           exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status::text = 'verified'),
           u.last_sign_in_at,
           (select count(*)::integer from auth.sessions s where s.user_id = p.id and (s.not_after is null or s.not_after > now()))
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.role in ('owner', 'staff')
    order by p.role, 2;
end;
$$;
revoke all on function public.security_team() from public, anon;
grant execute on function public.security_team() to authenticated;

-- Where one team member is signed in.
create or replace function public.security_sessions(p_user uuid)
returns table (id uuid, created_at timestamptz, last_active_at timestamptz, user_agent text, ip text, two_step boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_permission('audit.read') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user and p.role in ('owner', 'staff')) then
    raise exception 'Team member not found' using errcode = '22023';
  end if;
  return query
    select s.id, s.created_at,
           coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at),
           left(s.user_agent, 300), host(s.ip), s.aal::text = 'aal2'
    from auth.sessions s
    where s.user_id = p_user and (s.not_after is null or s.not_after > now())
    order by 3 desc nulls last
    limit 50;
end;
$$;
revoke all on function public.security_sessions(uuid) from public, anon;
grant execute on function public.security_sessions(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Owner only: sign a team member out everywhere (lost phone, someone
-- leaving). Removes their sessions so they can't refresh; a page they
-- already have open stops working within the hour, when its access expires.
-- ---------------------------------------------------------------------
create or replace function public.security_revoke_sessions(p_user uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
  v_email text;
begin
  if not private.is_owner() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select p.email into v_email from public.profiles p where p.id = p_user and p.role in ('owner', 'staff');
  if not found then
    raise exception 'Team member not found' using errcode = '22023';
  end if;
  delete from auth.sessions s where s.user_id = p_user;
  get diagnostics v_count = row_count;
  perform private.audit('security.sessions_revoked', 'profile', p_user::text, jsonb_build_object('sessions', v_count, 'self', p_user = (select auth.uid())));
  return v_count;
end;
$$;
revoke all on function public.security_revoke_sessions(uuid) from public, anon;
grant execute on function public.security_revoke_sessions(uuid) to authenticated;
