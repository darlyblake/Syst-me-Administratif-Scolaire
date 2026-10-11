-- Include State-funded schedules in the separate payer view without mixing them into family balances.
create or replace view public.v_finance_organization_coverage_board with (security_invoker=true) as
select e.id as enrollment_id,e.establishment_id,e.student_id,e.class_id,e.academic_year_id,e.funding_source,e.state_expected_amount,e.parent_payable_amount,
  ps.id as schedule_id,ps.installment_number,ps.label,ps.due_date,ps.amount_due,ps.amount_paid,greatest(ps.amount_due-ps.amount_paid,0::numeric) as remaining_amount,ps.status,
  case when ps.status='paid' then 'paid'::text when ps.amount_paid>0 then case when current_date>ps.due_date then 'partial_late'::text else 'partial'::text end when current_date>ps.due_date then 'late'::text else 'pending'::text end as payment_state,
  current_date-ps.due_date as days_overdue,ps.category,ps.payer_type,ps.organization_id,coalesce(o.name,'État') as organization_name,
  s.first_name,s.last_name,s.student_number,c.name as class_name
from public.enrollments e
join public.payment_schedules ps on ps.enrollment_id=e.id
join public.students s on s.id=e.student_id
join public.school_classes c on c.id=e.class_id
left join public.sponsoring_organizations o on o.id=ps.organization_id
where (ps.organization_id is not null and ps.payer_type='other') or ps.payer_type='state';
grant select on public.v_finance_organization_coverage_board to authenticated;
