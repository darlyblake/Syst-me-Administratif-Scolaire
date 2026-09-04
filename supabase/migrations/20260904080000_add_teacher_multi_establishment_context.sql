-- Teacher multi-establishment context
-- A teacher keeps one auth/profile identity and may have multiple active affiliations.
-- The existing teacher_establishments table is the source of the establishment-scoped affiliation.
-- This RPC exposes only the authenticated teacher's active affiliations and never uses
-- user-editable metadata for authorization.

create or replace function public.get_my_teacher_establishments()
returns table (
  establishment_id uuid,
  establishment_name text,
  establishment_code text,
  affiliation_status text,
  teacher_active boolean,
  joined_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    te.establishment_id,
    e.name,
    e.code,
    te.status,
    t.active,
    te.joined_at
  from public.teacher_establishments te
  join public.teachers t on t.id = te.teacher_id
  join public.establishments e on e.id = te.establishment_id
  where t.profile_id = (select auth.uid())
    and te.status = 'active'
    and t.active = true
  order by e.name;
$$;

revoke all on function public.get_my_teacher_establishments() from public;
grant execute on function public.get_my_teacher_establishments() to authenticated;
