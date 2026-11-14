-- =====================================================================
-- iBox Academy — security hardening (from the 2026-11-14 threat model).
--   1. Nobody can approve their own bank transfer.
--   2. Bunny video IDs are only given to people who may watch the lesson.
--   3. Audit entries can only be written by trusted server code.
-- Run after 20261114120000_reports.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bank transfers: the reviewer must not be the learner on the order.
-- ---------------------------------------------------------------------
create or replace function public.review_bank_transfer(p_order_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  o public.orders;
begin
  if not private.has_permission('payments.verify_bank_transfer') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into o from public.orders
    where id = p_order_id and method = 'bank_transfer' and status = 'under_review' for update;
  if not found then raise exception 'This transfer is not waiting for review' using errcode = 'P0002'; end if;
  if o.student_id = v_uid then
    raise exception 'You can''t review your own payment. Ask another team member, or the Owner can grant access from Students.'
      using errcode = 'IBX01';  -- custom code so the app can show a clear message
  end if;

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

  perform private.audit(
    case when p_approve then 'payment.bank_transfer_approved' else 'payment.bank_transfer_rejected' end,
    'order', p_order_id::text, '{}'::jsonb);
end
$$;
revoke all on function public.review_bank_transfer(uuid, boolean, text) from public, anon;
grant execute on function public.review_bank_transfer(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Video IDs. Until now anyone could read bunny_video_id for every
-- lesson of a published course. The column is now hidden from direct
-- reads and returned by lesson_video_ids() only for lessons the caller
-- may open (team, enrolled, or a free preview lesson).
-- ---------------------------------------------------------------------
revoke select on public.lessons from anon, authenticated;
grant select (
  id, course_id, section_id, type, status, title, description, settings, reading_minutes,
  position, is_preview, video_status, duration_seconds, has_body, created_at, updated_at
) on public.lessons to anon, authenticated;

create or replace function public.lesson_video_ids(p_lesson_ids uuid[])
returns table (lesson_id uuid, video_id text)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.bunny_video_id
  from public.lessons l
  where l.id = any(coalesce(p_lesson_ids, '{}'::uuid[]))
    and l.type = 'video'
    and l.bunny_video_id is not null
    and private.lesson_access(l.id) is not null
$$;
revoke all on function public.lesson_video_ids(uuid[]) from public;
grant execute on function public.lesson_video_ids(uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Audit log: signed-in users can no longer insert rows directly.
-- Server code writes with the service role; database functions use
-- private.audit().
-- ---------------------------------------------------------------------
drop policy if exists "audit_events: users record their own actions" on public.audit_events;
revoke insert on public.audit_events from authenticated;
