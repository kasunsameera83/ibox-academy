-- =====================================================================
-- iBox Academy — assignment reviews.
--   * The team reviews submissions: approve, or request changes with feedback.
--   * The team is alerted when work is submitted; learners when it's reviewed.
-- Run after 20261114070000_learning.sql.
-- =====================================================================

alter type public.notification_kind add value if not exists 'assignment_submitted';
alter type public.notification_kind add value if not exists 'assignment_reviewed';

create index if not exists assignment_submissions_lesson_idx on public.assignment_submissions (lesson_id);

-- ---------------------------------------------------------------------
-- Alert the content team when a learner submits or resubmits.
-- ---------------------------------------------------------------------
create or replace function private.on_assignment_submitted_notify()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_learner text;
  v_lesson text;
  v_course text;
begin
  if tg_op = 'UPDATE' and new.submitted_at is not distinct from old.submitted_at then
    return new;
  end if;
  select coalesce(nullif(btrim(full_name), ''), email, 'A learner') into v_learner from public.profiles where id = new.student_id;
  select l.title, c.title into v_lesson, v_course
    from public.lessons l join public.courses c on c.id = l.course_id where l.id = new.lesson_id;

  perform private.notify_team(
    'assignment_submitted'::public.notification_kind,
    case when tg_op = 'INSERT' then 'New assignment to review' else 'Assignment resubmitted' end,
    v_learner || ' · ' || coalesce(v_lesson, 'Assignment') || ' (' || coalesce(v_course, 'course') || ')',
    '/app/owner/assignments/' || new.id::text,
    'courses.edit'
  );
  return new;
end
$$;
revoke all on function private.on_assignment_submitted_notify() from public;

create trigger assignment_submissions_notify
  after insert or update of submitted_at on public.assignment_submissions
  for each row execute function private.on_assignment_submitted_notify();

-- ---------------------------------------------------------------------
-- Review. Requesting changes reopens the lesson, so the learner resubmits
-- to complete it. A certificate that was already issued is kept.
-- ---------------------------------------------------------------------
create or replace function public.review_assignment(p_submission_id uuid, p_approve boolean, p_feedback text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.assignment_submissions;
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
  v_lesson text;
  v_slug text;
begin
  if not private.has_permission('courses.edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_feedback is not null and char_length(v_feedback) > 5000 then
    raise exception 'Keep feedback under 5,000 characters' using errcode = '22023';
  end if;
  if not p_approve and v_feedback is null then
    raise exception 'Tell the learner what to change' using errcode = '22023';
  end if;

  select * into s from public.assignment_submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found' using errcode = '22023'; end if;

  update public.assignment_submissions
    set status = case when p_approve then 'approved' else 'changes_requested' end::public.submission_status,
        feedback = v_feedback,
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = s.id;

  if not p_approve then
    update public.lesson_progress set completed_at = null
      where student_id = s.student_id and lesson_id = s.lesson_id;
  else
    insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at, last_viewed_at)
    values (s.student_id, s.lesson_id, s.course_id, now(), now())
    on conflict (student_id, lesson_id) do update
      set completed_at = coalesce(public.lesson_progress.completed_at, now());
  end if;
  perform private.refresh_course_progress(s.student_id, s.course_id);

  select l.title, c.slug into v_lesson, v_slug
    from public.lessons l join public.courses c on c.id = l.course_id where l.id = s.lesson_id;
  insert into public.notifications (recipient_id, kind, title, body, link)
  values (
    s.student_id,
    'assignment_reviewed'::public.notification_kind,
    case when p_approve then 'Your assignment was approved' else 'Changes requested on your assignment' end,
    left(coalesce(v_lesson, 'Assignment') || coalesce(': ' || v_feedback, ''), 500),
    '/learn/' || v_slug || '/' || s.lesson_id::text
  );
end
$$;
revoke all on function public.review_assignment(uuid, boolean, text) from public;
grant execute on function public.review_assignment(uuid, boolean, text) to authenticated;
