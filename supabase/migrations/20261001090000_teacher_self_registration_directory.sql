-- Teacher self-registration directory and account-type guard
create or replace function public.list_active_establishments_for_teacher()
returns table(id uuid, name text, short_name text, city text, code text)
language sql
security definer
set search_path = public, private
as $$
  select e.id, e.name, e.short_name, e.city, e.code
  from public.establishments e
  where e.status = 'active'
  order by e.name;
$$;

revoke all on function public.list_active_establishments_for_teacher() from public;
grant execute on function public.list_active_establishments_for_teacher() to authenticated;

drop policy if exists teachers_self_insert on public.teachers;
create policy teachers_self_insert on public.teachers
for insert to authenticated
with check (
  profile_id = auth.uid()
  and establishment_id is null
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'teacher'
  )
);

drop policy if exists teachers_self_update on public.teachers;
create policy teachers_self_update on public.teachers
for update to authenticated
using (profile_id = auth.uid())
with check (
  profile_id = auth.uid()
  and establishment_id is null
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'teacher'
  )
);
