-- =====================================================================
-- iBox Academy — require two-step verification (aal2) for Owner powers.
-- The app already redirects; this makes the database refuse Owner-level
-- access from a session that hasn't completed two-step verification.
-- =====================================================================

create or replace function private.session_is_aal2()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
$$;
revoke all on function private.session_is_aal2() from public;
grant execute on function private.session_is_aal2() to authenticated;

create or replace function private.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'owner', false) and private.session_is_aal2()
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
        (p.role = 'owner' and private.session_is_aal2())
        or (p.role = 'staff' and exists (
          select 1 from public.staff_permissions sp
          where sp.user_id = p.id and sp.permission_key = p_key
        ))
      )
  )
$$;
