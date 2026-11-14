drop policy if exists "pointage payroll fiches read" on public.pointage_payroll_fiches;
create policy "pointage payroll fiches read" on public.pointage_payroll_fiches for select to authenticated
using (private.has_permission(establishment_id,'staff.view'));
