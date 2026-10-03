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

create or replace function public.validate_payroll_period(p_period_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $function$
declare
  e uuid;
  v_start date;
  v_end date;
  v_snapshot jsonb;
begin
  select establishment_id,starts_on,ends_on into e,v_start,v_end
  from public.payroll_periods where id=p_period_id;

  if e is null or not private.has_permission(e,'payments.manage') then
    raise exception 'Permission refusee';
  end if;

  update public.payroll_periods set status='validated' where id=p_period_id and status='draft';
  update public.payroll_entries set status='validated' where period_id=p_period_id and status='draft';

  select jsonb_build_object(
    'summary',coalesce((select jsonb_agg(to_jsonb(s) order by s.last_name,s.first_name)
      from public.pointage_period_summary(e,v_start,v_end) s),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.attendance_date,d.last_name,d.first_name)
      from public.pointage_daily_report(e,v_start,v_end) d),'[]'::jsonb)
  ) into v_snapshot;

  insert into public.pointage_payroll_fiches(
    establishment_id,payroll_period_id,starts_on,ends_on,generated_at,generated_by,snapshot
  )
  values(e,p_period_id,v_start,v_end,now(),auth.uid(),v_snapshot)
  on conflict(payroll_period_id) do update set
    generated_at=excluded.generated_at,generated_by=excluded.generated_by,snapshot=excluded.snapshot;

  return true;
end $function$;
