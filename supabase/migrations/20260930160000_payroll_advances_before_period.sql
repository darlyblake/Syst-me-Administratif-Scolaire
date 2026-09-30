-- Avances de salaire avant génération de l'état
-- Permet de réserver une avance pour un mois futur et de la rattacher
-- automatiquement à la période lorsque l'état de salaire est généré.

alter table public.payroll_advances
  add column if not exists target_period_start date;

update public.payroll_advances pa
set target_period_start = pp.starts_on
from public.payroll_periods pp
where pp.id = pa.target_period_id
  and pa.target_period_start is null;

create index if not exists payroll_advances_target_period_start_idx
  on public.payroll_advances(establishment_id, target_period_start, staff_type, staff_id);

create or replace function private.record_payroll_advance_movement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_account_id uuid;
begin
  select id into v_account_id
  from public.accounting_accounts
  where establishment_id = new.establishment_id
    and code = '571'
    and active = true
  limit 1;

  if v_account_id is null then
    raise exception 'La caisse générale (571) n''est pas configurée.';
  end if;

  insert into public.accounting_transactions(
    establishment_id, account_id, transaction_date, description, amount,
    direction, reference, created_by, source_type, source_id
  )
  values (
    new.establishment_id, v_account_id, new.advance_date,
    'Avance sur salaire', new.amount, 'debit',
    coalesce(new.reference, 'AVS-' || upper(substr(replace(new.id::text,'-',''),1,6))),
    new.created_by, 'payroll_advance', new.id
  );

  return new;
end;
$function$;

drop trigger if exists trg_payroll_advance_financial_movement on public.payroll_advances;
create trigger trg_payroll_advance_financial_movement
after insert on public.payroll_advances
for each row execute function private.record_payroll_advance_movement();

create or replace function public.create_payroll_advance(
  p_establishment_id uuid,
  p_staff_type text,
  p_staff_id uuid,
  p_target_period_id uuid default null,
  p_target_period_start date default null,
  p_amount numeric default 0,
  p_advance_date date default current_date,
  p_method text default 'cash',
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_id uuid := gen_random_uuid();
  v_period_id uuid := p_target_period_id;
  v_target_start date := p_target_period_start;
  v_target_end date;
  v_staff_exists boolean;
  v_year record;
begin
  if not private.is_member(p_establishment_id) then
    raise exception 'Accès refusé';
  end if;

  if p_amount <= 0 then
    raise exception 'Le montant de l''avance doit être positif.';
  end if;

  if p_staff_type not in ('staff','teacher') then
    raise exception 'Type de personnel invalide.';
  end if;

  if p_target_period_id is not null then
    select starts_on, ends_on
      into v_target_start, v_target_end
    from public.payroll_periods
    where id = p_target_period_id
      and establishment_id = p_establishment_id;

    if v_target_start is null then
      raise exception 'La période de salaire sélectionnée est introuvable.';
    end if;
  elsif v_target_start is not null then
    v_target_end := (date_trunc('month', v_target_start::timestamp) + interval '1 month - 1 day')::date;
    v_target_start := date_trunc('month', v_target_start::timestamp)::date;

    select id into v_period_id
    from public.payroll_periods
    where establishment_id = p_establishment_id
      and starts_on = v_target_start
      and ends_on = v_target_end
    limit 1;
  else
    raise exception 'Le mois de récupération de l''avance est obligatoire.';
  end if;

  select exists(
    select 1 from public.v_payroll_staff
    where establishment_id = p_establishment_id
      and staff_type = p_staff_type
      and staff_id = p_staff_id
  ) into v_staff_exists;

  if not v_staff_exists then
    raise exception 'Le membre du personnel sélectionné est introuvable.';
  end if;

  select ay.id, ay.start_date, ay.end_date
    into v_year
  from public.academic_years ay
  where ay.establishment_id = p_establishment_id
    and ay.start_date <= v_target_end
    and ay.end_date >= v_target_start
  order by ay.start_date desc
  limit 1;

  if v_year.id is null then
    raise exception 'Le mois choisi ne correspond à aucune année académique.';
  end if;

  if not private.payroll_month_is_configured(p_establishment_id, v_target_start, v_target_end) then
    raise exception 'Ce mois n''est pas configuré comme mois payable pour l''année académique.';
  end if;

  insert into public.payroll_advances(
    id, establishment_id, staff_type, staff_id, target_period_id,
    target_period_start, amount, advance_date, payment_method,
    reference, notes, created_by
  )
  values(
    v_id, p_establishment_id, p_staff_type, p_staff_id, v_period_id,
    v_target_start, p_amount, p_advance_date, p_method,
    p_reference, p_notes, auth.uid()
  );

  return v_id;
end;
$function$;

create or replace view public.v_payroll_state as
with payment_totals as (
  select ppa.payroll_entry_id,
         coalesce(sum(ppa.amount),0)::numeric(14,2) amount_paid
  from public.payroll_payment_allocations ppa
  group by ppa.payroll_entry_id
),
advance_totals as (
  select pa.target_period_id,
         pa.target_period_start,
         pa.staff_type,
         pa.staff_id,
         coalesce(sum(pa.amount),0)::numeric(14,2) advances
  from public.payroll_advances pa
  group by pa.target_period_id, pa.target_period_start, pa.staff_type, pa.staff_id
),
prior_due as (
  select cur.id current_entry_id,
         coalesce(sum(greatest(
           0,
           prev.net_amount
           - coalesce((select sum(x.amount) from public.payroll_payment_allocations x where x.payroll_entry_id=prev.id),0)
           - coalesce((select sum(a.amount) from public.payroll_advances a where a.target_period_id=prev.period_id and a.staff_type=prev.staff_type and a.staff_id=prev.staff_id),0)
         )),0)::numeric(14,2) arrears
  from public.payroll_entries cur
  join public.payroll_periods cp on cp.id=cur.period_id
  join public.payroll_entries prev on prev.establishment_id=cur.establishment_id
    and prev.staff_type=cur.staff_type and prev.staff_id=cur.staff_id
  join public.payroll_periods pp on pp.id=prev.period_id and pp.ends_on < cp.starts_on
  group by cur.id
)
select pe.id, pe.establishment_id, pe.period_id, pp.name period_name, pp.starts_on, pp.ends_on,
       pp.status period_status, pe.staff_type, pe.staff_id, ps.employee_number,
       ps.first_name, ps.last_name, ps."position",
       pe.base_amount, pe.hours_worked, pe.hourly_rate, pe.overtime_amount,
       pe.bonuses, pe.deductions, coalesce(pe.net_amount,0)::numeric(12,2) net_amount,
       coalesce(at.advances,0)::numeric(14,2) advances,
       coalesce(pt.amount_paid,0)::numeric(14,2) amount_paid,
       coalesce(pd.arrears,0)::numeric(14,2) arrears,
       greatest(0, coalesce(pe.net_amount,0)
         - least(coalesce(pe.net_amount,0), coalesce(at.advances,0))
         - coalesce(pt.amount_paid,0))::numeric(14,2) remaining_amount,
       case
         when greatest(0, coalesce(pe.net_amount,0)
           - least(coalesce(pe.net_amount,0), coalesce(at.advances,0))
           - coalesce(pt.amount_paid,0)) = 0 then 'paid'
         when coalesce(pt.amount_paid,0) > 0 or coalesce(at.advances,0) > 0 then 'partial'
         when pp.ends_on < current_date then 'overdue'
         else 'pending'
       end payment_status
from public.payroll_entries pe
join public.payroll_periods pp on pp.id=pe.period_id
left join public.v_payroll_staff ps
  on ps.establishment_id=pe.establishment_id and ps.staff_type=pe.staff_type and ps.staff_id=pe.staff_id
left join advance_totals at
  on at.staff_type=pe.staff_type and at.staff_id=pe.staff_id
 and (at.target_period_id = pe.period_id or (at.target_period_id is null and at.target_period_start = pp.starts_on))
left join payment_totals pt on pt.payroll_entry_id=pe.id
left join prior_due pd on pd.current_entry_id=pe.id;

create or replace function private.generate_payroll_period(
  p_establishment_id uuid,
  p_starts_on date,
  p_ends_on date
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_period_id uuid; v_staff record; v_comp record; v_hours numeric(10,2); v_base numeric(14,2);
begin
  insert into public.payroll_periods(establishment_id,name,starts_on,ends_on,status)
  values(p_establishment_id,'Salaire '||to_char(p_starts_on,'TMMonth YYYY'),p_starts_on,p_ends_on,'draft')
  on conflict(establishment_id,name) do nothing;

  select id into v_period_id from public.payroll_periods
  where establishment_id=p_establishment_id and starts_on=p_starts_on and ends_on=p_ends_on limit 1;

  update public.payroll_advances
  set target_period_id = v_period_id
  where establishment_id = p_establishment_id
    and target_period_id is null
    and target_period_start = p_starts_on;

  for v_staff in select * from public.v_payroll_staff where establishment_id=p_establishment_id loop
    select * into v_comp from public.staff_compensations c
    where c.establishment_id=p_establishment_id and c.staff_type=v_staff.staff_type and c.staff_id=v_staff.staff_id
      and c.active=true and c.effective_from<=p_ends_on and (c.effective_to is null or c.effective_to>=p_starts_on)
    order by c.effective_from desc limit 1;
    if v_comp.id is null then continue; end if;

    v_hours:=0;
    if v_comp.remuneration_type='hourly' then
      select coalesce(sum(case when sa.check_in is not null and sa.check_out is not null
        then greatest(0,extract(epoch from(sa.check_out-sa.check_in))/3600) else 0 end),0)::numeric(10,2)
      into v_hours
      from public.staff_attendance sa
      where sa.establishment_id=p_establishment_id and sa.staff_type=v_staff.staff_type and sa.staff_id=v_staff.staff_id
        and sa.attendance_date between p_starts_on and p_ends_on
        and sa.status in('present','late','excused');
      v_base:=round(v_hours*v_comp.hourly_rate,2);
    else
      v_base:=coalesce(v_comp.monthly_salary,0);
    end if;

    insert into public.payroll_entries(
      establishment_id,period_id,staff_type,staff_id,base_amount,hours_worked,hourly_rate,
      overtime_amount,bonuses,deductions,status
    )
    values(
      p_establishment_id,v_period_id,v_staff.staff_type,v_staff.staff_id,v_base,v_hours,
      case when v_comp.remuneration_type='hourly' then v_comp.hourly_rate else 0 end,
      0,0,0,'draft'
    )
    on conflict(period_id,staff_type,staff_id) do update set
      base_amount=excluded.base_amount,
      hours_worked=excluded.hours_worked,
      hourly_rate=excluded.hourly_rate;
  end loop;
  return v_period_id;
end;
$function$;
