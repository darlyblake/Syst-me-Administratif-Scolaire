-- Accélère les recherches par inscription et les contrôles de clés étrangères.
create index if not exists organization_student_assignments_enrollment_fk_idx
  on public.organization_student_assignments(enrollment_id);
create index if not exists organization_student_assignments_establishment_fk_idx
  on public.organization_student_assignments(establishment_id);
