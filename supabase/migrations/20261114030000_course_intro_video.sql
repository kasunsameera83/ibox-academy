-- =====================================================================
-- iBox Academy — course intro video (free trailer on the course page).
-- Run after 20261114020000_lesson_types.sql.
-- =====================================================================
alter table public.courses
  add column intro_video_id         text,
  add column intro_video_status     public.video_status not null default 'none',
  add column intro_duration_seconds integer not null default 0 check (intro_duration_seconds >= 0);
