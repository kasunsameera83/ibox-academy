-- =====================================================================
-- iBox Academy — promotion hardening (2026-11-14 threat model, T-005).
--   * Unpaid orders hold a limited code for 30 minutes, not up to 3 days,
--     so throwaway accounts can't lock a code away from real learners.
--   * Checking codes is rate-limited (10 wrong codes per hour per account).
--   * create_order only accepts a code that was checked at checkout, so
--     codes can't be guessed through it either.
-- Run after 20261114130000_security_hardening.sql.
-- =====================================================================

create table private.coupon_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  course_id  uuid not null,
  code       text not null,
  ok         boolean not null,
  created_at timestamptz not null default now()
);
create index coupon_attempts_user_idx on private.coupon_attempts (user_id, created_at desc);
revoke all on private.coupon_attempts from public, anon, authenticated;

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

  -- Live uses: paid or in-review orders, plus unpaid orders for their first
  -- 30 minutes (long enough to finish card checkout or upload a slip).
  -- The learner's own open
  -- order for this course is replaced at checkout, so it isn't counted.
  if k.max_redemptions is not null then
    select count(*) into v_used from public.orders o
      where o.coupon_id = k.id
        and (o.status in ('paid', 'under_review', 'partially_refunded')
             or (o.status = 'pending' and o.created_at > now() - interval '30 minutes'
                 and (o.expires_at is null or o.expires_at > now())))
        and not (o.student_id = p_student and o.course_id = p_course_id and o.status = 'pending');
    if v_used >= k.max_redemptions then raise exception 'This code has been fully used' using errcode = '22023'; end if;
  end if;

  select count(*) into v_used from public.orders o
    where o.coupon_id = k.id and o.student_id = p_student
      and (o.status in ('paid', 'under_review', 'partially_refunded')
           or (o.status = 'pending' and o.created_at > now() - interval '30 minutes'
               and (o.expires_at is null or o.expires_at > now())))
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

-- Checkout preview. Returns {error} instead of raising, so the attempt is
-- recorded even when the code is wrong (a raised error would undo it).
create or replace function public.preview_coupon(p_course_id uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(btrim(coalesce(p_code, '')));
  q record;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not exists (select 1 from public.courses where id = p_course_id and status = 'published') then
    raise exception 'This course is not available' using errcode = '22023';
  end if;

  delete from private.coupon_attempts where user_id = v_uid and created_at < now() - interval '1 day';
  if (select count(*) from private.coupon_attempts
      where user_id = v_uid and not ok and created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', 'Too many tries. Please wait an hour and try again', 'limited', true);
  end if;

  begin
    select * into q from private.coupon_quote(v_code, p_course_id, v_uid, false);
  exception when sqlstate '22023' then
    insert into private.coupon_attempts (user_id, course_id, code, ok) values (v_uid, p_course_id, left(v_code, 30), false);
    return jsonb_build_object('error', sqlerrm);
  end;

  insert into private.coupon_attempts (user_id, course_id, code, ok) values (v_uid, p_course_id, q.code, true);
  return jsonb_build_object('code', q.code, 'listPrice', q.list_price, 'discount', q.discount, 'total', q.total);
end
$$;
revoke all on function public.preview_coupon(uuid, text) from public, anon;
grant execute on function public.preview_coupon(uuid, text) to authenticated;

create or replace function public.create_order(p_course_id uuid, p_method public.payment_method, p_coupon_code text default null)
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
    -- The code must have been checked at checkout first (preview_coupon),
    -- which is rate-limited. This stops guessing codes through create_order.
    if not exists (
      select 1 from private.coupon_attempts a
      where a.user_id = v_uid and a.course_id = c.id and a.ok
        and a.code = upper(btrim(p_coupon_code)) and a.created_at > now() - interval '1 hour'
    ) then
      raise exception 'Check the code again' using errcode = '22023';
    end if;
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
