drop policy if exists staff_attendance_manage on public.staff_attendance;
create policy staff_attendance_manage on public.staff_attendance for all to authenticated
using (private.has_permission(establishment_id,'staff.manage'))
with check (private.has_permission(establishment_id,'staff.manage'));

drop policy if exists staff_attendance_member on public.staff_attendance;
create policy staff_attendance_member on public.staff_attendance for select to authenticated
using (private.has_permission(establishment_id,'staff.view'));
