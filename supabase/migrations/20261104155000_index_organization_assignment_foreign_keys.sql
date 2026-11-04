create index if not exists organization_student_assignments_academic_year_idx
  on public.organization_student_assignments(academic_year_id);
create index if not exists organization_student_assignments_created_by_idx
  on public.organization_student_assignments(created_by)
  where created_by is not null;
