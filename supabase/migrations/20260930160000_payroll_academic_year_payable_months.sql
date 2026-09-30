-- Paie : mois payables configurables par année académique.

create table if not exists public.payroll_academic_year_settings (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  payable_months smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(establishment_id, academic_year_id)
);

alter table public.payroll_academic_year_settings enable row level security;

create index if not exists payroll_academic_year_settings_establishment_year_idx
  on public.payroll_academic_year_settings(establishment_id, academic_year_id);

create policy payroll_academic_year_settings_member_select on public.payroll_academic_year_settings
for select using (private.is_member(establishment_id));
create policy payroll_academic_year_settings_member_insert on public.payroll_academic_year_settings
for insert with check (private.is_member(establishment_id));
create policy payroll_academic_year_settings_member_update on public.payroll_academic_year_settings
for update using (private.is_member(establishment_id)) with check (private.is_member(establishment_id));
create policy payroll_academic_year_settings_member_delete on public.payroll_academic_year_settings
for delete using (private.is_member(establishment_id));

create or replace function private.payroll_month_is_configured(
  p_establishment_id uuid,
  p_period_start date,
  p_period_end date
) returns boolean
language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
declare
  y record;
  months smallint[];
begin
  select ay.id into y
  from public.academic_years ay
  where ay.establishment_id=p_establishment_id
    and ay.start_date <= p_period_end
    and ay.end_date >= p_period_start
  order by ay.start_date desc
  limit 1;

  if y.id is null then return false; end if;

  select coalesce(payable_months,'{}'::smallint[]) into months
  from public.payroll_academic_year_settings
  where establishment_id=p_establishment_id and academic_year_id=y.id;

  if months is null then return true; end if;
  return extract(month from p_period_start)::int = any(months);
end;
$$;

create or replace function public.generate_payroll_period(
  p_establishment_id uuid,
  p_starts_on date,
  p_ends_on date
) returns uuid
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
begin
  if not private.payroll_month_is_configured(p_establishment_id,p_starts_on,p_ends_on) then
    raise exception 'Ce mois de paie n''est pas pris en charge pour l''année académique sélectionnée.';
  end if;
  return private.generate_payroll_period(p_establishment_id,p_starts_on,p_ends_on);
end;
$$;

create or replace function private.generate_due_payroll_periods()
returns integer language plpgsql security definer
set search_path=public,private,pg_temp
as $function$
declare
  s record;
  v_start date;
  v_end date;
  v_count integer:=0;
begin
  v_start:=date_trunc('month',current_date-interval '1 month')::date;
  v_end:=(date_trunc('month',current_date)::date-1);

  for s in
    select establishment_id
    from public.payroll_settings
    where auto_generate=true
      and frequency='monthly'
      and period_scope='previous_month'
      and generation_day=extract(day from current_date)
  loop
    if private.payroll_month_is_configured(s.establishment_id,v_start,v_end) then
      perform private.generate_payroll_period(s.establishment_id,v_start,v_end);
      v_count:=v_count+1;
    end if;
  end loop;
  return v_count;
end;
$function$;


-- Par défaut, une année existante reprend tous les mois qui chevauchent sa période.
insert into public.payroll_academic_year_settings(establishment_id,academic_year_id,payable_months)
select ay.establishment_id,ay.id,
       array_agg(distinct extract(month from gs)::int order by extract(month from gs)::int)::smallint[]
from public.academic_years ay
cross join lateral generate_series(
  date_trunc('month',ay.start_date),
  date_trunc('month',ay.end_date),
  interval '1 month'
) gs
group by ay.establishment_id,ay.id
on conflict(establishment_id,academic_year_id) do nothing;
