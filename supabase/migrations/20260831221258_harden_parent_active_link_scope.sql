-- Parent access must follow the current active guardian association.
-- This prevents a parent from retaining read access after an association is deactivated.

drop policy if exists "Parents view linked students" on public.students;
create policy "Parents view linked students" on public.students
for select to authenticated
using (exists (
  select 1 from public.student_guardians sg
  where sg.student_id = students.id
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
));

drop policy if exists "Parents view linked enrollments" on public.enrollments;
create policy "Parents view linked enrollments" on public.enrollments
for select to authenticated
using (exists (
  select 1 from public.student_guardians sg
  where sg.student_id = enrollments.student_id
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
));

drop policy if exists "Parents view linked grades" on public.grades;
create policy "Parents view linked grades" on public.grades
for select to authenticated
using (exists (
  select 1
  from public.student_guardians sg
  where sg.student_id = grades.student_id
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
    and sg.can_view_academic = true
));

drop policy if exists "Parents view linked attendance" on public.attendance_records;
create policy "Parents view linked attendance" on public.attendance_records
for select to authenticated
using (exists (
  select 1
  from public.student_guardians sg
  where sg.student_id = attendance_records.student_id
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
    and sg.can_view_academic = true
));

drop policy if exists "Parents view linked payments" on public.payments;
create policy "Parents view linked payments" on public.payments
for select to authenticated
using (exists (
  select 1
  from public.enrollments en
  join public.student_guardians sg on sg.student_id = en.student_id
  where en.id = payments.enrollment_id
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
    and sg.can_view_finance = true
));

drop policy if exists "Parents view linked events" on public.school_events;
create policy "Parents view linked events" on public.school_events
for select to authenticated
using (exists (
  select 1
  from public.student_guardians sg
  where sg.establishment_id = school_events.establishment_id
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
));
