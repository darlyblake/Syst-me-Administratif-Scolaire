create or replace function private.teacher_has_grade_level(
  p_establishment_id uuid,p_grade_level_id uuid,p_user_id uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1
    from public.school_classes sc
    join public.class_subjects cs on cs.class_id=sc.id
    join public.teachers t on t.id=cs.teacher_id
    join public.teacher_establishments te on te.teacher_id=t.id
    where sc.establishment_id=p_establishment_id and sc.grade_level_id=p_grade_level_id
      and t.profile_id=p_user_id and t.active=true
      and te.establishment_id=p_establishment_id and te.status='active'
  );
$function$;

create or replace function private.teacher_has_cycle(
  p_establishment_id uuid,p_cycle_id uuid,p_user_id uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1
    from public.school_classes sc
    join public.grade_levels gl on gl.id=sc.grade_level_id
    join public.class_subjects cs on cs.class_id=sc.id
    join public.teachers t on t.id=cs.teacher_id
    join public.teacher_establishments te on te.teacher_id=t.id
    where sc.establishment_id=p_establishment_id and gl.cycle_id=p_cycle_id
      and t.profile_id=p_user_id and t.active=true
      and te.establishment_id=p_establishment_id and te.status='active'
  );
$function$;

revoke all on function private.teacher_has_grade_level(uuid,uuid,uuid) from public,anon;
revoke all on function private.teacher_has_cycle(uuid,uuid,uuid) from public,anon;
grant execute on function private.teacher_has_grade_level(uuid,uuid,uuid) to authenticated,service_role;
grant execute on function private.teacher_has_cycle(uuid,uuid,uuid) to authenticated,service_role;

drop policy if exists teacher_education_cycles_select on public.education_cycles;
create policy teacher_education_cycles_select on public.education_cycles for select to authenticated
using (private.teacher_has_cycle(education_cycles.establishment_id,education_cycles.id,(select auth.uid())));

drop policy if exists teacher_grade_levels_select on public.grade_levels;
create policy teacher_grade_levels_select on public.grade_levels for select to authenticated
using (private.teacher_has_grade_level(
  (select sc.establishment_id from public.school_classes sc where sc.grade_level_id=grade_levels.id limit 1),
  grade_levels.id,(select auth.uid())
));
