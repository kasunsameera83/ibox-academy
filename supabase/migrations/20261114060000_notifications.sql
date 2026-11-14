-- =====================================================================
-- iBox Academy — live notifications for the Owner (and permitted staff).
-- Database triggers create notifications; the dashboard receives them
-- instantly through Supabase Realtime (which respects RLS).
-- Run after 20261114050000_orders_enrolments.sql.
-- =====================================================================

create type public.notification_kind as enum
  ('signup', 'payment_received', 'free_enrolment', 'slip_uploaded', 'payment_review', 'payment_failed', 'chargeback');

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  kind          public.notification_kind not null,
  title         text not null check (char_length(title) <= 160),
  body          text check (char_length(body) <= 500),
  link          text check (link is null or link like '/%'),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: read own" on public.notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);
create policy "notifications: mark own as read" on public.notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Realtime: deliver new rows to the recipient's open dashboard.
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------
-- Fan-out helper: every active Owner, plus staff holding p_permission.
-- ---------------------------------------------------------------------
create or replace function private.notify_team(
  p_kind public.notification_kind, p_title text, p_body text, p_link text, p_permission text
)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (recipient_id, kind, title, body, link)
  select p.id, p_kind, left(p_title, 160), left(p_body, 500), p_link
  from public.profiles p
  where p.status = 'active'
    and (
      p.role = 'owner'
      or (p.role = 'staff' and p_permission is not null and exists (
        select 1 from public.staff_permissions sp where sp.user_id = p.id and sp.permission_key = p_permission
      ))
    );
$$;
revoke all on function private.notify_team(public.notification_kind, text, text, text, text) from public;

-- New sign-up
create or replace function private.on_profile_created_notify()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'student' then
    perform private.notify_team(
      'signup',
      'New learner signed up',
      coalesce(nullif(new.full_name, ''), 'A new learner') || coalesce(' (' || new.email || ')', ''),
      null,
      'students.read'
    );
  end if;
  return new;
end
$$;
revoke all on function private.on_profile_created_notify() from public;
create trigger profiles_notify_signup after insert on public.profiles
  for each row execute function private.on_profile_created_notify();

-- Order changes
create or replace function private.on_order_changed_notify()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_who text;
  v_amount text := 'LKR ' || to_char(new.amount_lkr, 'FM999,999,990');
begin
  if new.status is not distinct from old.status and new.slip_path is not distinct from old.slip_path then
    return new;
  end if;
  select coalesce(nullif(p.full_name, ''), p.email, 'A learner') into v_who from public.profiles p where p.id = new.student_id;

  if new.status = 'paid' and old.status <> 'paid' then
    if new.method = 'free' then
      perform private.notify_team('free_enrolment', 'Free enrolment', v_who || ' enrolled in “' || new.course_title || '”.', '/app/owner/orders', 'orders.read');
    else
      perform private.notify_team('payment_received', 'Payment received: ' || v_amount,
        v_who || ' bought “' || new.course_title || '” (' || case new.method when 'payhere' then 'card' else 'bank transfer' end || ').',
        '/app/owner/orders?status=paid', 'orders.read');
    end if;
  elsif new.status = 'under_review' and old.status <> 'under_review' then
    if new.method = 'bank_transfer' then
      perform private.notify_team('slip_uploaded', 'Bank slip to check: ' || v_amount,
        v_who || ' uploaded a slip for “' || new.course_title || '” (' || new.reference || ').',
        '/app/owner/payments', 'payments.verify_bank_transfer');
    else
      perform private.notify_team('payment_review', 'Payment needs checking',
        'PayHere reported a different amount for ' || new.reference || '. The course is not unlocked.',
        '/app/owner/payments', 'payments.read');
    end if;
  elsif new.status = 'failed' and old.status <> 'failed' and new.method = 'payhere' then
    perform private.notify_team('payment_failed', 'Card payment failed',
      v_who || '''s payment for “' || new.course_title || '” didn''t go through.', '/app/owner/orders?status=failed', 'orders.read');
  elsif new.status = 'refunded' and old.status <> 'refunded' and new.provider_status_code = -3 then
    perform private.notify_team('chargeback', 'Chargeback: ' || v_amount,
      'The card payment ' || new.reference || ' was charged back. Course access was removed.', '/app/owner/orders?status=refunded', 'orders.read');
  end if;
  return new;
end
$$;
revoke all on function private.on_order_changed_notify() from public;
create trigger orders_notify_changes after update on public.orders
  for each row execute function private.on_order_changed_notify();

-- Free enrolments are inserted then fulfilled in the same transaction; the
-- update trigger above catches the move to "paid".
