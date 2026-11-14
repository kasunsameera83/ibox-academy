-- =====================================================================
-- iBox Academy — Phase 2a: categories, courses, curriculum, media
-- Run after 20261114000000_foundation.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.course_status as enum
  ('draft', 'in_review', 'changes_requested', 'scheduled', 'published', 'unpublished', 'archived');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced', 'all_levels');
create type public.access_type as enum ('lifetime', 'fixed_days');
create type public.video_status as enum ('none', 'uploading', 'processing', 'ready', 'failed');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.categories (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name             text not null check (char_length(name) between 2 and 80),
  description      text check (char_length(description) <= 500),
  parent_id        uuid references public.categories (id) on delete set null,
  image_path       text,
  sort_order       integer not null default 0,
  is_visible       boolean not null default true,
  seo_title        text check (char_length(seo_title) <= 70),
  seo_description  text check (char_length(seo_description) <= 170),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

create table public.courses (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title            text not null check (char_length(title) between 3 and 120),
  subtitle         text check (char_length(subtitle) <= 200),
  description      text check (char_length(description) <= 10000),
  category_id      uuid references public.categories (id) on delete set null,
  level            public.course_level not null default 'beginner',
  language         text not null default 'en' check (language in ('en', 'si', 'ta')),
  outcomes         text[] not null default '{}',
  audience         text[] not null default '{}',
  prerequisites    text[] not null default '{}',
  thumbnail_path   text,
  price_lkr        numeric(12, 2) check (price_lkr >= 0),
  sale_price_lkr   numeric(12, 2) check (sale_price_lkr >= 0),
  access_type      public.access_type not null default 'lifetime',
  access_days      integer check (access_days between 1 and 3650),
  status           public.course_status not null default 'draft',
  published_at     timestamptz,
  seo_title        text check (char_length(seo_title) <= 70),
  seo_description  text check (char_length(seo_description) <= 170),
  -- Who created it. Ready for external instructors later.
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint courses_access_days_required check (access_type = 'lifetime' or access_days is not null),
  constraint courses_sale_below_price check (sale_price_lkr is null or price_lkr is null or sale_price_lkr < price_lkr)
);
create index courses_category_idx on public.courses (category_id);
create index courses_status_idx on public.courses (status);
create index courses_created_by_idx on public.courses (created_by);
create index courses_updated_by_idx on public.courses (updated_by);

create table public.course_sections (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index course_sections_course_idx on public.course_sections (course_id, position);

create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses (id) on delete cascade,
  section_id        uuid not null references public.course_sections (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 160),
  description       text check (char_length(description) <= 5000),
  position          integer not null default 0,
  is_preview        boolean not null default false,
  bunny_video_id    text,
  video_status      public.video_status not null default 'none',
  duration_seconds  integer not null default 0 check (duration_seconds >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index lessons_course_idx on public.lessons (course_id);
create index lessons_section_idx on public.lessons (section_id, position);

-- updated_at
create trigger categories_set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
  for each row execute function private.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Publishing guard: only users with courses.publish may move a course
-- into or out of a public state, even if they can edit it.
-- (Server/service-role code has no auth.uid() and is not blocked.)
-- ---------------------------------------------------------------------
create or replace function private.guard_course_status()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and (new.status in ('published', 'scheduled', 'unpublished', 'archived')
          or old.status in ('published', 'scheduled'))
     and (select auth.uid()) is not null
     and not private.has_permission('courses.publish') then
    raise exception 'You do not have permission to change the publishing status of this course.'
      using errcode = '42501';
  end if;

  if new.status = 'published' and old.status is distinct from 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end
$$;

create trigger courses_guard_status before update on public.courses
  for each row execute function private.guard_course_status();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.categories      enable row level security;
alter table public.courses         enable row level security;
alter table public.course_sections enable row level security;
alter table public.lessons         enable row level security;

revoke all on public.categories, public.courses, public.course_sections, public.lessons from anon, authenticated;

grant select on public.categories, public.courses, public.course_sections, public.lessons to anon, authenticated;
grant insert, update, delete on public.categories, public.courses, public.course_sections, public.lessons to authenticated;

-- categories
create policy "categories: anyone reads visible"
  on public.categories for select to anon, authenticated
  using (is_visible);
create policy "categories: content team reads all"
  on public.categories for select to authenticated
  using ((select private.has_permission('courses.read')));
create policy "categories: owner manages"
  on public.categories for all to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

-- courses
create policy "courses: anyone reads published"
  on public.courses for select to anon, authenticated
  using (status = 'published');
create policy "courses: content team reads all"
  on public.courses for select to authenticated
  using ((select private.has_permission('courses.read')));
create policy "courses: create drafts"
  on public.courses for insert to authenticated
  with check (status = 'draft' and (select private.has_permission('courses.create')));
create policy "courses: edit"
  on public.courses for update to authenticated
  using ((select private.has_permission('courses.edit')))
  with check ((select private.has_permission('courses.edit')));
create policy "courses: owner deletes drafts"
  on public.courses for delete to authenticated
  using (status = 'draft' and (select private.is_owner()));

-- sections
create policy "course_sections: anyone reads published course"
  on public.course_sections for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));
create policy "course_sections: content team reads all"
  on public.course_sections for select to authenticated
  using ((select private.has_permission('courses.read')));
create policy "course_sections: content team writes"
  on public.course_sections for all to authenticated
  using ((select private.has_permission('courses.edit')))
  with check ((select private.has_permission('courses.edit')));

-- lessons
-- Video IDs are readable for published courses, but playback still needs a
-- short-lived signed token that only the server can create.
create policy "lessons: anyone reads published course"
  on public.lessons for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));
create policy "lessons: content team reads all"
  on public.lessons for select to authenticated
  using ((select private.has_permission('courses.read')));
create policy "lessons: content team writes"
  on public.lessons for all to authenticated
  using ((select private.has_permission('courses.edit')))
  with check ((select private.has_permission('courses.edit')));

-- ---------------------------------------------------------------------
-- Storage: public images (course thumbnails, category images).
-- Paid videos live in Bunny Stream, never here.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-media', 'course-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "course-media: content team reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'course-media' and (select private.has_permission('courses.upload')));
create policy "course-media: content team uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-media' and (select private.has_permission('courses.upload')));
create policy "course-media: content team updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-media' and (select private.has_permission('courses.upload')))
  with check (bucket_id = 'course-media' and (select private.has_permission('courses.upload')));
create policy "course-media: content team deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-media' and (select private.has_permission('courses.upload')));

-- ---------------------------------------------------------------------
-- Starter categories (rename or remove from Owner → Categories)
-- ---------------------------------------------------------------------
insert into public.categories (slug, name, description, sort_order) values
  ('video-content-creation', 'Video & Content Creation', 'Shoot, edit and grow on YouTube, TikTok and Reels.', 1),
  ('design', 'Design', 'Graphic design, UI design and visual skills.', 2),
  ('freelancing-online-work', 'Freelancing & Online Work', 'Find clients and earn online.', 3),
  ('tech-coding', 'Tech & Coding', 'Programming, web development and everyday tech skills.', 4),
  ('english-communication', 'English & Communication', 'Speak, write and present with confidence.', 5),
  ('digital-marketing', 'Digital Marketing', 'Social media, ads and marketing that works.', 6);
