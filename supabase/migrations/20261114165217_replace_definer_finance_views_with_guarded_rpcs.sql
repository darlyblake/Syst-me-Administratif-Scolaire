create or replace function public.get_finance_student_payment_board(
  p_establishment_id uuid,p_academic_year_id uuid,p_class_id uuid default null,
  p_overdue_only boolean default false,p_today date default current_date
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb;
begin
  if not private.has_permission(p_establishment_id,'payments.view') then
    raise exception 'Permission financière requise';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'enrollment_id',e.id,'establishment_id',e.establishment_id,'student_id',e.student_id,
    'class_id',e.class_id,'academic_year_id',e.academic_year_id,'funding_source',e.funding_source,
    'state_expected_amount',e.state_expected_amount,'parent_payable_amount',e.parent_payable_amount,
    'schedule_id',ps.id,'installment_number',ps.installment_number,'label',ps.label,
    'due_date',ps.due_date,'amount_due',ps.amount_due,'amount_paid',ps.amount_paid,
    'remaining_amount',greatest(ps.amount_due-ps.amount_paid,0::numeric),'status',ps.status,
    'payment_state',case
      when ps.status::text='paid' then 'paid'
      when ps.amount_paid>0 then case when p_today>ps.due_date then 'partial_late' else 'partial' end
      when p_today>ps.due_date then 'late' else 'pending' end,
    'days_overdue',p_today-ps.due_date,'category',ps.category,
    'first_name',s.first_name,'last_name',s.last_name,'student_number',s.student_number,
    'class_name',c.name
  ) order by s.last_name,s.first_name,ps.installment_number),'[]'::jsonb)
  into result
  from public.enrollments e
  join public.payment_schedules ps on ps.enrollment_id=e.id
  join public.students s on s.id=e.student_id
  join public.school_classes c on c.id=e.class_id
  where e.establishment_id=p_establishment_id and e.academic_year_id=p_academic_year_id
    and ps.payer_type='family'
    and (p_class_id is null or e.class_id=p_class_id)
    and (
      not p_overdue_only
      or (greatest(ps.amount_due-ps.amount_paid,0::numeric)>0 and ps.due_date<p_today)
    );
  return result;
end;
$function$;

revoke all on function public.get_finance_student_payment_board(uuid,uuid,uuid,boolean,date) from public,anon;
grant execute on function public.get_finance_student_payment_board(uuid,uuid,uuid,boolean,date) to authenticated,service_role;

create or replace function public.get_finance_organization_coverage_board(
  p_establishment_id uuid,p_academic_year_id uuid,p_organization_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb;
begin
  if not private.has_permission(p_establishment_id,'payments.view') then
    raise exception 'Permission financière requise';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'enrollment_id',e.id,'establishment_id',e.establishment_id,'student_id',e.student_id,
    'class_id',e.class_id,'academic_year_id',e.academic_year_id,'funding_source',e.funding_source,
    'state_expected_amount',e.state_expected_amount,'parent_payable_amount',e.parent_payable_amount,
    'schedule_id',ps.id,'installment_number',ps.installment_number,'label',ps.label,
    'due_date',ps.due_date,'amount_due',ps.amount_due,'amount_paid',ps.amount_paid,
    'remaining_amount',greatest(ps.amount_due-ps.amount_paid,0::numeric),'status',ps.status,
    'payer_type',ps.payer_type,'organization_id',ps.organization_id,
    'organization_name',coalesce(o.name,'État'),'category',ps.category,
    'first_name',s.first_name,'last_name',s.last_name,'student_number',s.student_number,
    'class_name',c.name
  ) order by s.last_name,s.first_name,ps.installment_number),'[]'::jsonb)
  into result
  from public.enrollments e
  join public.payment_schedules ps on ps.enrollment_id=e.id
  join public.students s on s.id=e.student_id
  join public.school_classes c on c.id=e.class_id
  left join public.sponsoring_organizations o on o.id=ps.organization_id
  where e.establishment_id=p_establishment_id and e.academic_year_id=p_academic_year_id
    and ((ps.organization_id is not null and ps.payer_type='other') or ps.payer_type='state')
    and (p_organization_id is null or ps.organization_id=p_organization_id);
  return result;
end;
$function$;

revoke all on function public.get_finance_organization_coverage_board(uuid,uuid,uuid) from public,anon;
grant execute on function public.get_finance_organization_coverage_board(uuid,uuid,uuid) to authenticated,service_role;

-- The public views remain invoker-security; privileged finance projections are served by the guarded RPCs above.
alter view public.v_finance_student_payment_board set (security_invoker=true);
alter view public.v_finance_organization_coverage_board set (security_invoker=true);
alter view public.v_payroll_staff set (security_invoker=true);
alter view public.v_teacher_pointage_payroll set (security_invoker=true);

drop policy if exists teacher_lesson_attendance_staff_select on public.teacher_lesson_attendance;
create policy teacher_lesson_attendance_staff_select on public.teacher_lesson_attendance for select to authenticated
using (private.has_permission(establishment_id,'staff.view'));
