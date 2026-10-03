create table if not exists public.pointage_payroll_fiches (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null,
  payroll_period_id uuid not null unique,
  starts_on date not null,
  ends_on date not null,
  generated_at timestamptz not null default now(),
  generated_by uuid,
  snapshot jsonb not null default '{}'::jsonb
);

alter table public.pointage_payroll_fiches enable row level security;
revoke all on table public.pointage_payroll_fiches from anon;
grant select on table public.pointage_payroll_fiches to authenticated;

create policy "pointage payroll fiches read" on public.pointage_payroll_fiches
for select to authenticated using (
  private.has_permission(establishment_id,'attendance.manage')
  or private.has_permission(establishment_id,'payments.manage')
);

create or replace function public.pointage_get_payroll_fiche(p_period_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.pointage_payroll_fiches%rowtype;
begin
  select * into v_row from public.pointage_payroll_fiches where payroll_period_id=p_period_id;
  if v_row.id is null then return null; end if;
  if not (private.has_permission(v_row.establishment_id,'attendance.manage') or private.has_permission(v_row.establishment_id,'payments.manage')) then raise exception 'Non autorisé'; end if;
  return jsonb_build_object('id',v_row.id,'payroll_period_id',v_row.payroll_period_id,'starts_on',v_row.starts_on,'ends_on',v_row.ends_on,'generated_at',v_row.generated_at,'snapshot',v_row.snapshot);
end; $$;

grant execute on function public.pointage_get_payroll_fiche(uuid) to authenticated;

-- validate_payroll_period est étendu dans cette migration pour générer le snapshot
-- de la fiche de pointage au moment où l'état de salaire passe à validated.
