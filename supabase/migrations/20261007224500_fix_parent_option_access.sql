-- Parent read access for options attached to a linked enrollment.
create policy "Parents view linked enrollment options"
on public.enrollment_options
for select to authenticated
using (
  exists (
    select 1 from public.enrollments en
    join public.student_guardians sg
      on sg.student_id=en.student_id and sg.establishment_id=en.establishment_id
    where en.id=enrollment_options.enrollment_id
      and sg.guardian_user_id=(select auth.uid())
      and sg.active=true and sg.can_view_finance=true
  )
);

create policy "Parents view linked student options"
on public.student_options
for select to authenticated
using (
  exists (
    select 1 from public.enrollment_options eo
    join public.enrollments en on en.id=eo.enrollment_id
    join public.student_guardians sg
      on sg.student_id=en.student_id and sg.establishment_id=en.establishment_id
    where eo.option_id=student_options.id
      and sg.guardian_user_id=(select auth.uid())
      and sg.active=true and sg.can_view_finance=true
  )
);
