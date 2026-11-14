-- =====================================================================
-- iBox Academy — Phase 3b: the learning experience.
--   * Lesson content protection (text bodies only for people with access)
--   * Lesson progress, quiz attempts, assignment submissions
--   * Certificates at 100% completion, with public verification
-- Run after 20261114060000_notifications.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------

-- Active, unexpired enrolment of the signed-in user.
create or replace function private.is_enrolled(p_course_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrolments e
    where e.student_id = (select auth.uid())
      and e.course_id = p_course_id
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;
revoke all on function private.is_enrolled(uuid) from public;
grant execute on function private.is_enrolled(uuid) to authenticated;

-- How the caller may open a lesson: 'team', 'enrolled', 'preview' or null (no access).
create or replace function private.lesson_access(p_lesson_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  l record;
begin
  select ls.course_id, ls.status, ls.type, ls.is_preview, c.status as course_status
    into l
    from public.lessons ls join public.courses c on c.id = ls.course_id
    where ls.id = p_lesson_id;
  if not found then return null; end if;

  if (select auth.uid()) is not null and private.has_permission('courses.read') then
    return 'team';
  end if;
  if l.status <> 'published' then return null; end if;
  if (select auth.uid()) is not null and private.is_enrolled(l.course_id) then
    return 'enrolled';
  end if;
  if l.is_preview and l.course_status = 'published' and l.type in ('video', 'text') then
    return 'preview';
  end if;
  return null;
end
$$;
revoke all on function private.lesson_access(uuid) from public;
grant execute on function private.lesson_access(uuid) to authenticated;

-- Enrolled learners keep reading their course even if it is later unpublished.
create policy "courses: enrolled learners read" on public.courses
  for select to authenticated using (private.is_enrolled(id));
create policy "course_sections: enrolled learners read" on public.course_sections
  for select to authenticated using ((select private.is_enrolled(course_id)));
create policy "lessons: enrolled learners read published" on public.lessons
  for select to authenticated using (status = 'published' and (select private.is_enrolled(course_id)));

-- ---------------------------------------------------------------------
-- Protect lesson text. Until now a text lesson's body could be read
-- through the public API by anyone. The body column is now hidden from
-- direct reads; it is returned by lesson_body() only to people with access.
-- ---------------------------------------------------------------------
alter table public.lessons
  add column has_body boolean generated always as (body is not null and btrim(body) <> '') stored;

revoke select on public.lessons from anon, authenticated;
grant select (
  id, course_id, section_id, type, status, title, description, settings, reading_minutes,
  position, is_preview, bunny_video_id, video_status, duration_seconds, has_body, created_at, updated_at
) on public.lessons to anon, authenticated;

create or replace function public.lesson_body(p_lesson_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_body text;
begin
  if private.lesson_access(p_lesson_id) is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select body into v_body from public.lessons where id = p_lesson_id;
  return v_body;
end
$$;
revoke all on function public.lesson_body(uuid) from public;
grant execute on function public.lesson_body(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------
create table public.lesson_progress (
  student_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  course_id       uuid not null references public.courses (id) on delete cascade,
  completed_at    timestamptz,
  last_viewed_at  timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress (student_id, course_id, last_viewed_at desc);

alter table public.lesson_progress enable row level security;
revoke all on public.lesson_progress from anon, authenticated;
grant select on public.lesson_progress to authenticated;
create policy "lesson_progress: learners read own" on public.lesson_progress
  for select to authenticated using ((select auth.uid()) = student_id);
create policy "lesson_progress: team reads" on public.lesson_progress
  for select to authenticated using ((select private.has_permission('students.read')));

-- ---------------------------------------------------------------------
-- Certificates. Issued once at 100%, and kept even if lessons are added later.
-- ---------------------------------------------------------------------
create table public.certificates (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique
                default ('IBX-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4))),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete restrict,
  student_name  text not null,
  course_title  text not null,
  issued_at     timestamptz not null default now(),
  unique (student_id, course_id)
);

alter table public.certificates enable row level security;
revoke all on public.certificates from anon, authenticated;
grant select on public.certificates to authenticated;
create policy "certificates: learners read own" on public.certificates
  for select to authenticated using ((select auth.uid()) = student_id);
create policy "certificates: team reads" on public.certificates
  for select to authenticated using ((select private.has_permission('students.read')));

-- Public verification page: anyone with the code can confirm it is genuine.
create or replace function public.verify_certificate(p_code text)
returns table (code text, student_name text, course_title text, course_slug text, issued_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select ce.code, ce.student_name, ce.course_title, c.slug, ce.issued_at
  from public.certificates ce join public.courses c on c.id = ce.course_id
  where ce.code = upper(btrim(p_code));
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- Recompute a learner's course progress; issue the certificate at 100%.
-- Returns {done, total, percent, certificate}.
create or replace function private.refresh_course_progress(p_student uuid, p_course uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_total integer;
  v_done integer;
  v_code text;
  v_name text;
begin
  select count(*) into v_total from public.lessons where course_id = p_course and status = 'published';
  select count(*) into v_done
    from public.lesson_progress p join public.lessons l on l.id = p.lesson_id
    where p.student_id = p_student and p.course_id = p_course and p.completed_at is not null and l.status = 'published';

  select code into v_code from public.certificates where student_id = p_student and course_id = p_course;

  if v_code is null and v_total > 0 and v_done >= v_total then
    select coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1), 'Learner') into v_name
      from public.profiles where id = p_student;
    insert into public.certificates (student_id, course_id, student_name, course_title)
      select p_student, p_course, v_name, c.title from public.courses c where c.id = p_course
      on conflict (student_id, course_id) do nothing
      returning code into v_code;
  end if;

  return jsonb_build_object(
    'done', v_done,
    'total', v_total,
    'percent', case when v_total = 0 then 0 else least(100, floor(v_done * 100.0 / v_total)) end,
    'certificate', v_code
  );
end
$$;
revoke all on function private.refresh_course_progress(uuid, uuid) from public;

-- Internal: mark a lesson complete for the caller (must be enrolled).
create or replace function private.complete_lesson(p_lesson_id uuid, p_course_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at, last_viewed_at)
  values ((select auth.uid()), p_lesson_id, p_course_id, now(), now())
  on conflict (student_id, lesson_id) do update
    set completed_at = coalesce(public.lesson_progress.completed_at, now()), last_viewed_at = now();
$$;
revoke all on function private.complete_lesson(uuid, uuid) from public;

-- Remember the last lesson opened (for "Continue learning").
create or replace function public.record_lesson_view(p_lesson_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_course uuid;
begin
  if private.lesson_access(p_lesson_id) is distinct from 'enrolled' then return; end if;
  select course_id into v_course from public.lessons where id = p_lesson_id;
  insert into public.lesson_progress (student_id, lesson_id, course_id, last_viewed_at)
  values ((select auth.uid()), p_lesson_id, v_course, now())
  on conflict (student_id, lesson_id) do update set last_viewed_at = now();
end
$$;
revoke all on function public.record_lesson_view(uuid) from public;
grant execute on function public.record_lesson_view(uuid) to authenticated;

-- Mark video, text and resource lessons complete (or not). Quizzes are
-- completed by passing, assignments by submitting.
create or replace function public.set_lesson_complete(p_lesson_id uuid, p_complete boolean)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.lessons;
begin
  if private.lesson_access(p_lesson_id) is distinct from 'enrolled' then
    raise exception 'Not enrolled' using errcode = '42501';
  end if;
  select * into l from public.lessons where id = p_lesson_id;
  if l.type in ('quiz', 'assignment') then
    raise exception 'This lesson is completed by passing the quiz or submitting the assignment' using errcode = '22023';
  end if;

  if p_complete then
    perform private.complete_lesson(l.id, l.course_id);
  else
    update public.lesson_progress set completed_at = null
      where student_id = (select auth.uid()) and lesson_id = l.id;
  end if;
  return private.refresh_course_progress((select auth.uid()), l.course_id);
end
$$;
revoke all on function public.set_lesson_complete(uuid, boolean) from public;
grant execute on function public.set_lesson_complete(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Quizzes
-- ---------------------------------------------------------------------
create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  correct     integer not null,
  total       integer not null,
  percent     integer not null check (percent between 0 and 100),
  passed      boolean not null,
  answers     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index quiz_attempts_student_idx on public.quiz_attempts (student_id, lesson_id, created_at desc);

alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon, authenticated;
grant select on public.quiz_attempts to authenticated;
create policy "quiz_attempts: learners read own" on public.quiz_attempts
  for select to authenticated using ((select auth.uid()) = student_id);
create policy "quiz_attempts: team reads" on public.quiz_attempts
  for select to authenticated using ((select private.has_permission('students.read')));

-- Questions without the answers.
create or replace function public.get_quiz_questions(p_lesson_id uuid)
returns table (id uuid, prompt text, options jsonb)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if coalesce(private.lesson_access(p_lesson_id), '') not in ('enrolled', 'team') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select q.id, q.prompt, q.options from public.quiz_questions q
    where q.lesson_id = p_lesson_id order by q.position, q.created_at;
end
$$;
revoke all on function public.get_quiz_questions(uuid) from public;
grant execute on function public.get_quiz_questions(uuid) to authenticated;

-- Grade on the server. p_answers = {"<question id>": "<option id>", ...}.
-- The team can try a quiz; only enrolled learners' attempts are saved.
create or replace function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_access text := private.lesson_access(p_lesson_id);
  l public.lessons;
  v_total integer;
  v_correct integer;
  v_percent integer;
  v_pass integer;
  v_passed boolean;
  v_results jsonb;
  v_progress jsonb := null;
begin
  if v_access is null or v_access not in ('enrolled', 'team') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid answers' using errcode = '22023';
  end if;
  select * into l from public.lessons where id = p_lesson_id;
  if l.type <> 'quiz' then raise exception 'Not a quiz' using errcode = '22023'; end if;

  select count(*), count(*) filter (where q.correct_option_id = p_answers ->> q.id::text),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', q.id,
           'chosen', p_answers ->> q.id::text,
           'correct', q.correct_option_id,
           'isCorrect', coalesce(q.correct_option_id = p_answers ->> q.id::text, false),
           'explanation', q.explanation
         ) order by q.position, q.created_at), '[]'::jsonb)
    into v_total, v_correct, v_results
    from public.quiz_questions q where q.lesson_id = p_lesson_id;

  if v_total = 0 then raise exception 'This quiz has no questions' using errcode = '22023'; end if;

  v_percent := round(v_correct * 100.0 / v_total);
  v_pass := least(100, greatest(0, coalesce((l.settings ->> 'passPercent')::integer, 70)));
  v_passed := v_percent >= v_pass;

  if v_access = 'enrolled' then
    insert into public.quiz_attempts (student_id, lesson_id, course_id, correct, total, percent, passed, answers)
    values ((select auth.uid()), l.id, l.course_id, v_correct, v_total, v_percent, v_passed, p_answers);
    if v_passed then
      perform private.complete_lesson(l.id, l.course_id);
    end if;
    v_progress := private.refresh_course_progress((select auth.uid()), l.course_id);
  end if;

  return jsonb_build_object(
    'correct', v_correct, 'total', v_total, 'percent', v_percent,
    'passPercent', v_pass, 'passed', v_passed, 'results', v_results, 'progress', v_progress
  );
end
$$;
revoke all on function public.submit_quiz(uuid, jsonb) from public;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------
create type public.submission_status as enum ('submitted', 'approved', 'changes_requested');

create table public.assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete cascade,
  text_answer   text check (char_length(text_answer) <= 20000),
  file_path     text,
  file_name     text check (char_length(file_name) <= 200),
  status        public.submission_status not null default 'submitted',
  feedback      text check (char_length(feedback) <= 5000),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  submitted_at  timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create index assignment_submissions_review_idx on public.assignment_submissions (status, submitted_at);

alter table public.assignment_submissions enable row level security;
revoke all on public.assignment_submissions from anon, authenticated;
grant select on public.assignment_submissions to authenticated;
create policy "assignment_submissions: learners read own" on public.assignment_submissions
  for select to authenticated using ((select auth.uid()) = student_id);
create policy "assignment_submissions: team reads" on public.assignment_submissions
  for select to authenticated using ((select private.has_permission('courses.read')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment-submissions', 'assignment-submissions', false, 26214400,
  array[
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword', 'text/plain', 'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do nothing;

-- Files live under <user id>/<lesson id>/...
create policy "assignment-submissions: learners upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'assignment-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assignment-submissions: learners read own" on storage.objects for select to authenticated
  using (bucket_id = 'assignment-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assignment-submissions: team reads" on storage.objects for select to authenticated
  using (bucket_id = 'assignment-submissions' and (select private.has_permission('courses.read')));

-- p_keep_file: resubmitting without a new upload keeps the file sent earlier.
create or replace function public.submit_assignment(
  p_lesson_id uuid, p_text text, p_file_path text, p_file_name text, p_keep_file boolean default false
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.lessons;
  v_kinds jsonb;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_path text := nullif(btrim(coalesce(p_file_path, '')), '');
  v_name text := left(nullif(btrim(coalesce(p_file_name, '')), ''), 200);
begin
  if private.lesson_access(p_lesson_id) is distinct from 'enrolled' then
    raise exception 'Not enrolled' using errcode = '42501';
  end if;
  select * into l from public.lessons where id = p_lesson_id;
  if l.type <> 'assignment' then raise exception 'Not an assignment' using errcode = '22023'; end if;

  if v_path is not null then
    if v_path not like ((select auth.uid())::text || '/' || l.id::text || '/%') then
      raise exception 'Invalid file' using errcode = '22023';
    end if;
    v_name := coalesce(v_name, 'Attachment');
  elsif coalesce(p_keep_file, false) then
    select s.file_path, s.file_name into v_path, v_name
      from public.assignment_submissions s
      where s.student_id = (select auth.uid()) and s.lesson_id = l.id;
  else
    v_name := null;
  end if;

  v_kinds := coalesce(l.settings -> 'submission', '["text","file"]'::jsonb);
  if v_text is not null and not v_kinds ? 'text' then v_text := null; end if;
  if v_path is not null and not v_kinds ? 'file' then v_path := null; v_name := null; end if;
  if v_text is null and v_path is null then
    raise exception 'Add your answer before submitting' using errcode = '22023';
  end if;

  insert into public.assignment_submissions (student_id, lesson_id, course_id, text_answer, file_path, file_name)
  values ((select auth.uid()), l.id, l.course_id, v_text, v_path, v_name)
  on conflict (student_id, lesson_id) do update
    set text_answer = excluded.text_answer,
        file_path = excluded.file_path,
        file_name = excluded.file_name,
        status = 'submitted',
        submitted_at = now();

  perform private.complete_lesson(l.id, l.course_id);
  return private.refresh_course_progress((select auth.uid()), l.course_id);
end
$$;
revoke all on function public.submit_assignment(uuid, text, text, text, boolean) from public;
grant execute on function public.submit_assignment(uuid, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Downloadable resources for enrolled learners
-- ---------------------------------------------------------------------
create or replace function public.get_lesson_resources(p_lesson_id uuid)
returns table (id uuid, file_name text, storage_path text, size_bytes bigint, mime_type text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if coalesce(private.lesson_access(p_lesson_id), '') not in ('enrolled', 'team') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select r.id, r.file_name, r.storage_path, r.size_bytes, r.mime_type
    from public.lesson_resources r where r.lesson_id = p_lesson_id order by r.position, r.created_at;
end
$$;
revoke all on function public.get_lesson_resources(uuid) from public;
grant execute on function public.get_lesson_resources(uuid) to authenticated;

create or replace function private.can_read_resource(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_resources r join public.lessons l on l.id = r.lesson_id
    where r.storage_path = p_path and l.status = 'published' and private.is_enrolled(l.course_id)
  );
$$;
revoke all on function private.can_read_resource(text) from public;
grant execute on function private.can_read_resource(text) to authenticated;

create policy "lesson-resources: enrolled learners read" on storage.objects for select to authenticated
  using (bucket_id = 'lesson-resources' and private.can_read_resource(name));
