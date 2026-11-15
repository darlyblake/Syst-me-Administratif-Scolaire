create table if not exists public.class_breaks (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  label text not null default 'Récréation',
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_breaks_valid_time check (starts_at < ends_at),
  constraint class_breaks_unique_period unique (class_id, academic_year_id, starts_at, ends_at)
);

create index if not exists class_breaks_establishment_year_class_idx
  on public.class_breaks (establishment_id, academic_year_id, class_id);

create or replace function private.parent_can_view_class_break(
  p_class_id uuid,
  p_establishment_id uuid,
  p_academic_year_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_user_id is not null
    and p_user_id = (select auth.uid())
    and exists (
      select 1
      from public.enrollments en
      join public.student_guardians sg
        on sg.student_id = en.student_id
       and sg.establishment_id = en.establishment_id
       and sg.guardian_user_id = p_user_id
       and sg.active = true
       and sg.can_view_academic = true
      where en.class_id = p_class_id
        and en.establishment_id = p_establishment_id
        and en.academic_year_id = p_academic_year_id
        and en.status::text = 'active'
    );
$function$;

alter table public.class_breaks enable row level security;
grant select, insert, update, delete on public.class_breaks to authenticated;

drop policy if exists "class breaks visible to authorized members and linked parents" on public.class_breaks;
create policy "class breaks visible to authorized members and linked parents"
on public.class_breaks
for select
to authenticated
using (
  private.has_permission(establishment_id, 'academic.manage')
  or private.has_permission(establishment_id, 'classes.view')
  or private.has_permission(establishment_id, 'attendance.read')
  or private.parent_can_view_class_break(class_id, establishment_id, academic_year_id, (select auth.uid()))
);

drop policy if exists "class breaks managed by academic managers" on public.class_breaks;
create policy "class breaks managed by academic managers"
on public.class_breaks
for all
to authenticated
using (
  private.has_permission(establishment_id, 'academic.manage')
  and exists (
    select 1 from public.school_classes sc
    where sc.id = class_breaks.class_id
      and sc.establishment_id = class_breaks.establishment_id
  )
  and exists (
    select 1 from public.academic_years ay
    where ay.id = class_breaks.academic_year_id
      and ay.establishment_id = class_breaks.establishment_id
  )
)
with check (
  private.has_permission(establishment_id, 'academic.manage')
  and exists (
    select 1 from public.school_classes sc
    where sc.id = class_breaks.class_id
      and sc.establishment_id = class_breaks.establishment_id
  )
  and exists (
    select 1 from public.academic_years ay
    where ay.id = class_breaks.academic_year_id
      and ay.establishment_id = class_breaks.establishment_id
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'class_breaks'
     ) then
    alter publication supabase_realtime add table public.class_breaks;
  end if;
end $$;
