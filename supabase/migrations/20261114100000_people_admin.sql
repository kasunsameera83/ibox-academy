-- =====================================================================
-- iBox Academy — Students and Staff & roles (Owner operations).
--   * Staff must use two-step verification too.
--   * Suspended or deactivated accounts lose course access.
--   * Owner functions: account status, manual access, staff and permissions.
--   Every change writes an audit event.
-- Run after 20261114090000_certificate_design.sql.
-- =====================================================================

-- Staff powers also need a two-step verified session (aal2).
create or replace function private.has_permission(p_key text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and private.session_is_aal2()
      and (
        p.role = 'owner'
        or (p.role = 'staff' and exists (
          select 1 from public.staff_permissions sp
          where sp.user_id = p.id and sp.permission_key = p_key
        ))
      )
  )
$$;

-- Only active accounts can use their enrolments.
create or replace function private.is_enrolled(p_course_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrolments e join public.profiles p on p.id = e.student_id
    where e.student_id = (select auth.uid())
      and e.course_id = p_course_id
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and p.status = 'active'
  );
$$;

-- Owner reads staff permission history; staff list shows who granted what.
create index if not exists enrolments_student_idx on public.enrolments (student_id);

-- ---------------------------------------------------------------------
-- Internal audit helper (actor = caller).
-- ---------------------------------------------------------------------
create or replace function private.audit(p_action text, p_target_type text, p_target_id text, p_metadata jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke all on function private.audit(text, text, text, jsonb) from public;

-- ---------------------------------------------------------------------
-- Account status: suspend, deactivate or reactivate a learner or staff member.
-- The Owner can change anyone but themselves and other owners. Staff with
-- students.suspend can change learners only.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_account_status(p_user uuid, p_status public.account_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.profiles;
begin
  select * into t from public.profiles where id = p_user for update;
  if not found then raise exception 'Account not found' using errcode = '22023'; end if;
  if p_user = (select auth.uid()) then raise exception 'You can''t change your own account status' using errcode = '22023'; end if;
  if t.role = 'owner' then raise exception 'Owner accounts can''t be changed here' using errcode = '22023'; end if;
  if p_status not in ('active', 'suspended', 'deactivated') then raise exception 'Invalid status' using errcode = '22023'; end if;
  if not (private.is_owner() or (t.role = 'student' and private.has_permission('students.suspend'))) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  update public.profiles set status = p_status where id = p_user;
  perform private.audit('account.status', 'profile', p_user::text,
    jsonb_build_object('from', t.status, 'to', p_status, 'reason', left(p_reason, 500)));
end
$$;
revoke all on function public.admin_set_account_status(uuid, public.account_status, text) from public;
grant execute on function public.admin_set_account_status(uuid, public.account_status, text) to authenticated;

-- ---------------------------------------------------------------------
-- Manual access: give a course without an order (gifts, refunds handled
-- elsewhere, corrections). p_expires_at null = lifetime.
-- ---------------------------------------------------------------------
create or replace function public.admin_grant_enrolment(p_student uuid, p_course uuid, p_expires_at timestamptz default null, p_note text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_owner() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_student) then
    raise exception 'Account not found' using errcode = '22023';
  end if;
  if not exists (select 1 from public.courses where id = p_course) then
    raise exception 'Course not found' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Choose an end date in the future' using errcode = '22023';
  end if;

  insert into public.enrolments (student_id, course_id, status, starts_at, expires_at)
  values (p_student, p_course, 'active', now(), p_expires_at)
  on conflict (student_id, course_id) do update
    set status = 'active', expires_at = excluded.expires_at
  returning id into v_id;

  perform private.audit('enrolment.grant', 'enrolment', v_id::text,
    jsonb_build_object('student', p_student, 'course', p_course, 'expires_at', p_expires_at, 'note', left(p_note, 500)));
  return v_id;
end
$$;
revoke all on function public.admin_grant_enrolment(uuid, uuid, timestamptz, text) from public;
grant execute on function public.admin_grant_enrolment(uuid, uuid, timestamptz, text) to authenticated;

-- Revoke, restore or change the end date of an enrolment.
create or replace function public.admin_update_enrolment(p_enrolment uuid, p_status public.enrolment_status, p_expires_at timestamptz default null, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e public.enrolments;
begin
  if not private.is_owner() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into e from public.enrolments where id = p_enrolment for update;
  if not found then raise exception 'Enrolment not found' using errcode = '22023'; end if;
  if p_status = 'active' and p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Choose an end date in the future' using errcode = '22023';
  end if;

  update public.enrolments
    set status = p_status,
        expires_at = case when p_status = 'active' then p_expires_at else expires_at end
    where id = e.id;

  perform private.audit('enrolment.update', 'enrolment', e.id::text,
    jsonb_build_object('from', e.status, 'to', p_status, 'expires_at', p_expires_at, 'note', left(p_note, 500)));
end
$$;
revoke all on function public.admin_update_enrolment(uuid, public.enrolment_status, timestamptz, text) from public;
grant execute on function public.admin_update_enrolment(uuid, public.enrolment_status, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------

-- Make an account staff (new invite or an existing learner) and set permissions.
create or replace function public.admin_set_staff(p_user uuid, p_permissions text[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.profiles;
  v_keys text[] := coalesce(p_permissions, '{}');
  v_unknown text;
  v_before text[];
begin
  if not private.is_owner() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into t from public.profiles where id = p_user for update;
  if not found then raise exception 'Account not found' using errcode = '22023'; end if;
  if t.role = 'owner' then raise exception 'Owner accounts already have every permission' using errcode = '22023'; end if;

  select k into v_unknown from unnest(v_keys) k where not exists (select 1 from public.permissions p where p.key = k) limit 1;
  if v_unknown is not null then raise exception 'Unknown permission: %', v_unknown using errcode = '22023'; end if;

  select coalesce(array_agg(permission_key order by permission_key), '{}') into v_before
    from public.staff_permissions where user_id = p_user;

  if t.role <> 'staff' then
    update public.profiles set role = 'staff' where id = p_user;
  end if;

  delete from public.staff_permissions where user_id = p_user and permission_key <> all (v_keys);
  insert into public.staff_permissions (user_id, permission_key, granted_by)
    select p_user, k, (select auth.uid()) from unnest(v_keys) k
    on conflict (user_id, permission_key) do nothing;

  perform private.audit(case when t.role = 'staff' then 'staff.permissions' else 'staff.add' end, 'profile', p_user::text,
    jsonb_build_object('before', v_before, 'after', v_keys));
end
$$;
revoke all on function public.admin_set_staff(uuid, text[]) from public;
grant execute on function public.admin_set_staff(uuid, text[]) to authenticated;

-- Take away staff access. The account stays, as a learner, with its enrolments.
create or replace function public.admin_remove_staff(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.profiles;
begin
  if not private.is_owner() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into t from public.profiles where id = p_user for update;
  if not found or t.role <> 'staff' then raise exception 'This account isn''t staff' using errcode = '22023'; end if;

  delete from public.staff_permissions where user_id = p_user;
  update public.profiles set role = 'student' where id = p_user;
  perform private.audit('staff.remove', 'profile', p_user::text, '{}'::jsonb);
end
$$;
revoke all on function public.admin_remove_staff(uuid) from public;
grant execute on function public.admin_remove_staff(uuid) to authenticated;
