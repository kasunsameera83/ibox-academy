-- =====================================================================
-- iBox Academy — Reports. Aggregates are computed in the database and
-- returned only to people with reports.read; the row-level order export
-- needs exports.finance. Days and months follow Sri Lanka time.
-- Run after 20261114110000_promotions.sql.
-- =====================================================================

create index if not exists orders_paid_at_idx on public.orders (paid_at) where paid_at is not null;
create index if not exists enrolments_starts_at_idx on public.enrolments (starts_at);
create index if not exists profiles_created_at_idx on public.profiles (created_at);
create index if not exists certificates_issued_at_idx on public.certificates (issued_at);

-- p_from inclusive, p_to exclusive. p_bucket: 'day' | 'week' | 'month'.
create or replace function public.report_summary(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_bucket text := case when p_bucket in ('day', 'week', 'month') then p_bucket else 'day' end;
  v_step interval := case v_bucket when 'day' then interval '1 day' when 'week' then interval '1 week' else interval '1 month' end;
  v_result jsonb;
begin
  if not private.has_permission('reports.read') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_to <= p_from or p_to - p_from > interval '3 years' then
    raise exception 'Choose a range of up to three years' using errcode = '22023';
  end if;

  with paid as (
    select o.*, (o.paid_at at time zone 'Asia/Colombo') as local_at
    from public.orders o
    where o.status in ('paid', 'partially_refunded') and o.paid_at >= p_from and o.paid_at < p_to
  ),
  buckets as (
    select generate_series(
      date_trunc(v_bucket, p_from at time zone 'Asia/Colombo'),
      date_trunc(v_bucket, (p_to - interval '1 second') at time zone 'Asia/Colombo'),
      v_step
    ) as b
  ),
  series as (
    select jsonb_agg(jsonb_build_object(
      'start', to_char(bk.b, 'YYYY-MM-DD'),
      'revenue', coalesce((select sum(p.amount_lkr) from paid p where date_trunc(v_bucket, p.local_at) = bk.b), 0),
      'orders', (select count(*) from paid p where date_trunc(v_bucket, p.local_at) = bk.b and p.amount_lkr > 0),
      'enrolments', (select count(*) from public.enrolments e
                     where e.starts_at >= p_from and e.starts_at < p_to
                       and date_trunc(v_bucket, e.starts_at at time zone 'Asia/Colombo') = bk.b),
      'signups', (select count(*) from public.profiles pr
                  where pr.role = 'student' and pr.created_at >= p_from and pr.created_at < p_to
                    and date_trunc(v_bucket, pr.created_at at time zone 'Asia/Colombo') = bk.b)
    ) order by bk.b) as data
    from buckets bk
  ),
  totals as (
    select jsonb_build_object(
      'revenue', coalesce((select sum(amount_lkr) from paid), 0),
      'paidOrders', (select count(*) from paid where amount_lkr > 0),
      'freeEnrolments', (select count(*) from paid where amount_lkr = 0),
      'discount', coalesce((select sum(discount_lkr) from paid), 0),
      'signups', (select count(*) from public.profiles where role = 'student' and created_at >= p_from and created_at < p_to),
      'enrolments', (select count(*) from public.enrolments where starts_at >= p_from and starts_at < p_to),
      'certificates', (select count(*) from public.certificates where issued_at >= p_from and issued_at < p_to),
      'refunded', coalesce((select sum(amount_lkr) from public.orders where status = 'refunded' and paid_at >= p_from and paid_at < p_to), 0),
      'awaitingReview', (select count(*) from public.orders where status = 'under_review')
    ) as data
  ),
  courses as (
    select coalesce(jsonb_agg(row_to_json(x) order by x.revenue desc, x.enrolled desc), '[]'::jsonb) as data
    from (
      select
        c.id, c.title, c.slug, c.status,
        coalesce((select sum(p.amount_lkr) from paid p where p.course_id = c.id), 0) as revenue,
        (select count(*) from paid p where p.course_id = c.id and p.amount_lkr > 0) as "paidOrders",
        (select count(*) from public.enrolments e where e.course_id = c.id and e.starts_at >= p_from and e.starts_at < p_to) as "newEnrolments",
        (select count(*) from public.enrolments e where e.course_id = c.id and e.status = 'active') as enrolled,
        (select count(*) from public.certificates ce where ce.course_id = c.id) as completed,
        (select count(*) from public.lessons l where l.course_id = c.id and l.status = 'published') as lessons,
        coalesce((
          select round(avg(least(1.0, done::numeric / nullif(total, 0))) * 100)
          from (
            select e.student_id,
                   (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
                     where lp.student_id = e.student_id and lp.course_id = c.id and lp.completed_at is not null and l.status = 'published') as done,
                   (select count(*) from public.lessons l where l.course_id = c.id and l.status = 'published') as total
            from public.enrolments e where e.course_id = c.id and e.status = 'active'
          ) per_learner
        ), 0) as "avgProgress"
      from public.courses c
      where c.status <> 'archived' or exists (select 1 from paid p where p.course_id = c.id)
    ) x
  ),
  methods as (
    select coalesce(jsonb_agg(jsonb_build_object('method', method, 'orders', n, 'revenue', rev) order by rev desc), '[]'::jsonb) as data
    from (select method, count(*) as n, sum(amount_lkr) as rev from paid group by method) m
  ),
  codes as (
    select coalesce(jsonb_agg(jsonb_build_object('code', coupon_code, 'orders', n, 'revenue', rev, 'discount', disc) order by n desc), '[]'::jsonb) as data
    from (select coupon_code, count(*) as n, sum(amount_lkr) as rev, sum(discount_lkr) as disc from paid where coupon_code is not null group by coupon_code limit 20) k
  )
  select jsonb_build_object(
    'bucket', v_bucket,
    'totals', (select data from totals),
    'series', coalesce((select data from series), '[]'::jsonb),
    'courses', (select data from courses),
    'methods', (select data from methods),
    'codes', (select data from codes)
  ) into v_result;

  return v_result;
end
$$;
revoke all on function public.report_summary(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.report_summary(timestamptz, timestamptz, text) to authenticated;

-- Row-level export for accounting (learner names and emails included).
create or replace function public.report_orders_export(p_from timestamptz, p_to timestamptz)
returns table (
  reference text, created_at timestamptz, paid_at timestamptz, status public.order_status, method public.payment_method,
  learner_name text, learner_email text, course_title text, list_price_lkr numeric, discount_lkr numeric,
  coupon_code text, amount_lkr numeric, provider_payment_id text
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('exports.finance') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_to <= p_from or p_to - p_from > interval '3 years' then
    raise exception 'Choose a range of up to three years' using errcode = '22023';
  end if;
  perform private.audit('report.export_orders', 'report', 'orders',
    jsonb_build_object('from', p_from, 'to', p_to));
  return query
    select o.reference, o.created_at, o.paid_at, o.status, o.method,
           p.full_name, p.email, o.course_title, coalesce(o.list_price_lkr, o.amount_lkr), o.discount_lkr,
           o.coupon_code, o.amount_lkr, o.provider_payment_id
    from public.orders o join public.profiles p on p.id = o.student_id
    where o.created_at >= p_from and o.created_at < p_to
    order by o.created_at;
end
$$;
revoke all on function public.report_orders_export(timestamptz, timestamptz) from public, anon;
grant execute on function public.report_orders_export(timestamptz, timestamptz) to authenticated;
