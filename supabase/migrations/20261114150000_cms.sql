-- =====================================================================
-- iBox Academy — website editor (CMS), part 1: pages, versions, media.
--   * Each page has a working draft and a separate published copy, so
--     editing never changes the live site until someone publishes.
--   * Every publish keeps a numbered version that can be restored.
--   * Website images live in a public bucket; their details (alt text,
--     size) are in media_assets so pages can render them accessibly.
--   * All writes go through functions that check cms.* permissions and
--     write to the audit log.
-- Run after 20261114140000_promotion_hardening.sql.
-- =====================================================================

create table public.cms_pages (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$' and char_length(slug) <= 80),
  title             text not null check (char_length(title) between 1 and 120),
  draft             jsonb not null default '{}'::jsonb,
  published         jsonb,
  status            text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  draft_updated_at  timestamptz not null default now(),
  draft_updated_by  uuid references public.profiles (id) on delete set null,
  published_at      timestamptz,
  published_by      uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint cms_pages_draft_size check (pg_column_size(draft) <= 262144),
  constraint cms_pages_published_size check (published is null or pg_column_size(published) <= 262144)
);

create table public.cms_page_versions (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid not null references public.cms_pages (id) on delete cascade,
  version_no    integer not null,
  content       jsonb not null,
  note          text check (char_length(note) <= 200),
  published_at  timestamptz not null default now(),
  published_by  uuid references public.profiles (id) on delete set null,
  unique (page_id, version_no)
);
create index cms_page_versions_page_idx on public.cms_page_versions (page_id, version_no desc);

create table public.media_assets (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path ~ '^[a-f0-9-]{36}\.(jpg|png|webp|avif)$'),
  alt          text not null default '' check (char_length(alt) <= 250),
  width        integer check (width between 1 and 10000),
  height       integer check (height between 1 and 10000),
  mime_type    text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size_bytes   integer not null check (size_bytes between 1 and 5242880),
  file_name    text check (char_length(file_name) <= 200),
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.cms_pages enable row level security;
alter table public.cms_page_versions enable row level security;
alter table public.media_assets enable row level security;
revoke all on public.cms_pages, public.cms_page_versions, public.media_assets from anon, authenticated;

-- Visitors only ever see the published copy. Drafts come through cms_page_for_editor().
grant select (id, slug, title, published, status, published_at) on public.cms_pages to anon, authenticated;
create policy "cms_pages: anyone reads published" on public.cms_pages for select to anon, authenticated
  using (status = 'published' and published is not null);

grant select on public.cms_page_versions to authenticated;
create policy "cms_page_versions: website team reads" on public.cms_page_versions for select to authenticated
  using ((select private.has_permission('cms.read')));

-- Image details are public (the images themselves are public too).
grant select (id, storage_path, alt, width, height, mime_type, size_bytes, file_name, created_at) on public.media_assets to anon, authenticated;
create policy "media_assets: anyone reads" on public.media_assets for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Storage: public website images. Raster images only (no SVG, which can
-- carry scripts). File names are <uuid>.<ext> at the bucket root.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "site-media: website team uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media'
              and name ~ '^[a-f0-9-]{36}\.(jpg|png|webp|avif)$'
              and (select private.has_permission('cms.edit_draft')));
create policy "site-media: website team reads" on storage.objects for select to authenticated
  using (bucket_id = 'site-media' and (select private.has_permission('cms.read')));
create policy "site-media: website team deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and (select private.has_permission('cms.edit_draft')));

-- ---------------------------------------------------------------------
-- Editor data: draft + published + versions for one page.
-- ---------------------------------------------------------------------
create or replace function public.cms_page_for_editor(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  p public.cms_pages;
begin
  if not private.has_permission('cms.read') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into p from public.cms_pages where slug = p_slug;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'title', p.title, 'status', p.status,
    'draft', p.draft, 'published', p.published,
    'draftUpdatedAt', p.draft_updated_at, 'publishedAt', p.published_at,
    'draftUpdatedBy', (select full_name from public.profiles where id = p.draft_updated_by),
    'publishedBy', (select full_name from public.profiles where id = p.published_by),
    'hasUnpublishedChanges', p.published is distinct from p.draft,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'versionNo', v.version_no, 'note', v.note, 'publishedAt', v.published_at,
               'publishedBy', (select full_name from public.profiles where id = v.published_by))
             order by v.version_no desc)
      from (select * from public.cms_page_versions where page_id = p.id order by version_no desc limit 30) v
    ), '[]'::jsonb)
  );
end
$$;
revoke all on function public.cms_page_for_editor(text) from public, anon;
grant execute on function public.cms_page_for_editor(text) to authenticated;

-- ---------------------------------------------------------------------
-- Save the draft. p_expected is the draftUpdatedAt the editor loaded
-- (null for a new page); if someone else saved in between, refuse so
-- their work isn't overwritten.
-- ---------------------------------------------------------------------
create or replace function public.cms_save_draft(p_slug text, p_title text, p_content jsonb, p_expected timestamptz)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  p public.cms_pages;
  v_now timestamptz := clock_timestamp();
begin
  if not private.has_permission('cms.edit_draft') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then raise exception 'Invalid content' using errcode = '22023'; end if;
  if pg_column_size(p_content) > 262144 then raise exception 'This page is too large to save' using errcode = '22023'; end if;

  select * into p from public.cms_pages where slug = p_slug for update;
  if not found then
    insert into public.cms_pages (slug, title, draft, draft_updated_at, draft_updated_by)
    values (p_slug, coalesce(nullif(btrim(p_title), ''), p_slug), p_content, v_now, auth.uid());
    return v_now;
  end if;

  if p_expected is null or date_trunc('milliseconds', p.draft_updated_at) <> date_trunc('milliseconds', p_expected) then
    raise exception 'Someone else changed this page. Reload to see their changes.' using errcode = '40001';
  end if;

  update public.cms_pages
    set draft = p_content, title = coalesce(nullif(btrim(p_title), ''), title),
        draft_updated_at = v_now, draft_updated_by = auth.uid()
    where id = p.id;
  return v_now;
end
$$;
revoke all on function public.cms_save_draft(text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.cms_save_draft(text, text, jsonb, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- Publish the current draft and keep it as a numbered version.
-- ---------------------------------------------------------------------
create or replace function public.cms_publish(p_slug text, p_note text default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  p public.cms_pages;
  v_no integer;
begin
  if not private.has_permission('cms.publish') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into p from public.cms_pages where slug = p_slug for update;
  if not found then raise exception 'Save the page before publishing' using errcode = 'P0002'; end if;

  select coalesce(max(version_no), 0) + 1 into v_no from public.cms_page_versions where page_id = p.id;
  insert into public.cms_page_versions (page_id, version_no, content, note, published_by)
  values (p.id, v_no, p.draft, nullif(left(btrim(coalesce(p_note, '')), 200), ''), auth.uid());

  update public.cms_pages
    set published = p.draft, status = 'published', published_at = now(), published_by = auth.uid()
    where id = p.id;

  perform private.audit('cms.publish', 'cms_page', p.slug, jsonb_build_object('version', v_no));
  return v_no;
end
$$;
revoke all on function public.cms_publish(text, text) from public, anon;
grant execute on function public.cms_publish(text, text) to authenticated;

-- Copy an old version into the draft. Publishing it is a separate step.
create or replace function public.cms_restore_version(p_version_id uuid)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v public.cms_page_versions;
  v_now timestamptz := clock_timestamp();
begin
  if not private.has_permission('cms.edit_draft') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into v from public.cms_page_versions where id = p_version_id;
  if not found then raise exception 'Version not found' using errcode = 'P0002'; end if;
  update public.cms_pages set draft = v.content, draft_updated_at = v_now, draft_updated_by = auth.uid() where id = v.page_id;
  perform private.audit('cms.restore_version', 'cms_page', v.page_id::text, jsonb_build_object('version', v.version_no));
  return v_now;
end
$$;
revoke all on function public.cms_restore_version(uuid) from public, anon;
grant execute on function public.cms_restore_version(uuid) to authenticated;

-- Throw away unpublished changes.
create or replace function public.cms_discard_draft(p_slug text)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if not private.has_permission('cms.edit_draft') then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.cms_pages set draft = published, draft_updated_at = v_now, draft_updated_by = auth.uid()
    where slug = p_slug and published is not null;
  if not found then raise exception 'Nothing has been published yet' using errcode = 'P0002'; end if;
  return v_now;
end
$$;
revoke all on function public.cms_discard_draft(text) from public, anon;
grant execute on function public.cms_discard_draft(text) to authenticated;

-- ---------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------
create or replace function public.cms_register_media(
  p_path text, p_mime text, p_size integer, p_width integer, p_height integer, p_alt text, p_file_name text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.has_permission('cms.edit_draft') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'site-media' and name = p_path) then
    raise exception 'Upload the file first' using errcode = 'P0002';
  end if;
  insert into public.media_assets (storage_path, mime_type, size_bytes, width, height, alt, file_name, uploaded_by)
  values (p_path, p_mime, p_size, p_width, p_height, left(btrim(coalesce(p_alt, '')), 250), left(p_file_name, 200), auth.uid())
  returning id into v_id;
  perform private.audit('media.upload', 'media_asset', v_id::text, '{}'::jsonb);
  return v_id;
end
$$;
revoke all on function public.cms_register_media(text, text, integer, integer, integer, text, text) from public, anon;
grant execute on function public.cms_register_media(text, text, integer, integer, integer, text, text) to authenticated;

create or replace function public.cms_update_media_alt(p_id uuid, p_alt text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_permission('cms.edit_draft') then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.media_assets set alt = left(btrim(coalesce(p_alt, '')), 250) where id = p_id;
  if not found then raise exception 'Image not found' using errcode = 'P0002'; end if;
end
$$;
revoke all on function public.cms_update_media_alt(uuid, text) from public, anon;
grant execute on function public.cms_update_media_alt(uuid, text) to authenticated;

-- Where an image is used (draft or published pages, or old versions).
create or replace function public.cms_media_usage(p_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when private.has_permission('cms.read') then jsonb_build_object(
    'pages', coalesce((select jsonb_agg(distinct p.title) from public.cms_pages p
                       where p.draft::text like '%' || p_id::text || '%' or coalesce(p.published::text, '') like '%' || p_id::text || '%'), '[]'::jsonb),
    'versions', (select count(*) from public.cms_page_versions v where v.content::text like '%' || p_id::text || '%')
  ) end
$$;
revoke all on function public.cms_media_usage(uuid) from public, anon;
grant execute on function public.cms_media_usage(uuid) to authenticated;

-- Remove an image that no live or draft page uses. Returns the storage
-- path so the server can delete the file.
create or replace function public.cms_delete_media(p_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  m public.media_assets;
begin
  if not private.has_permission('cms.edit_draft') then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into m from public.media_assets where id = p_id for update;
  if not found then raise exception 'Image not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.cms_pages p
             where p.draft::text like '%' || p_id::text || '%' or coalesce(p.published::text, '') like '%' || p_id::text || '%') then
    raise exception 'This image is still used on a page. Remove it there first.' using errcode = '23503';
  end if;
  delete from public.media_assets where id = p_id;
  perform private.audit('media.delete', 'media_asset', p_id::text, '{}'::jsonb);
  return m.storage_path;
end
$$;
revoke all on function public.cms_delete_media(uuid) from public, anon;
grant execute on function public.cms_delete_media(uuid) to authenticated;
