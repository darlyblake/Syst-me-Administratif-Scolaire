create index if not exists organization_student_assignments_renewed_from_idx
  on public.organization_student_assignments(renewed_from_assignment_id)
  where renewed_from_assignment_id is not null;
