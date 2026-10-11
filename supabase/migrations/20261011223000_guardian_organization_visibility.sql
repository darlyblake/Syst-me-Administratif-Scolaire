-- Let a parent see only the name of an organization that covers one of their linked children's fees.
drop policy if exists sponsoring_org_guardian_read on public.sponsoring_organizations;
create policy sponsoring_org_guardian_read on public.sponsoring_organizations
for select to authenticated
using (
  exists (
    select 1
    from public.payment_schedules ps
    join public.enrollments e on e.id=ps.enrollment_id
    join public.student_guardians sg on sg.student_id=e.student_id and sg.establishment_id=e.establishment_id
    where ps.organization_id=sponsoring_organizations.id
      and sg.guardian_user_id=auth.uid()
      and sg.active=true
  )
);
