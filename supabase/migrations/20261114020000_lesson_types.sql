-- =====================================================================
-- iBox Academy — Phase 2a.2: lesson types, lesson visibility, quizzes,
-- downloadable resources and atomic curriculum reordering.
-- Run after 20261114010000_courses.sql.
-- =====================================================================

create type public.lesson_type as enum ('video', 'text', 'resource', 'quiz', 'assignment');
create type public.lesson_status as enum ('draft', 'published');

alter table public.lessons
  add column type            public.lesson_type   not null default 'video',
  add column status          public.lesson_status not null default 'draft',
  -- Text lesson content, or assignment instructions.
  add column body            text check (char_length(body) <= 50000),
  -- Type-specific settings, e.g. {"passPercent": 70} or {"submission": ["text","file"]}.
  add column settings        jsonb not null default '{}'::jsonb,
  add column reading_minutes integer check (reading_minutes between 0 and 600);

-- Lessons created before this migration were video lessons; keep the ready ones visible.
update public.lessons set status = 'published' where video_status = 'ready';

alter table public.courses add column preview_checked_at timestamptz;

-- Learners only ever see published lessons of published courses.
drop policy "lessons: anyone reads published course" on public.lessons;
create policy "lessons: anyone reads published lessons"
  on public.lessons for select to anon, authenticated
  using (
    status = 'published'
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );

-- ---------------------------------------------------------------------
-- Quiz questions. Correct answers are visible to the content team only;
-- learners will receive questions through the server without answers.
-- ---------------------------------------------------------------------
create table public.quiz_questions (
  id                 uuid primary key default gen_random_uuid(),
  lesson_id          uuid not null references public.lessons (id) on delete cascade,
  position           integer not null default 0,
  prompt             text not null check (char_length(prompt) between 1 and 1000),
  -- [{"id": "a", "text": "..."}]
  options            jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_option_id  text,
  explanation        text check (char_length(explanation) <= 2000),
  created_at         timestamptz not null default now()
);
create index quiz_questions_lesson_idx on public.quiz_questions (lesson_id, position);

alter table public.quiz_questions enable row level security;
revoke all on public.quiz_questions from anon, authenticated;
grant select, insert, update, delete on public.quiz_questions to authenticated;

create policy "quiz_questions: content team reads"
  on public.quiz_questions for select to authenticated
  using ((select private.has_permission('courses.read')));
create policy "quiz_questions: content team writes"
  on public.quiz_questions for all to authenticated
  using ((select private.has_permission('courses.edit')))
  with check ((select private.has_permission('courses.edit')));

-- ---------------------------------------------------------------------
-- Downloadable resources attached to any lesson (private files).
-- Enrolled learners will get short-lived signed links from the server.
-- ---------------------------------------------------------------------
create table public.lesson_resources (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  file_name     text not null check (char_length(file_name) between 1 and 200),
  storage_path  text not null unique,
  size_bytes    bigint not null check (size_bytes >= 0),
  mime_type     text,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id, position);

alter table public.lesson_resources enable row level security;
revoke all on public.lesson_resources from anon, authenticated;
grant select, insert, update, delete on public.lesson_resources to authenticated;

create policy "lesson_resources: content team reads"
  on public.lesson_resources for select to authenticated
  using ((select private.has_permission('courses.read')));
create policy "lesson_resources: content team writes"
  on public.lesson_resources for all to authenticated
  using ((select private.has_permission('courses.upload')))
  with check ((select private.has_permission('courses.upload')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-resources', 'lesson-resources', false, 104857600,
  array[
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
    'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'application/octet-stream'
  ]
)
on conflict (id) do nothing;

create policy "lesson-resources: content team reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'lesson-resources' and (select private.has_permission('courses.upload')));
create policy "lesson-resources: content team uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-resources' and (select private.has_permission('courses.upload')));
create policy "lesson-resources: content team deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-resources' and (select private.has_permission('courses.upload')));

-- ---------------------------------------------------------------------
-- Atomic reorder of a whole curriculum (drag and drop).
-- SECURITY INVOKER: runs with the caller's RLS, so only the content team
-- can change anything. One transaction: all positions change or none do.
-- p_layout = [{"id": "<section uuid>", "lessons": ["<lesson uuid>", ...]}, ...]
-- ---------------------------------------------------------------------
create or replace function public.reorder_curriculum(p_course_id uuid, p_layout jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s jsonb;
  s_index integer := 0;
  l_index integer;
  l_id text;
begin
  if not private.has_permission('courses.edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  for s in select * from jsonb_array_elements(p_layout) loop
    if not exists (
      select 1 from public.course_sections cs
      where cs.id = (s ->> 'id')::uuid and cs.course_id = p_course_id
    ) then
      raise exception 'Section does not belong to this course' using errcode = '22023';
    end if;

    update public.course_sections
      set position = s_index
      where id = (s ->> 'id')::uuid and course_id = p_course_id;

    l_index := 0;
    for l_id in select * from jsonb_array_elements_text(coalesce(s -> 'lessons', '[]'::jsonb)) loop
      update public.lessons
        set position = l_index, section_id = (s ->> 'id')::uuid
        where id = l_id::uuid and course_id = p_course_id;
      l_index := l_index + 1;
    end loop;

    s_index := s_index + 1;
  end loop;
end
$$;

revoke all on function public.reorder_curriculum(uuid, jsonb) from public, anon;
grant execute on function public.reorder_curriculum(uuid, jsonb) to authenticated;
