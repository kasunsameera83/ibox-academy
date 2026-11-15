-- =====================================================================
-- iBox Academy — wishlist and support tickets.
--   * Learners save courses to a wishlist (only their own rows).
--   * Learners open support tickets and reply; the team works a queue
--     with status, priority, assignment and private internal notes.
--   * Learners never see internal notes, and every change goes through
--     functions that check tickets.* permissions.
-- Run after 20261114150000_cms.sql.
-- =====================================================================

alter type public.notification_kind add value if not exists 'support_new';
alter type public.notification_kind add value if not exists 'support_reply';

-- ---------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------
create table public.wishlist_items (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (student_id, course_id)
);
create index wishlist_items_course_idx on public.wishlist_items (course_id);

alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_items from anon, authenticated;
grant select, insert, delete on public.wishlist_items to authenticated;

create policy "wishlist: read own" on public.wishlist_items for select to authenticated
  using ((select auth.uid()) = student_id);
-- Counted in a helper: a policy that queries its own table would loop.
create or replace function private.wishlist_count(p_student uuid)
returns bigint
language sql stable security definer set search_path = ''
as $$ select count(*) from public.wishlist_items where student_id = p_student $$;
revoke all on function private.wishlist_count(uuid) from public;
grant execute on function private.wishlist_count(uuid) to authenticated;  -- used by the policy below; the private schema isn't exposed through the API

create policy "wishlist: add published courses" on public.wishlist_items for insert to authenticated
  with check (
    (select auth.uid()) = student_id
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    and private.wishlist_count((select auth.uid())) < 200
  );
create policy "wishlist: remove own" on public.wishlist_items for delete to authenticated
  using ((select auth.uid()) = student_id);

-- ---------------------------------------------------------------------
-- Support tickets
-- ---------------------------------------------------------------------
create type public.ticket_status as enum ('new', 'open', 'waiting_learner', 'waiting_internal', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.ticket_category as enum ('payment', 'access', 'technical', 'certificate', 'refund', 'other');

create table public.support_tickets (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  requester_id      uuid not null references public.profiles (id) on delete cascade,
  -- Snapshot so the support team sees who asked without needing learner-profile access.
  requester_name    text not null,
  requester_email   text not null,
  category          public.ticket_category not null,
  subject           text not null check (char_length(subject) between 3 and 120),
  status            public.ticket_status not null default 'new',
  priority          public.ticket_priority not null default 'normal',
  assigned_to       uuid references public.profiles (id) on delete set null,
  order_id          uuid references public.orders (id) on delete set null,
  course_id         uuid references public.courses (id) on delete set null,
  created_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now(),
  resolved_at       timestamptz
);
create index support_tickets_queue_idx on public.support_tickets (status, last_activity_at desc);
create index support_tickets_requester_idx on public.support_tickets (requester_id, created_at desc);
create index support_tickets_assignee_idx on public.support_tickets (assigned_to) where assigned_to is not null;

create table public.ticket_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets (id) on delete cascade,
  author_id    uuid references public.profiles (id) on delete set null,
  -- Snapshot so learners see a name without reading team profiles.
  author_name  text not null,
  from_team    boolean not null,
  is_internal  boolean not null default false,
  body         text not null check (char_length(body) between 1 and 5000),
  created_at   timestamptz not null default now(),
  constraint ticket_messages_internal_is_team check (not is_internal or from_team)
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
revoke all on public.support_tickets, public.ticket_messages from anon, authenticated;
grant select on public.support_tickets, public.ticket_messages to authenticated;

create policy "tickets: requester or support team reads" on public.support_tickets for select to authenticated
  using ((select auth.uid()) = requester_id or (select private.has_permission('tickets.read')));

-- Learners see their own ticket's public messages only; internal notes are team-only.
create policy "ticket messages: requester reads public, team reads all" on public.ticket_messages for select to authenticated
  using (
    (select private.has_permission('tickets.read'))
    or (not is_internal and exists (
      select 1 from public.support_tickets t where t.id = ticket_id and t.requester_id = (select auth.uid())
    ))
  );

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function private.display_name(p_id uuid, p_team boolean)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when p_team then coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'Support') || ' (iBox team)'
    else coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1))
  end
  from public.profiles p where p.id = p_id
$$;
revoke all on function private.display_name(uuid, boolean) from public;

-- Tell whoever is handling the ticket, or the support team if nobody is.
create or replace function private.notify_ticket_team(t public.support_tickets, p_title text, p_body text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if t.assigned_to is not null and exists (select 1 from public.profiles where id = t.assigned_to and status = 'active') then
    insert into public.notifications (recipient_id, kind, title, body, link)
    values (t.assigned_to, 'support_new', left(p_title, 160), left(p_body, 500), '/app/owner/support/' || t.id);
  else
    perform private.notify_team('support_new', p_title, p_body, '/app/owner/support/' || t.id, 'tickets.read');
  end if;
end
$$;
revoke all on function private.notify_ticket_team(public.support_tickets, text, text) from public;

-- ---------------------------------------------------------------------
-- Learner: open a ticket
-- ---------------------------------------------------------------------
create or replace function public.create_support_ticket(
  p_category public.ticket_category, p_subject text, p_body text, p_order_id uuid default null, p_course_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_ref text;
  t public.support_tickets;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and status = 'active') then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if char_length(v_subject) < 3 or char_length(v_subject) > 120 then raise exception 'Add a short subject' using errcode = '22023'; end if;
  if char_length(v_body) < 10 or char_length(v_body) > 5000 then raise exception 'Describe the problem in a few words' using errcode = '22023'; end if;
  if p_order_id is not null and not exists (select 1 from public.orders where id = p_order_id and student_id = v_uid) then
    raise exception 'That order isn''t yours' using errcode = '22023';
  end if;
  if p_course_id is not null and not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found' using errcode = '22023';
  end if;

  -- Abuse limits: 5 new tickets a day, 10 unresolved at once.
  if (select count(*) from public.support_tickets where requester_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve opened several tickets today. Please reply on an existing one, or try again tomorrow.' using errcode = '54000';
  end if;
  if (select count(*) from public.support_tickets where requester_id = v_uid and status not in ('resolved', 'closed')) >= 10 then
    raise exception 'You have many open tickets. Please reply on one of those.' using errcode = '54000';
  end if;

  v_ref := 'SUP-' || to_char(now() at time zone 'Asia/Colombo', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
  insert into public.support_tickets (reference, requester_id, requester_name, requester_email, category, subject, order_id, course_id)
  values (v_ref, v_uid, private.display_name(v_uid, false), (select email from public.profiles where id = v_uid),
          p_category, v_subject, p_order_id, p_course_id)
  returning * into t;

  insert into public.ticket_messages (ticket_id, author_id, author_name, from_team, body)
  values (t.id, v_uid, private.display_name(v_uid, false), false, v_body);

  perform private.notify_ticket_team(t, 'New support ticket: ' || left(v_subject, 80),
    private.display_name(v_uid, false) || ' · ' || t.reference);
  return jsonb_build_object('id', t.id, 'reference', t.reference);
end
$$;
revoke all on function public.create_support_ticket(public.ticket_category, text, text, uuid, uuid) from public, anon;
grant execute on function public.create_support_ticket(public.ticket_category, text, text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Reply (learner on their own ticket, or the team). Internal notes are
-- team-only and never change the status.
-- ---------------------------------------------------------------------
create or replace function public.reply_to_ticket(p_ticket_id uuid, p_body text, p_internal boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  t public.support_tickets;
  v_learner boolean;
begin
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'Write a message' using errcode = '22023'; end if;
  select * into t from public.support_tickets where id = p_ticket_id for update;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;

  v_learner := t.requester_id = v_uid;
  if v_learner then
    if not exists (select 1 from public.profiles where id = v_uid and status = 'active') then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    if coalesce(p_internal, false) then raise exception 'Not allowed' using errcode = '42501'; end if;
    if t.status = 'closed' then raise exception 'This ticket is closed. Please open a new one.' using errcode = '22023'; end if;
    -- Rate limit learner replies: 30 an hour.
    if (select count(*) from public.ticket_messages m
        where m.author_id = v_uid and m.created_at > now() - interval '1 hour') >= 30 then
      raise exception 'Too many messages. Please wait a little.' using errcode = '54000';
    end if;

    insert into public.ticket_messages (ticket_id, author_id, author_name, from_team, body)
    values (t.id, v_uid, private.display_name(v_uid, false), false, v_body);
    update public.support_tickets
      set status = case when status = 'new' then 'new'::public.ticket_status else 'open'::public.ticket_status end,
          resolved_at = null, last_activity_at = now()
      where id = t.id;
    perform private.notify_ticket_team(t, 'Learner replied: ' || left(t.subject, 80), t.reference);
    return;
  end if;

  if not private.has_permission('tickets.reply') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if t.status = 'closed' and not coalesce(p_internal, false) then
    raise exception 'This ticket is closed. Reopen it to reply.' using errcode = '22023';
  end if;

  insert into public.ticket_messages (ticket_id, author_id, author_name, from_team, is_internal, body)
  values (t.id, v_uid, private.display_name(v_uid, true), true, coalesce(p_internal, false), v_body);

  if coalesce(p_internal, false) then
    update public.support_tickets set last_activity_at = now() where id = t.id;
  else
    update public.support_tickets
      set status = case when status in ('resolved', 'closed') then status else 'waiting_learner'::public.ticket_status end,
          assigned_to = coalesce(assigned_to, v_uid),
          last_activity_at = now()
      where id = t.id;
    insert into public.notifications (recipient_id, kind, title, body, link)
    values (t.requester_id, 'support_reply', 'New reply on your support ticket', left(t.subject, 160), '/app/student/help/' || t.id);
  end if;
end
$$;
revoke all on function public.reply_to_ticket(uuid, text, boolean) from public, anon;
grant execute on function public.reply_to_ticket(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Team: status, priority, assignment
-- ---------------------------------------------------------------------
create or replace function public.update_ticket(
  p_ticket_id uuid, p_status public.ticket_status default null, p_priority public.ticket_priority default null,
  p_assigned_to uuid default null, p_unassign boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.support_tickets;
  v_changes jsonb := '{}'::jsonb;
begin
  select * into t from public.support_tickets where id = p_ticket_id for update;
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;

  if p_status is not null and p_status <> t.status then
    if p_status in ('resolved', 'closed') then
      if not private.has_permission('tickets.close') then raise exception 'Not allowed' using errcode = '42501'; end if;
    elsif not private.has_permission('tickets.reply') then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    update public.support_tickets
      set status = p_status,
          resolved_at = case when p_status in ('resolved', 'closed') then now() else null end,
          last_activity_at = now()
      where id = t.id;
    v_changes := v_changes || jsonb_build_object('status', p_status);
    if p_status = 'resolved' then
      insert into public.notifications (recipient_id, kind, title, body, link)
      values (t.requester_id, 'support_reply', 'Your support ticket was marked solved', left(t.subject, 160), '/app/student/help/' || t.id);
    end if;
  end if;

  if (p_priority is not null and p_priority <> t.priority) or p_assigned_to is not null or p_unassign then
    if not private.has_permission('tickets.assign') then raise exception 'Not allowed' using errcode = '42501'; end if;
    if p_assigned_to is not null and not exists (
      select 1 from public.profiles p
      where p.id = p_assigned_to and p.status = 'active'
        and (p.role = 'owner' or (p.role = 'staff' and exists (
          select 1 from public.staff_permissions sp where sp.user_id = p.id and sp.permission_key = 'tickets.read')))
    ) then
      raise exception 'That person can''t see support tickets' using errcode = '22023';
    end if;
    update public.support_tickets
      set priority = coalesce(p_priority, priority),
          assigned_to = case when p_unassign then null else coalesce(p_assigned_to, assigned_to) end
      where id = t.id;
    if p_priority is not null then v_changes := v_changes || jsonb_build_object('priority', p_priority); end if;
    if p_assigned_to is not null or p_unassign then v_changes := v_changes || jsonb_build_object('assigned_to', p_assigned_to); end if;
    if p_assigned_to is not null and p_assigned_to <> (select auth.uid()) then
      insert into public.notifications (recipient_id, kind, title, body, link)
      values (p_assigned_to, 'support_new', 'Ticket assigned to you', left(t.subject, 160), '/app/owner/support/' || t.id);
    end if;
  end if;

  if v_changes <> '{}'::jsonb then
    perform private.audit('ticket.update', 'support_ticket', t.reference, v_changes);
  end if;
end
$$;
revoke all on function public.update_ticket(uuid, public.ticket_status, public.ticket_priority, uuid, boolean) from public, anon;
grant execute on function public.update_ticket(uuid, public.ticket_status, public.ticket_priority, uuid, boolean) to authenticated;

-- Learner marks their own ticket solved.
create or replace function public.resolve_my_ticket(p_ticket_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.support_tickets set status = 'resolved', resolved_at = now(), last_activity_at = now()
    where id = p_ticket_id and requester_id = (select auth.uid()) and status not in ('resolved', 'closed');
  if not found then raise exception 'Ticket not found' using errcode = 'P0002'; end if;
end
$$;
revoke all on function public.resolve_my_ticket(uuid) from public, anon;
grant execute on function public.resolve_my_ticket(uuid) to authenticated;

-- People a ticket can be assigned to (Owner, and staff who can see tickets).
create or replace function public.support_agents()
returns table (id uuid, name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, coalesce(nullif(btrim(p.full_name), ''), p.email)
  from public.profiles p
  where private.has_permission('tickets.read')
    and p.status = 'active'
    and (p.role = 'owner' or (p.role = 'staff' and exists (
      select 1 from public.staff_permissions sp where sp.user_id = p.id and sp.permission_key = 'tickets.read')))
  order by p.role, 2
$$;
revoke all on function public.support_agents() from public, anon;
grant execute on function public.support_agents() to authenticated;
