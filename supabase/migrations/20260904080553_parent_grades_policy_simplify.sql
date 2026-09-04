drop policy if exists "Parents view linked grades in active establishments" on public.grades;
create policy "Parents view linked grades in active establishments"
on public.grades for select to authenticated
using (
  exists (
    select 1
    from public.student_guardians sg
    join public.assessments a on a.id = grades.assessment_id
    join public.establishments e on e.id = sg.establishment_id
    where sg.student_id = grades.student_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and a.establishment_id = sg.establishment_id
      and e.status = 'active'::public.establishment_status
  )
);
