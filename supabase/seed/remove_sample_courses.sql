-- =====================================================================
-- iBox Academy — REMOVE SAMPLE COURSES
-- Deletes every course whose slug starts with "sample-", including any
-- TEST orders, enrolments and payment events made for them.
-- Run in Supabase → SQL Editor before launch. This can't be undone.
-- =====================================================================
begin;

delete from public.payment_events
  where order_id in (select o.id from public.orders o join public.courses c on c.id = o.course_id where c.slug like 'sample-%');
delete from public.enrolments
  where course_id in (select id from public.courses where slug like 'sample-%');
delete from public.orders
  where course_id in (select id from public.courses where slug like 'sample-%');
-- Sections, lessons, quiz questions and resource rows are removed by cascade.
delete from public.courses where slug like 'sample-%';

commit;
