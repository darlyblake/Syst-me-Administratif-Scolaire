-- Allow parents to read only subjects and class-subject assignments belonging to linked children.
-- This is required for the parent timetable because timetable_slots references class_subjects,
-- while parents are intentionally not school members.

create policy "Parents view linked class subjects"
on public.class_subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    where en.class_id = class_subjects.class_id
      and en.status = 'active'
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and sg.establishment_id = (
        select c.establishment_id
        from public.school_classes c
        where c.id = class_subjects.class_id
      )
  )
);

create policy "Parents view linked subjects"
on public.subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.class_subjects cs
    join public.enrollments en
      on en.class_id = cs.class_id
     and en.status = 'active'
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    where cs.subject_id = subjects.id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and sg.establishment_id = subjects.establishment_id
  )
);

create policy "Parents view linked tuition plans"
on public.tuition_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    where en.tuition_plan_id = tuition_plans.id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
      and sg.establishment_id = tuition_plans.establishment_id
  )
);
