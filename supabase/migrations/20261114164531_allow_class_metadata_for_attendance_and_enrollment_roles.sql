drop policy if exists classes_member_select on public.school_classes;
create policy classes_member_select on public.school_classes for select to authenticated
using (
  private.has_permission(establishment_id,'classes.view')
  or private.has_permission(establishment_id,'inscriptions.read')
  or private.has_permission(establishment_id,'students.read')
  or private.has_permission(establishment_id,'attendance.read')
);

drop policy if exists cycles_member_select on public.education_cycles;
create policy cycles_member_select on public.education_cycles for select to authenticated
using (
  private.has_permission(establishment_id,'classes.view')
  or private.has_permission(establishment_id,'inscriptions.read')
  or private.has_permission(establishment_id,'students.read')
  or private.has_permission(establishment_id,'attendance.read')
);

drop policy if exists levels_member_select on public.grade_levels;
create policy levels_member_select on public.grade_levels for select to authenticated
using (exists (
  select 1 from public.education_cycles c
  where c.id=grade_levels.cycle_id and (
    private.has_permission(c.establishment_id,'classes.view')
    or private.has_permission(c.establishment_id,'inscriptions.read')
    or private.has_permission(c.establishment_id,'students.read')
    or private.has_permission(c.establishment_id,'attendance.read')
  )
));

drop policy if exists class_subjects_member on public.class_subjects;
create policy class_subjects_member on public.class_subjects for select to authenticated
using (exists (
  select 1 from public.school_classes c
  where c.id=class_subjects.class_id and (
    private.has_permission(c.establishment_id,'classes.view')
    or private.has_permission(c.establishment_id,'attendance.read')
  )
));

drop policy if exists subjects_member on public.subjects;
create policy subjects_member on public.subjects for select to authenticated
using (
  private.has_permission(establishment_id,'classes.view')
  or private.has_permission(establishment_id,'grades.view')
  or private.has_permission(establishment_id,'attendance.read')
);

drop policy if exists timetable_member on public.timetable_slots;
create policy timetable_member on public.timetable_slots for select to authenticated
using (
  private.has_permission(establishment_id,'classes.view')
  or private.has_permission(establishment_id,'attendance.read')
);
