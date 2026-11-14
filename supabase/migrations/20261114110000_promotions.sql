-- =====================================================================
-- iBox Academy — Promotions: coupon codes applied at checkout.
-- The discount is always worked out in the database; the browser only
-- sends the code. Run after 20261114100000_people_admin.sql.
-- =====================================================================

create type public.discount_type as enum ('percent', 'fixed');

create table public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description        text check (char_length(description) <= 200),
  discount_type      public.discount_type not null,
  discount_value     numeric(12, 2) not null check (discount_value > 0),
  starts_at          timestamptz,
  ends_at            timestamptz,
  max_redemptions    integer check (max_redemptions > 0),
  per_learner_limit  integer not null default 1 check (per_learner_limit between 1 and 100),
  applies_to_all     boolean not null default true,
  is_active          boolean not null default true,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index coupons_created_by_idx on public.coupons (created_by);
create trigger coupons_set_updated_at before update on public.coupons
  for each row execute function private.set_updated_at();

create table public.coupon_courses (
  coupon_id  uuid not null references public.coupons (id) on delete cascade,
  course_id  uuid not null references public.courses (id) on delete cascade,
  primary key (coupon_id, course_id)
);
create index coupon_courses_course_idx on public.coupon_courses (course_id);

alter table public.orders
  add column coupon_id      uuid references public.coupons (id) on delete set null,
  add column coupon_code    text,
  add column list_price_lkr numeric(12, 2),
  add column discount_lkr   numeric(12, 2) not null default 0 check (discount_lkr >= 0);
create index orders_coupon_idx on public.orders (coupon_id) where coupon_id is not null;

-- Only the Owner creates and changes codes; finance staff can see them.
alter table public.coupons enable row level security;
alter table public.coupon_courses enable row level security;
revoke all on public.coupons, public.coupon_courses from anon, authenticated;
grant select, insert, update, delete on public.coupons, public.coupon_courses to authenticated;

create policy "coupons: owner and finance read" on public.coupons for select to authenticated
  using ((select private.has_permission('orders.read')));
create policy "coupons: owner inserts" on public.coupons for insert to authenticated
  with check ((select private.is_owner()));
create policy "coupons: owner updates" on public.coupons for update to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy "coupons: owner deletes" on public.coupons for delete to authenticated
  using ((select private.is_owner()));

create policy "coupon_courses: owner and finance read" on public.coupon_courses for select to authenticated
  using ((select private.has_permission('orders.read')));
create policy "coupon_courses: owner writes" on public.coupon_courses for all to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));

-- ---------------------------------------------------------------------
-- Work out a code's discount for a learner and course.
-- Paid, in-review and still-open orders count as uses, so a limited code
-- can't be oversold; expired or cancelled orders free their use again.
-- ---------------------------------------------------------------------
create or replace function private.coupon_quote(p_code text, p_course_id uuid, p_student uuid, p_lock boolean default false)
returns table (coupon_id uuid, code text, list_price numeric, discount numeric, total numeric)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  k public.coupons;
  c public.courses;
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_price numeric(12, 2);
  v_discount numeric(12, 2);
  v_used integer;
begin
  if v_code = '' then raise exception 'Enter a code' using errcode = '22023'; end if;

  if p_lock then
    select * into k from public.coupons where public.coupons.code = v_code for update;
  else
    select * into k from public.coupons where public.coupons.code = v_code;
  end if;
  if not found then raise exception 'That code isn''t valid' using errcode = '22023'; end if;

  select * into c from public.courses where id = p_course_id;
  v_price := coalesce(c.sale_price_lkr, c.price_lkr);
  if v_price is null or v_price = 0 then raise exception 'This course is already free' using errcode = '22023'; end if;

  if not k.is_active then raise exception 'This code isn''t active' using errcode = '22023'; end if;
  if k.starts_at is not null and k.starts_at > now() then raise exception 'This code isn''t active yet' using errcode = '22023'; end if;
  if k.ends_at is not null and k.ends_at <= now() then raise exception 'This code has expired' using errcode = '22023'; end if;
  if not k.applies_to_all and not exists (
    select 1 from public.coupon_courses cc where cc.coupon_id = k.id and cc.course_id = p_course_id
  ) then
    raise exception 'This code doesn''t apply to this course' using errcode = '22023';
  end if;

  -- Live uses: paid, in review, or still-open orders. The learner's own open
  -- order for this course is replaced at checkout, so it isn't counted.
  if k.max_redemptions is not null then
    select count(*) into v_used from public.orders o
      where o.coupon_id = k.id
        and (o.status in ('paid', 'under_review', 'partially_refunded')
             or (o.status = 'pending' and (o.expires_at is null or o.expires_at > now())))
        and not (o.student_id = p_student and o.course_id = p_course_id and o.status = 'pending');
    if v_used >= k.max_redemptions then raise exception 'This code has been fully used' using errcode = '22023'; end if;
  end if;

  select count(*) into v_used from public.orders o
    where o.coupon_id = k.id and o.student_id = p_student
      and (o.status in ('paid', 'under_review', 'partially_refunded')
           or (o.status = 'pending' and (o.expires_at is null or o.expires_at > now())))
      and not (o.course_id = p_course_id and o.status = 'pending');
  if v_used >= k.per_learner_limit then raise exception 'You''ve already used this code' using errcode = '22023'; end if;

  v_discount := case k.discount_type
    when 'percent' then round(v_price * k.discount_value / 100)
    else least(k.discount_value, v_price)
  end;
  v_discount := least(greatest(v_discount, 0), v_price);

  return query select k.id, k.code, v_price, v_discount, v_price - v_discount;
end
$$;
revoke all on function private.coupon_quote(text, uuid, uuid, boolean) from public;

-- Checkout preview: shows the new total before paying.
create or replace function public.preview_coupon(p_course_id uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  q record;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not exists (select 1 from public.courses where id = p_course_id and status = 'published') then
    raise exception 'This course is not available' using errcode = '22023';
  end if;
  select * into q from private.coupon_quote(p_code, p_course_id, (select auth.uid()), false);
  return jsonb_build_object('code', q.code, 'listPrice', q.list_price, 'discount', q.discount, 'total', q.total);
end
$$;
revoke all on function public.preview_coupon(uuid, text) from public, anon;
grant execute on function public.preview_coupon(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- create_order, now with an optional code. A 100% code enrols for free.
-- ---------------------------------------------------------------------
drop function if exists public.create_order(uuid, public.payment_method);

create function public.create_order(p_course_id uuid, p_method public.payment_method, p_coupon_code text default null)
returns table (order_id uuid, reference text, status public.order_status, amount_lkr numeric)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  c public.courses;
  v_price numeric(12, 2);
  v_total numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_coupon uuid;
  v_code text;
  v_method public.payment_method := p_method;
  v_ref text;
  q record;
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
  v_total := v_price;

  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null and v_price > 0 then
    -- Locks the code row so two checkouts can't both take its last use.
    select * into q from private.coupon_quote(p_coupon_code, c.id, v_uid, true);
    v_coupon := q.coupon_id;
    v_code := q.code;
    v_discount := q.discount;
    v_total := q.total;
  end if;

  if v_total = 0 then v_method := 'free'; end if;
  if v_method = 'free' and v_total > 0 then raise exception 'Invalid payment method' using errcode = '22023'; end if;

  -- An earlier unfinished order for the same course is replaced by this one.
  update public.orders
    set status = 'cancelled'
    where student_id = v_uid and course_id = c.id and status = 'pending';

  v_ref := 'IBX-' || to_char(now() at time zone 'Asia/Colombo', 'YYMMDD') || '-' ||
           upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (reference, student_id, course_id, course_title, amount_lkr, method, status, expires_at,
                             coupon_id, coupon_code, list_price_lkr, discount_lkr)
  values (
    v_ref, v_uid, c.id, c.title, v_total, v_method, 'pending',
    case v_method when 'bank_transfer' then now() + interval '3 days' when 'payhere' then now() + interval '1 day' else null end,
    v_coupon, v_code, v_price, v_discount
  )
  returning * into o;

  if v_method = 'free' then
    perform private.fulfil_order(o.id);
    select * into o from public.orders where id = o.id;
  end if;

  return query select o.id, o.reference, o.status, o.amount_lkr;
end
$$;
revoke all on function public.create_order(uuid, public.payment_method, text) from public, anon;
grant execute on function public.create_order(uuid, public.payment_method, text) to authenticated;
