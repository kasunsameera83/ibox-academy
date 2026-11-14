-- =====================================================================
-- iBox Academy — certificate design per course, and certificates only
-- after every assignment is approved.
-- Run after 20261114080000_assignment_reviews.sql.
-- =====================================================================

-- Design chosen by the Owner in the course builder (template, colour, wording, signer).
alter table public.courses
  add column certificate jsonb not null default '{}'::jsonb
  check (jsonb_typeof(certificate) = 'object' and pg_column_size(certificate) <= 4000);

-- ---------------------------------------------------------------------
-- Assignments now complete on approval, not on submission.
-- Existing completions without an approval are reopened. Certificates
-- already issued are kept.
-- ---------------------------------------------------------------------
update public.lesson_progress p
  set completed_at = null
  from public.lessons l
  where l.id = p.lesson_id
    and l.type = 'assignment'
    and p.completed_at is not null
    and not exists (
      select 1 from public.assignment_submissions s
      where s.student_id = p.student_id and s.lesson_id = p.lesson_id and s.status = 'approved'
    );

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
        feedback = null,
        reviewed_by = null,
        reviewed_at = null,
        submitted_at = now();

  -- Waiting for review: the lesson is not complete until the team approves it.
  insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at, last_viewed_at)
  values ((select auth.uid()), l.id, l.course_id, null, now())
  on conflict (student_id, lesson_id) do update set completed_at = null, last_viewed_at = now();

  return private.refresh_course_progress((select auth.uid()), l.course_id);
end
$$;

-- ---------------------------------------------------------------------
-- Progress: issue the certificate only when the course offers one.
-- ---------------------------------------------------------------------
create or replace function private.refresh_course_progress(p_student uuid, p_course uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_total integer;
  v_done integer;
  v_code text;
  v_name text;
  v_enabled boolean;
begin
  select count(*) into v_total from public.lessons where course_id = p_course and status = 'published';
  select count(*) into v_done
    from public.lesson_progress p join public.lessons l on l.id = p.lesson_id
    where p.student_id = p_student and p.course_id = p_course and p.completed_at is not null and l.status = 'published';

  select code into v_code from public.certificates where student_id = p_student and course_id = p_course;
  select coalesce((certificate ->> 'enabled')::boolean, true) into v_enabled from public.courses where id = p_course;

  if v_code is null and v_enabled and v_total > 0 and v_done >= v_total then
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

-- ---------------------------------------------------------------------
-- Verification page also returns the course's certificate design.
-- ---------------------------------------------------------------------
drop function if exists public.verify_certificate(text);
create function public.verify_certificate(p_code text)
returns table (code text, student_name text, course_title text, course_slug text, issued_at timestamptz, design jsonb)
language sql stable security definer set search_path = ''
as $$
  select ce.code, ce.student_name, ce.course_title, c.slug, ce.issued_at, c.certificate
  from public.certificates ce join public.courses c on c.id = ce.course_id
  where ce.code = upper(btrim(p_code));
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;
