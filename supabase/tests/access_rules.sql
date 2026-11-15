-- =====================================================================
-- iBox Academy — access-rule tests (launch hardening).
--
-- Checks what a visitor, a learner, staff and the Owner can and can't do,
-- straight against the database rules (RLS, grants, functions).
--
-- SAFE TO RUN: everything happens inside one transaction that is rolled
-- back at the end, so no test data is left behind. Still, run it on a
-- local or staging database (supabase start / db reset), not production.
--
--   psql "$DATABASE_URL" -f supabase/tests/access_rules.sql
--
-- The last result lists every check with PASS or FAIL.
-- =====================================================================

begin;

create schema t_harness;
grant usage on schema t_harness to anon, authenticated;
create table t_harness.results (n serial, name text, ok boolean, detail text);
grant insert, select on t_harness.results to anon, authenticated;
grant usage on sequence t_harness.results_n_seq to anon, authenticated;

-- Statement must succeed.
create function t_harness.ok(p_name text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into t_harness.results (name, ok) values (p_name, true);
exception when others then
  insert into t_harness.results (name, ok, detail) values (p_name, false, sqlerrm);
end $$;

-- Statement must be refused (error, or an insert/update that touches no rows).
create function t_harness.denied(p_name text, p_sql text) returns void language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n = 0 and p_sql ~* '^\s*(update|delete)' then
    insert into t_harness.results (name, ok, detail) values (p_name, true, 'no rows touched');
  else
    insert into t_harness.results (name, ok, detail) values (p_name, false, 'was allowed');
  end if;
exception when others then
  insert into t_harness.results (name, ok, detail) values (p_name, true, sqlerrm);
end $$;

-- Query must return exactly p_expected rows (errors count as 0 rows).
create function t_harness.rows(p_name text, p_sql text, p_expected int) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute 'select count(*) from (' || p_sql || ') q' into n;
  exception when others then
    n := 0;
  end;
  insert into t_harness.results (name, ok, detail) values (p_name, n = p_expected, format('got %s, expected %s', n, p_expected));
end $$;

grant execute on all functions in schema t_harness to anon, authenticated;

-- Act as someone. p_user null = signed-out visitor.
create function t_harness.act(p_user uuid, p_aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claims',
    case when p_user is null then '{"role":"anon"}'
         else json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text end, true);
end $$;

-- ---------------------------------------------------------------- seed
insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-0000000000a1', 'owner@test.local'),
  ('00000000-0000-4000-a000-0000000000a2', 'staff@test.local'),
  ('00000000-0000-4000-a000-0000000000a3', 'learner-a@test.local'),
  ('00000000-0000-4000-a000-0000000000a4', 'learner-b@test.local');
update public.profiles set role = 'owner' where id = '00000000-0000-4000-a000-0000000000a1';
update public.profiles set role = 'staff' where id = '00000000-0000-4000-a000-0000000000a2';
insert into public.staff_permissions (user_id, permission_key) values
  ('00000000-0000-4000-a000-0000000000a2', 'tickets.read'),
  ('00000000-0000-4000-a000-0000000000a2', 'tickets.reply');

insert into public.courses (id, slug, title, status, price_lkr, access_type) values
  ('00000000-0000-4000-b000-0000000000c1', 't-paid', 'Paid course', 'published', 5000, 'lifetime'),
  ('00000000-0000-4000-b000-0000000000c2', 't-draft', 'Draft course', 'draft', 5000, 'lifetime');
insert into public.course_sections (id, course_id, title) values
  ('00000000-0000-4000-b000-0000000000d1', '00000000-0000-4000-b000-0000000000c1', 'Section');
insert into public.lessons (id, course_id, section_id, title, type, status, position, is_preview, bunny_video_id) values
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-b000-0000000000d1', 'Paid video', 'video', 'published', 0, false, 'vid-paid'),
  ('00000000-0000-4000-b000-0000000000e2', '00000000-0000-4000-b000-0000000000c1', '00000000-0000-4000-b000-0000000000d1', 'Free preview', 'video', 'published', 1, true, 'vid-free');
insert into public.orders (id, reference, student_id, course_id, course_title, amount_lkr, method, status) values
  ('00000000-0000-4000-b000-0000000000f1', 'T-ORDER-A', '00000000-0000-4000-a000-0000000000a3', '00000000-0000-4000-b000-0000000000c1', 'Paid course', 5000, 'bank_transfer', 'under_review'),
  ('00000000-0000-4000-b000-0000000000f2', 'T-ORDER-B', '00000000-0000-4000-a000-0000000000a4', '00000000-0000-4000-b000-0000000000c1', 'Paid course', 5000, 'bank_transfer', 'under_review');
insert into public.support_tickets (id, reference, requester_id, requester_name, requester_email, category, subject) values
  ('00000000-0000-4000-b000-0000000000a9', 'T-SUP-A', '00000000-0000-4000-a000-0000000000a3', 'Learner A', 'learner-a@test.local', 'payment', 'Help please');
insert into public.ticket_messages (ticket_id, author_name, from_team, is_internal, body) values
  ('00000000-0000-4000-b000-0000000000a9', 'Learner A', false, false, 'My question'),
  ('00000000-0000-4000-b000-0000000000a9', 'Staff', true, true, 'Internal note');
insert into public.wishlist_items (student_id, course_id) values
  ('00000000-0000-4000-a000-0000000000a4', '00000000-0000-4000-b000-0000000000c1');

-- ---------------------------------------------------------------- visitor
set local role anon;
select t_harness.act(null);
select t_harness.rows('visitor: sees published course only', 'select id from public.courses where slug like ''t-%''', 1);
select t_harness.denied('visitor: cannot read orders', 'select * from public.orders');
select t_harness.denied('visitor: cannot read enrolments', 'select * from public.enrolments');
select t_harness.denied('visitor: cannot read profiles', 'select * from public.profiles');
select t_harness.denied('visitor: cannot read support tickets', 'select * from public.support_tickets');
select t_harness.denied('visitor: cannot read audit log', 'select * from public.audit_events');
select t_harness.denied('visitor: cannot read lesson text bodies directly', 'select body from public.lessons');
select t_harness.denied('visitor: cannot read video IDs directly', 'select bunny_video_id from public.lessons');
select t_harness.rows('visitor: gets only the free preview video ID',
  'select * from public.lesson_video_ids(array[''00000000-0000-4000-b000-0000000000e1'',''00000000-0000-4000-b000-0000000000e2'']::uuid[])', 1);
select t_harness.denied('visitor: cannot read CMS drafts', 'select draft from public.cms_pages');
select t_harness.denied('visitor: cannot create orders', 'select public.create_order(''00000000-0000-4000-b000-0000000000c1'', ''bank_transfer'')');
select t_harness.denied('visitor: cannot preview coupons', 'select public.preview_coupon(''00000000-0000-4000-b000-0000000000c1'', ''X'')');
reset role;

-- ---------------------------------------------------------------- learner A
set local role authenticated;
select t_harness.act('00000000-0000-4000-a000-0000000000a3');
select t_harness.rows('learner: sees own order only', 'select id from public.orders', 1);
select t_harness.rows('learner: sees own profile only', 'select id from public.profiles', 1);
select t_harness.rows('learner: cannot see another learner''s wishlist', 'select * from public.wishlist_items', 0);
select t_harness.denied('learner: cannot make themselves Owner', 'update public.profiles set role = ''owner'' where id = ''00000000-0000-4000-a000-0000000000a3''');
select t_harness.denied('learner: cannot change account status', 'update public.profiles set status = ''active'' where id = ''00000000-0000-4000-a000-0000000000a3''');
select t_harness.ok('learner: can change own name', 'update public.profiles set full_name = ''A'' where id = ''00000000-0000-4000-a000-0000000000a3''');
select t_harness.denied('learner: cannot mark own order paid', 'update public.orders set status = ''paid'' where id = ''00000000-0000-4000-b000-0000000000f1''');
select t_harness.denied('learner: cannot give themselves a course', 'insert into public.enrolments (student_id, course_id) values (''00000000-0000-4000-a000-0000000000a3'', ''00000000-0000-4000-b000-0000000000c1'')');
select t_harness.denied('learner: cannot approve own bank transfer', 'select public.review_bank_transfer(''00000000-0000-4000-b000-0000000000f1'', true)');
select t_harness.rows('learner: no paid video ID before buying',
  'select * from public.lesson_video_ids(array[''00000000-0000-4000-b000-0000000000e1'']::uuid[])', 0);
select t_harness.denied('learner: cannot edit courses', 'update public.courses set price_lkr = 1 where id = ''00000000-0000-4000-b000-0000000000c1''');
select t_harness.denied('learner: cannot publish a draft', 'update public.courses set status = ''published'' where id = ''00000000-0000-4000-b000-0000000000c2''');
select t_harness.denied('learner: cannot write the audit log', 'insert into public.audit_events (actor_id, action) values (''00000000-0000-4000-a000-0000000000a3'', ''fake'')');
select t_harness.rows('learner: sees own ticket', 'select id from public.support_tickets', 1);
select t_harness.rows('learner: never sees internal notes', 'select id from public.ticket_messages', 1);
select t_harness.denied('learner: cannot add internal notes', 'select public.reply_to_ticket(''00000000-0000-4000-b000-0000000000a9'', ''x'', true)');
select t_harness.denied('learner: cannot change ticket priority', 'select public.update_ticket(''00000000-0000-4000-b000-0000000000a9'', null, ''urgent'')');
select t_harness.denied('learner: cannot edit the website', 'select public.cms_save_draft(''home'', ''Home'', ''{"sections":[]}'', null)');
select t_harness.denied('learner: cannot read other notifications', 'update public.notifications set read_at = now() where recipient_id <> ''00000000-0000-4000-a000-0000000000a3''');
select t_harness.denied('learner: cannot upload slips into someone else''s folder',
  'insert into storage.objects (bucket_id, name) values (''payment-slips'', ''00000000-0000-4000-a000-0000000000a4/x.pdf'')');
select t_harness.denied('learner: cannot upload website images',
  'insert into storage.objects (bucket_id, name) values (''site-media'', ''00000000-0000-4000-0000-000000000001.png'')');
select t_harness.rows('learner: cannot read private site settings', 'select key from public.site_settings where not is_public', 0);
reset role;

-- ---------------------------------------------------------------- learner B
set local role authenticated;
select t_harness.act('00000000-0000-4000-a000-0000000000a4');
select t_harness.rows('other learner: cannot see learner A''s ticket', 'select id from public.support_tickets', 0);
select t_harness.denied('other learner: cannot reply on learner A''s ticket', 'select public.reply_to_ticket(''00000000-0000-4000-b000-0000000000a9'', ''hi'')');
select t_harness.rows('other learner: sees own wishlist', 'select * from public.wishlist_items', 1);
select t_harness.denied('other learner: cannot save a draft course', 'insert into public.wishlist_items (student_id, course_id) values (''00000000-0000-4000-a000-0000000000a4'', ''00000000-0000-4000-b000-0000000000c2'')');
reset role;

-- ---------------------------------------------------------------- staff
set local role authenticated;
select t_harness.act('00000000-0000-4000-a000-0000000000a2', 'aal1');
select t_harness.rows('staff without two-step: no support access', 'select id from public.support_tickets', 0);
select t_harness.act('00000000-0000-4000-a000-0000000000a2', 'aal2');
select t_harness.rows('support staff: sees tickets', 'select id from public.support_tickets', 1);
select t_harness.rows('support staff: sees internal notes', 'select id from public.ticket_messages', 2);
select t_harness.ok('support staff: can reply', 'select public.reply_to_ticket(''00000000-0000-4000-b000-0000000000a9'', ''We are on it'')');
select t_harness.denied('support staff: cannot close without permission', 'select public.update_ticket(''00000000-0000-4000-b000-0000000000a9'', ''closed'')');
select t_harness.rows('support staff: cannot read orders', 'select id from public.orders', 0);
select t_harness.denied('support staff: cannot approve payments', 'select public.review_bank_transfer(''00000000-0000-4000-b000-0000000000f2'', true)');
select t_harness.denied('support staff: cannot edit courses', 'update public.courses set price_lkr = 1 where id = ''00000000-0000-4000-b000-0000000000c1''');
select t_harness.denied('support staff: cannot manage staff', 'insert into public.staff_permissions (user_id, permission_key) values (''00000000-0000-4000-a000-0000000000a2'', ''orders.read'')');
select t_harness.rows('support staff: cannot read the audit log', 'select id from public.audit_events', 0);
reset role;

-- ---------------------------------------------------------------- owner
set local role authenticated;
select t_harness.act('00000000-0000-4000-a000-0000000000a1', 'aal1');
select t_harness.rows('owner without two-step: no orders', 'select id from public.orders', 0);
select t_harness.denied('owner without two-step: cannot change settings', 'update public.site_settings set value = value');
select t_harness.act('00000000-0000-4000-a000-0000000000a1', 'aal2');
select t_harness.rows('owner: sees all orders', 'select id from public.orders where reference like ''T-ORDER-%''', 2);
select t_harness.ok('owner: can approve a learner''s bank transfer', 'select public.review_bank_transfer(''00000000-0000-4000-b000-0000000000f2'', true)');
select t_harness.ok('owner: can save a website draft', 'select public.cms_save_draft(''t-page'', ''Test'', ''{"sections":[]}'', null)');
select t_harness.ok('owner: can publish it', 'select public.cms_publish(''t-page'')');
reset role;

-- ---------------------------------------------------------------- results
select n, case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail
from t_harness.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t_harness.results;

rollback;
