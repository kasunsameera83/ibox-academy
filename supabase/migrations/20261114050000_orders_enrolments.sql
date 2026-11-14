-- =====================================================================
-- iBox Academy — Phase 3a: orders, payments, enrolments.
-- Learners never write these tables directly: every change goes through
-- the functions below, which check identity, price and state.
-- Run after 20261114040000_mfa_enforcement.sql.
-- =====================================================================

create type public.order_status as enum
  ('pending', 'under_review', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded');
create type public.payment_method as enum ('payhere', 'bank_transfer', 'free');
create type public.enrolment_status as enum ('active', 'revoked', 'expired');

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,
  student_id            uuid not null references public.profiles (id) on delete restrict,
  course_id             uuid not null references public.courses (id) on delete restrict,
  course_title          text not null,
  amount_lkr            numeric(12, 2) not null check (amount_lkr >= 0),
  currency              text not null default 'LKR',
  method                public.payment_method not null,
  status                public.order_status not null default 'pending',
  provider_payment_id   text,
  provider_status_code  integer,
  slip_path             text,
  slip_uploaded_at      timestamptz,
  review_note           text check (char_length(review_note) <= 500),
  reviewed_by           uuid references public.profiles (id) on delete set null,
  reviewed_at           timestamptz,
  paid_at               timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index orders_student_idx on public.orders (student_id, created_at desc);
create index orders_course_idx on public.orders (course_id);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_reviewed_by_idx on public.orders (reviewed_by);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

create table public.payment_events (
  id               bigint generated always as identity primary key,
  order_id         uuid references public.orders (id) on delete set null,
  provider         text not null,
  provider_ref     text,
  status_code      integer,
  signature_valid  boolean not null,
  outcome          text not null,
  payload          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index payment_events_order_idx on public.payment_events (order_id);

create table public.enrolments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete restrict,
  order_id    uuid references public.orders (id) on delete set null,
  status      public.enrolment_status not null default 'active',
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (student_id, course_id)
);
create index enrolments_course_idx on public.enrolments (course_id);
create index enrolments_order_idx on public.enrolments (order_id);
create trigger enrolments_set_updated_at before update on public.enrolments
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: read-only for users; all writes through functions.
-- ---------------------------------------------------------------------
alter table public.orders         enable row level security;
alter table public.payment_events enable row level security;
alter table public.enrolments     enable row level security;
revoke all on public.orders, public.payment_events, public.enrolments from anon, authenticated;
grant select on public.orders, public.payment_events, public.enrolments to authenticated;

create policy "orders: learners read own" on public.orders for select to authenticated
  using ((select auth.uid()) = student_id);
create policy "orders: finance team reads" on public.orders for select to authenticated
  using ((select private.has_permission('orders.read')));

create policy "payment_events: finance team reads" on public.payment_events for select to authenticated
  using ((select private.has_permission('payments.read')));

create policy "enrolments: learners read own" on public.enrolments for select to authenticated
  using ((select auth.uid()) = student_id);
create policy "enrolments: team reads" on public.enrolments for select to authenticated
  using ((select private.has_permission('students.read')) or (select private.has_permission('orders.read')));

-- ---------------------------------------------------------------------
-- Fulfilment (internal): mark paid + grant or extend access. Idempotent.
-- ---------------------------------------------------------------------
create or replace function private.fulfil_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.orders;
  c public.courses;
  v_expires timestamptz;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if o.status <> 'paid' then
    update public.orders set status = 'paid', paid_at = coalesce(paid_at, now()) where id = o.id;
  end if;

  select * into c from public.courses where id = o.course_id;
  v_expires := case when c.access_type = 'fixed_days' then now() + make_interval(days => c.access_days) else null end;

  insert into public.enrolments (student_id, course_id, order_id, status, starts_at, expires_at)
  values (o.student_id, o.course_id, o.id, 'active', now(), v_expires)
  on conflict (student_id, course_id) do update
    set status = 'active', order_id = excluded.order_id, starts_at = now(), expires_at = excluded.expires_at
    where public.enrolments.order_id is distinct from excluded.order_id or public.enrolments.status <> 'active';
end
$$;
revoke all on function private.fulfil_order(uuid) from public;

-- ---------------------------------------------------------------------
-- Create an order for the signed-in learner. The price always comes from
-- the course, never from the browser. Free courses are fulfilled at once.
-- ---------------------------------------------------------------------
create or replace function public.create_order(p_course_id uuid, p_method public.payment_method)
returns table (order_id uuid, reference text, status public.order_status, amount_lkr numeric)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  c public.courses;
  v_price numeric(12, 2);
  v_method public.payment_method := p_method;
  v_ref text;
  o public.orders;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;

  select * into c from public.courses where id = p_course_id and status = 'published';
  if not found then raise exception 'This course is not available' using errcode = 'P0002'; end if;

  if exists (
    select 1 from public.enrolments e
    where e.student_id = v_uid and e.course_id = c.id and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  ) then
    raise exception 'Already enrolled' using errcode = '23505';
  end if;

  v_price := coalesce(c.sale_price_lkr, c.price_lkr);
  if v_price is null then raise exception 'This course has no price yet' using errcode = 'P0002'; end if;
  if v_price = 0 then v_method := 'free'; end if;
  if v_method = 'free' and v_price > 0 then raise exception 'Invalid payment method' using errcode = '22023'; end if;

  -- An earlier unfinished order for the same course is replaced by this one.
  update public.orders
    set status = 'cancelled'
    where student_id = v_uid and course_id = c.id and status = 'pending';

  v_ref := 'IBX-' || to_char(now() at time zone 'Asia/Colombo', 'YYMMDD') || '-' ||
           upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (reference, student_id, course_id, course_title, amount_lkr, method, status, expires_at)
  values (
    v_ref, v_uid, c.id, c.title, v_price, v_method, 'pending',
    case v_method when 'bank_transfer' then now() + interval '3 days' when 'payhere' then now() + interval '1 day' else null end
  )
  returning * into o;

  if v_method = 'free' then
    perform private.fulfil_order(o.id);
    select * into o from public.orders where id = o.id;
  end if;

  return query select o.id, o.reference, o.status, o.amount_lkr;
end
$$;
revoke all on function public.create_order(uuid, public.payment_method) from public, anon;
grant execute on function public.create_order(uuid, public.payment_method) to authenticated;

-- ---------------------------------------------------------------------
-- Bank transfer: learner attaches a slip; finance team approves/rejects.
-- ---------------------------------------------------------------------
create or replace function public.submit_bank_slip(p_order_id uuid, p_path text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_path is null or split_part(p_path, '/', 1) <> v_uid::text then
    raise exception 'Invalid file' using errcode = '22023';
  end if;
  update public.orders
    set slip_path = p_path, slip_uploaded_at = now(), status = 'under_review', review_note = null
    where id = p_order_id and student_id = v_uid and method = 'bank_transfer' and status = 'pending';
  if not found then raise exception 'This order is not waiting for a slip' using errcode = 'P0002'; end if;
end
$$;
revoke all on function public.submit_bank_slip(uuid, text) from public, anon;
grant execute on function public.submit_bank_slip(uuid, text) to authenticated;

create or replace function public.review_bank_transfer(p_order_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not private.has_permission('payments.verify_bank_transfer') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  perform 1 from public.orders where id = p_order_id and method = 'bank_transfer' and status = 'under_review' for update;
  if not found then raise exception 'This transfer is not waiting for review' using errcode = 'P0002'; end if;

  if p_approve then
    update public.orders set reviewed_by = v_uid, reviewed_at = now(), review_note = null where id = p_order_id;
    perform private.fulfil_order(p_order_id);
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'Give a reason' using errcode = '22023'; end if;
    -- Back to pending so the learner can upload a correct slip.
    update public.orders
      set status = 'pending', reviewed_by = v_uid, reviewed_at = now(), review_note = left(trim(p_note), 500),
          expires_at = greatest(coalesce(expires_at, now()), now() + interval '3 days')
      where id = p_order_id;
  end if;

  insert into public.audit_events (actor_id, action, target_type, target_id, metadata)
  values (v_uid, case when p_approve then 'payment.bank_transfer_approved' else 'payment.bank_transfer_rejected' end,
          'order', p_order_id::text, '{}'::jsonb);
end
$$;
revoke all on function public.review_bank_transfer(uuid, boolean, text) from public, anon;
grant execute on function public.review_bank_transfer(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- PayHere notification (server-to-server). Only the service role may call
-- this; the route handler verifies md5sig before calling it.
-- ---------------------------------------------------------------------
create or replace function public.apply_payhere_notification(
  p_reference text, p_payment_id text, p_status_code integer,
  p_amount numeric, p_currency text, p_payload jsonb
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  o public.orders;
  v_outcome text;
begin
  select * into o from public.orders where reference = p_reference for update;
  if not found then
    insert into public.payment_events (provider, provider_ref, status_code, signature_valid, outcome, payload)
    values ('payhere', p_payment_id, p_status_code, true, 'unknown_order', p_payload);
    return 'unknown_order';
  end if;

  if o.method <> 'payhere' or round(p_amount, 2) <> round(o.amount_lkr, 2) or upper(p_currency) <> o.currency then
    v_outcome := 'mismatch';
    update public.orders set status = case when status = 'paid' then status else 'under_review' end where id = o.id;
  elsif p_status_code = 2 then
    update public.orders set provider_payment_id = p_payment_id, provider_status_code = 2 where id = o.id;
    perform private.fulfil_order(o.id);
    v_outcome := 'paid';
  elsif p_status_code = 0 then
    update public.orders set provider_payment_id = p_payment_id, provider_status_code = 0 where id = o.id and status <> 'paid';
    v_outcome := 'pending';
  elsif p_status_code in (-1, -2) then
    update public.orders
      set status = case when p_status_code = -1 then 'cancelled'::public.order_status else 'failed'::public.order_status end,
          provider_payment_id = p_payment_id, provider_status_code = p_status_code
      where id = o.id and status <> 'paid';
    v_outcome := case when p_status_code = -1 then 'cancelled' else 'failed' end;
  elsif p_status_code = -3 then
    update public.orders set status = 'refunded', provider_status_code = -3 where id = o.id;
    update public.enrolments set status = 'revoked' where order_id = o.id;
    v_outcome := 'chargeback';
  else
    v_outcome := 'ignored';
  end if;

  insert into public.payment_events (order_id, provider, provider_ref, status_code, signature_valid, outcome, payload)
  values (o.id, 'payhere', p_payment_id, p_status_code, true, v_outcome, p_payload);
  return v_outcome;
end
$$;
revoke all on function public.apply_payhere_notification(text, text, integer, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payhere_notification(text, text, integer, numeric, text, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- Payment slips (private). Learners upload into their own folder.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "payment-slips: learners upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-slips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "payment-slips: learners read own" on storage.objects for select to authenticated
  using (bucket_id = 'payment-slips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "payment-slips: finance team reads" on storage.objects for select to authenticated
  using (bucket_id = 'payment-slips' and (select private.has_permission('payments.verify_bank_transfer')));

-- Bank details shown at checkout (edited in Owner → Settings → Payments).
insert into public.site_settings (key, value, is_public)
values ('bank_transfer', '{}'::jsonb, true)
on conflict (key) do nothing;
