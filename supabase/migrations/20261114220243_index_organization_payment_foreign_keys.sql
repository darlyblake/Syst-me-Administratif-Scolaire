create index if not exists idx_organization_payments_establishment_id
  on public.organization_payments(establishment_id);
create index if not exists idx_organization_payments_academic_year_id
  on public.organization_payments(academic_year_id);
create index if not exists idx_organization_payments_recorded_by
  on public.organization_payments(recorded_by)
  where recorded_by is not null;
