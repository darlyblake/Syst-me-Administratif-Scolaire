-- Paie : calcul du net, contrôle des paiements, arriérés et génération automatique.

create or replace function private.generate_payroll_period(p_establishment_id uuid, p_starts_on date, p_ends_on date)
returns uuid language plpgsql security definer set search_path=public,private,pg_temp as $function$
declare v_period_id uuid; v_staff record; v_comp record; v_hours numeric(10,2); v_base numeric(14,2);
begin
  insert into public.payroll_periods(establishment_id,name,starts_on,ends_on,status)
  values(p_establishment_id,'Salaire '||to_char(p_starts_on,'TMMonth YYYY'),p_starts_on,p_ends_on,'draft')
  on conflict(establishment_id,name) do nothing;
  select id into v_period_id from public.payroll_periods
  where establishment_id=p_establishment_id and starts_on=p_starts_on and ends_on=p_ends_on limit 1;

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
      into v_hours from public.staff_attendance sa
      where sa.establishment_id=p_establishment_id and sa.staff_type=v_staff.staff_type and sa.staff_id=v_staff.staff_id
        and sa.attendance_date between p_starts_on and p_ends_on
        and sa.status in('present','late','excused');
      v_base:=round(v_hours*v_comp.hourly_rate,2);
    else
      v_base:=coalesce(v_comp.monthly_salary,0);
    end if;

    insert into public.payroll_entries(
      establishment_id,period_id,staff_type,staff_id,base_amount,hours_worked,hourly_rate,
      overtime_amount,bonuses,deductions,net_amount,status
    )
    values(
      p_establishment_id,v_period_id,v_staff.staff_type,v_staff.staff_id,v_base,v_hours,
      case when v_comp.remuneration_type='hourly' then v_comp.hourly_rate else 0 end,
      0,0,0,greatest(0,round(v_base,2)),'draft'
    )
    on conflict(period_id,staff_type,staff_id) do update set
      base_amount=excluded.base_amount,hours_worked=excluded.hours_worked,
      hourly_rate=excluded.hourly_rate,net_amount=excluded.net_amount;
  end loop;
  return v_period_id;
end;$function$;

create or replace function private.record_payroll_payment(
  p_payment_id uuid,p_establishment_id uuid,p_amount numeric,p_payment_date date,
  p_method text,p_reference text,p_notes text,p_allocations jsonb
)
returns uuid language plpgsql security definer set search_path=public,private,pg_temp as $function$
declare v_total numeric:=0; v_available numeric; v_entry_establishment uuid; a record;
begin
  if p_amount<=0 then raise exception 'Le montant du paiement doit être positif.'; end if;
  insert into public.payroll_payments(id,establishment_id,payment_date,amount,payment_method,reference,notes,created_by)
  values(p_payment_id,p_establishment_id,p_payment_date,p_amount,p_method,p_reference,p_notes,auth.uid());

  for a in select x.payroll_entry_id,x.amount
    from jsonb_to_recordset(coalesce(p_allocations,'[]'::jsonb)) as x(payroll_entry_id uuid,amount numeric) loop
    select establishment_id,greatest(0,coalesce(net_amount,0)
      -coalesce((select sum(pa.amount) from payroll_payment_allocations pa where pa.payroll_entry_id=pe.id),0)
      -coalesce((select sum(av.amount) from payroll_advances av where av.target_period_id=pe.period_id
        and av.staff_type=pe.staff_type and av.staff_id=pe.staff_id),0))
    into v_entry_establishment,v_available from payroll_entries pe where pe.id=a.payroll_entry_id;

    if v_entry_establishment is distinct from p_establishment_id then
      raise exception 'La paie sélectionnée n''appartient pas à l''établissement.';
    end if;
    if a.amount<=0 then raise exception 'Le montant d''affectation doit être positif.'; end if;
    if a.amount>v_available then raise exception 'Le montant affecté dépasse le reste disponible de la période.'; end if;

    insert into public.payroll_payment_allocations(payment_id,payroll_entry_id,amount)
    values(p_payment_id,a.payroll_entry_id,a.amount);
    v_total:=v_total+a.amount;
  end loop;

  if round(v_total,2)<>round(p_amount,2) then
    raise exception 'Le total des affectations (%) doit correspondre au paiement (%).',v_total,p_amount;
  end if;
  return p_payment_id;
exception when others then
  delete from public.payroll_payments where id=p_payment_id;
  raise;
end;$function$;

drop view if exists public.v_payroll_state;
create view public.v_payroll_state as
with payment_totals as(
  select ppa.payroll_entry_id,coalesce(sum(ppa.amount),0)::numeric(14,2) amount_paid
  from payroll_payment_allocations ppa group by ppa.payroll_entry_id
),
advance_totals as(
  select pa.target_period_id,pa.staff_type,pa.staff_id,coalesce(sum(pa.amount),0)::numeric(14,2) advances
  from payroll_advances pa group by pa.target_period_id,pa.staff_type,pa.staff_id
),
prior_due as(
  select cur.id current_entry_id,
    coalesce(sum(greatest(0,prev.net_amount
      -coalesce((select sum(x.amount) from payroll_payment_allocations x where x.payroll_entry_id=prev.id),0)
      -coalesce((select sum(a.amount) from payroll_advances a where a.target_period_id=prev.period_id
        and a.staff_type=prev.staff_type and a.staff_id=prev.staff_id),0))),0)::numeric(14,2) arrears
  from payroll_entries cur
  join payroll_periods cp on cp.id=cur.period_id
  join payroll_entries prev on prev.establishment_id=cur.establishment_id
    and prev.staff_type=cur.staff_type and prev.staff_id=cur.staff_id
  join payroll_periods pp on pp.id=prev.period_id and pp.ends_on<cp.starts_on
  group by cur.id
)
select pe.id,pe.establishment_id,pe.period_id,pp.name period_name,pp.starts_on,pp.ends_on,pp.status period_status,
  pe.staff_type,pe.staff_id,ps.employee_number,ps.first_name,ps.last_name,ps.position,
  pe.base_amount,pe.hours_worked,pe.hourly_rate,pe.overtime_amount,pe.bonuses,pe.deductions,
  coalesce(pe.net_amount,0)::numeric(12,2) net_amount,
  coalesce(at.advances,0)::numeric(14,2) advances,
  coalesce(pt.amount_paid,0)::numeric(14,2) amount_paid,
  coalesce(pd.arrears,0)::numeric(14,2) arrears,
  greatest(0,coalesce(pe.net_amount,0)-least(coalesce(pe.net_amount,0),coalesce(at.advances,0))
    -coalesce(pt.amount_paid,0))::numeric(14,2) remaining_amount,
  case
    when greatest(0,coalesce(pe.net_amount,0)-least(coalesce(pe.net_amount,0),coalesce(at.advances,0))-coalesce(pt.amount_paid,0))=0 then 'paid'
    when coalesce(pt.amount_paid,0)>0 or coalesce(at.advances,0)>0 then 'partial'
    when pp.ends_on<current_date then 'overdue'
    else 'pending'
  end payment_status
from payroll_entries pe
join payroll_periods pp on pp.id=pe.period_id
left join v_payroll_staff ps on ps.establishment_id=pe.establishment_id and ps.staff_type=pe.staff_type and ps.staff_id=pe.staff_id
left join advance_totals at on at.target_period_id=pe.period_id and at.staff_type=pe.staff_type and at.staff_id=pe.staff_id
left join payment_totals pt on pt.payroll_entry_id=pe.id
left join prior_due pd on pd.current_entry_id=pe.id;

create or replace function private.generate_due_payroll_periods()
returns integer language plpgsql security definer set search_path=public,private,pg_temp as $function$
declare s record; v_start date; v_end date; v_count integer:=0;
begin
  for s in select establishment_id from public.payroll_settings
    where auto_generate=true and frequency='monthly' and period_scope='previous_month'
      and generation_day=extract(day from current_date) loop
    v_start:=date_trunc('month',current_date-interval '1 month')::date;
    v_end:=(date_trunc('month',current_date)::date-1);
    perform private.generate_payroll_period(s.establishment_id,v_start,v_end);
    v_count:=v_count+1;
  end loop;
  return v_count;
end;$function$;

do $
begin
  if not exists (select 1 from cron.job where jobname='payroll-generate-daily') then
    perform cron.schedule('payroll-generate-daily','0 2 * * *','select private.generate_due_payroll_periods();');
  end if;
end $;
