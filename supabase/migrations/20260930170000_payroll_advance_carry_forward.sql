-- Report automatique des avances supérieures au salaire
-- Le solde d'avance non récupéré est reporté sur les périodes suivantes.

drop view if exists public.v_payroll_state;

create view public.v_payroll_state as
with recursive
payment_totals as (
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
base_rows as (
  select pe.id,
         pe.establishment_id,
         pe.period_id,
         pp.name period_name,
         pp.starts_on,
         pp.ends_on,
         pp.status period_status,
         pe.staff_type,
         pe.staff_id,
         ps.employee_number,
         ps.first_name,
         ps.last_name,
         ps."position",
         pe.base_amount,
         pe.hours_worked,
         pe.hourly_rate,
         pe.overtime_amount,
         pe.bonuses,
         pe.deductions,
         coalesce(pe.net_amount,0)::numeric(12,2) net_amount,
         coalesce(at.advances,0)::numeric(14,2) advances,
         coalesce(pt.amount_paid,0)::numeric(14,2) amount_paid,
         row_number() over (
           partition by pe.establishment_id, pe.staff_type, pe.staff_id
           order by pp.starts_on, pp.ends_on, pe.id
         ) rn
  from public.payroll_entries pe
  join public.payroll_periods pp on pp.id=pe.period_id
  left join public.v_payroll_staff ps
    on ps.establishment_id=pe.establishment_id
   and ps.staff_type=pe.staff_type
   and ps.staff_id=pe.staff_id
  left join advance_totals at
    on at.staff_type=pe.staff_type
   and at.staff_id=pe.staff_id
   and (
     at.target_period_id=pe.period_id
     or (at.target_period_id is null and at.target_period_start=pp.starts_on)
   )
  left join payment_totals pt on pt.payroll_entry_id=pe.id
),
payroll_chain as (
  select b.*,
         0::numeric(14,2) prior_advance_balance,
         greatest(0,b.advances-b.net_amount-b.amount_paid)::numeric(14,2) advance_balance
  from base_rows b
  where b.rn=1

  union all

  select b.*,
         c.advance_balance,
         greatest(
           0,
           c.advance_balance+b.advances-b.net_amount-b.amount_paid
         )::numeric(14,2)
  from payroll_chain c
  join base_rows b
    on b.establishment_id=c.establishment_id
   and b.staff_type=c.staff_type
   and b.staff_id=c.staff_id
   and b.rn=c.rn+1
),
prior_due as (
  select cur.id current_entry_id,
         coalesce(sum(greatest(
           0,
           prev.net_amount
           - coalesce((
               select sum(x.amount)
               from public.payroll_payment_allocations x
               where x.payroll_entry_id=prev.id
             ),0)
           - coalesce((
               select sum(a.amount)
               from public.payroll_advances a
               where a.target_period_id=prev.period_id
                 and a.staff_type=prev.staff_type
                 and a.staff_id=prev.staff_id
             ),0)
         )),0)::numeric(14,2) arrears
  from public.payroll_entries cur
  join public.payroll_periods cp on cp.id=cur.period_id
  join public.payroll_entries prev
    on prev.establishment_id=cur.establishment_id
   and prev.staff_type=cur.staff_type
   and prev.staff_id=cur.staff_id
  join public.payroll_periods pp
    on pp.id=prev.period_id
   and pp.ends_on<cp.starts_on
  group by cur.id
)
select pc.id,
       pc.establishment_id,
       pc.period_id,
       pc.period_name,
       pc.starts_on,
       pc.ends_on,
       pc.period_status,
       pc.staff_type,
       pc.staff_id,
       pc.employee_number,
       pc.first_name,
       pc.last_name,
       pc."position",
       pc.base_amount,
       pc.hours_worked,
       pc.hourly_rate,
       pc.overtime_amount,
       pc.bonuses,
       pc.deductions,
       pc.net_amount,
       pc.advances,
       pc.amount_paid,
       coalesce(pd.arrears,0)::numeric(14,2) arrears,
       pc.prior_advance_balance,
       pc.advance_balance,
       greatest(
         0,
         pc.net_amount-pc.prior_advance_balance-pc.advances-pc.amount_paid
       )::numeric(14,2) remaining_amount,
       case
         when greatest(
           0,
           pc.net_amount-pc.prior_advance_balance-pc.advances-pc.amount_paid
         )=0 and pc.advance_balance>0 then 'advance_excess'
         when greatest(
           0,
           pc.net_amount-pc.prior_advance_balance-pc.advances-pc.amount_paid
         )=0 then 'paid'
         when pc.amount_paid>0
           or pc.advances>0
           or pc.prior_advance_balance>0 then 'partial'
         when pc.ends_on<current_date then 'overdue'
         else 'pending'
       end payment_status
from payroll_chain pc
left join prior_due pd on pd.current_entry_id=pc.id;