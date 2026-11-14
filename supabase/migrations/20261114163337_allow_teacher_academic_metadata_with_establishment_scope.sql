-- Teachers may read non-financial academic metadata for their assigned classes only.
create policy teacher_academic_years_select on public.academic_years for select to authenticated
using (exists (
  select 1 from public.teacher_establishments te
  join public.teachers t on t.id=te.teacher_id
  where t.profile_id=(select auth.uid()) and t.active=true
    and te.establishment_id=academic_years.establishment_id and te.status='active'
));

create policy teacher_education_cycles_select on public.education_cycles for select to authenticated
using (exists (
  select 1
  from public.grade_levels gl
  join public.school_classes sc on sc.grade_level_id=gl.id
  join public.class_subjects cs on cs.class_id=sc.id
  join public.teachers t on t.id=cs.teacher_id
  join public.teacher_establishments te on te.teacher_id=t.id
  where gl.cycle_id=education_cycles.id and sc.establishment_id=education_cycles.establishment_id
    and t.profile_id=(select auth.uid()) and t.active=true
    and te.establishment_id=education_cycles.establishment_id and te.status='active'
));

create policy teacher_grade_levels_select on public.grade_levels for select to authenticated
using (exists (
  select 1
  from public.school_classes sc
  join public.class_subjects cs on cs.class_id=sc.id
  join public.teachers t on t.id=cs.teacher_id
  join public.teacher_establishments te on te.teacher_id=t.id
  where sc.grade_level_id=grade_levels.id and sc.establishment_id=te.establishment_id
    and t.profile_id=(select auth.uid()) and t.active=true and te.status='active'
));

create policy teacher_academic_grade_periods_select on public.academic_grade_periods for select to authenticated
using (exists (
  select 1 from public.teacher_establishments te
  join public.teachers t on t.id=te.teacher_id
  where t.profile_id=(select auth.uid()) and t.active=true
    and te.establishment_id=academic_grade_periods.establishment_id and te.status='active'
));

create policy teacher_school_events_select on public.school_events for select to authenticated
using (exists (
  select 1 from public.teacher_establishments te
  join public.teachers t on t.id=te.teacher_id
  where t.profile_id=(select auth.uid()) and t.active=true
    and te.establishment_id=school_events.establishment_id and te.status='active'
));
