create or replace function public.get_payment_summary(p_establishment_id uuid, p_academic_year_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'expected', coalesce(sum(s.amount_due),0),
    'paid', coalesce(sum(s.amount_paid),0),
    'remaining', coalesce(sum(s.amount_due-s.amount_paid),0),
    'overdue', coalesce(sum(case when s.status='overdue' and s.payer_type='family' then s.amount_due-s.amount_paid else 0 end),0),
    'paid_schedules', count(*) filter(where s.status='paid' and s.payer_type='family'),
    'pending_schedules', count(*) filter(where s.status in ('pending','partial','overdue') and s.payer_type='family'),
    'family_expected', coalesce(sum(s.amount_due) filter(where s.payer_type='family'),0),
    'family_paid', coalesce(sum(s.amount_paid) filter(where s.payer_type='family'),0),
    'family_remaining', coalesce(sum(s.amount_due-s.amount_paid) filter(where s.payer_type='family'),0),
    'state_expected', coalesce(sum(s.amount_due) filter(where s.payer_type='state'),0),
    'state_paid', coalesce(sum(s.amount_paid) filter(where s.payer_type='state'),0),
    'state_remaining', coalesce(sum(s.amount_due-s.amount_paid) filter(where s.payer_type='state'),0),
    'state_schedules', count(*) filter(where s.payer_type='state')
  )
  from public.payment_schedules s
  join public.enrollments e on e.id=s.enrollment_id
  where e.establishment_id=p_establishment_id
    and (p_academic_year_id is null or e.academic_year_id=p_academic_year_id)
    and private.is_member(p_establishment_id);
$$;
revoke all on function public.get_payment_summary(uuid,uuid) from public;
grant execute on function public.get_payment_summary(uuid,uuid) to authenticated;
