create or replace view public.v_finance_payment_history
with (security_invoker = true)
as
select
  p.id as payment_id,
  p.establishment_id,
  p.enrollment_id,
  p.payment_date,
  p.amount as payment_amount,
  p.method,
  p.reference,
  p.notes,
  p.recorded_by,
  p.payer_type,
  p.category,
  pa.id as allocation_id,
  pa.amount as allocated_amount,
  ps.id as schedule_id,
  ps.installment_number,
  ps.label as schedule_label,
  ps.due_date,
  ps.amount_due,
  ps.amount_paid,
  ps.status as schedule_status,
  greatest(ps.amount_due - ps.amount_paid, 0::numeric) as schedule_remaining
from public.payments p
join public.payment_allocations pa on pa.payment_id = p.id
join public.payment_schedules ps on ps.id = pa.payment_schedule_id
where p.organization_payment_id is null;
