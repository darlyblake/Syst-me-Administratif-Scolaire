drop policy if exists "Parents view own guardian links" on public.student_guardians;
create policy "Parents view own active guardian links"
on public.student_guardians for select to authenticated
using (
  guardian_user_id = (select auth.uid())
  and active = true
  and exists (
    select 1 from public.establishments e
    where e.id = student_guardians.establishment_id
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view linked students" on public.students;
create policy "Parents view linked students in active establishments"
on public.students for select to authenticated
using (
  exists (
    select 1 from public.student_guardians sg
    where sg.student_id = students.id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and exists (
        select 1 from public.establishments e
        where e.id = sg.establishment_id
          and e.status = 'active'::public.establishment_status
      )
  )
);

drop policy if exists "Parents view linked enrollments" on public.enrollments;
create policy "Parents view linked enrollments in active establishments"
on public.enrollments for select to authenticated
using (
  exists (
    select 1 from public.student_guardians sg
    where sg.student_id = enrollments.student_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and exists (
        select 1 from public.establishments e
        where e.id = enrollments.establishment_id
          and e.status = 'active'::public.establishment_status
      )
  )
);

drop policy if exists "Parents view linked grades" on public.grades;
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

drop policy if exists "Parents view linked attendance" on public.attendance_records;
create policy "Parents view linked attendance in active establishments"
on public.attendance_records for select to authenticated
using (
  exists (
    select 1 from public.student_guardians sg
    where sg.student_id = attendance_records.student_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and sg.establishment_id = attendance_records.establishment_id
      and exists (
        select 1 from public.establishments e
        where e.id = attendance_records.establishment_id
          and e.status = 'active'::public.establishment_status
      )
  )
);

drop policy if exists "Parents view linked payments" on public.payments;
create policy "Parents view linked payments in active establishments"
on public.payments for select to authenticated
using (
  exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg on sg.student_id = en.student_id and sg.establishment_id = en.establishment_id
    where en.id = payments.enrollment_id
      and payments.establishment_id = en.establishment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
      and exists (
        select 1 from public.establishments e
        where e.id = payments.establishment_id
          and e.status = 'active'::public.establishment_status
      )
  )
);
