-- Les agents autorisés à gérer les inscriptions doivent aussi pouvoir rechercher
-- les groupes familiaux et leurs liens, sans élargir l'accès hors établissement.
drop policy if exists school_families_read on public.school_families;
create policy school_families_read
on public.school_families
for select to authenticated
using (
  private.has_permission(establishment_id, 'students.read')
  or private.has_permission(establishment_id, 'payments.read')
  or private.has_permission(establishment_id, 'enrollments.manage')
);

drop policy if exists student_family_members_read on public.student_family_members;
create policy student_family_members_read
on public.student_family_members
for select to authenticated
using (
  private.has_permission(establishment_id, 'students.read')
  or private.has_permission(establishment_id, 'payments.read')
  or private.has_permission(establishment_id, 'enrollments.manage')
);