-- =====================================================================
-- Academy-wide default certificate (Settings → Certificate).
-- Courses use it unless customised in the course builder. A course that
-- follows the default stores {"useDefault": true, "enabled": ...} (plus
-- any custom design it had, kept for switching back); a course that was
-- never touched stores {} and also follows the default.
-- The default lives in site_settings (key 'certificate_default'), public
-- because everything in it is printed on public certificates anyway.
-- =====================================================================

insert into public.site_settings (key, value, is_public)
values ('certificate_default', '{}'::jsonb, true)
on conflict (key) do nothing;

-- The public verification page gets the design the certificate actually uses.
create or replace function public.verify_certificate(p_code text)
returns table (code text, student_name text, course_title text, course_slug text, issued_at timestamptz, design jsonb)
language sql stable security definer set search_path = ''
as $$
  select ce.code, ce.student_name, ce.course_title, c.slug, ce.issued_at,
    case
      when c.certificate = '{}'::jsonb or c.certificate -> 'useDefault' = 'true'::jsonb then
        coalesce((select s.value from public.site_settings s where s.key = 'certificate_default'), '{}'::jsonb)
        || jsonb_build_object('enabled', coalesce(c.certificate -> 'enabled', 'true'::jsonb))
      else c.certificate
    end
  from public.certificates ce join public.courses c on c.id = ce.course_id
  where ce.code = upper(btrim(p_code));
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;
