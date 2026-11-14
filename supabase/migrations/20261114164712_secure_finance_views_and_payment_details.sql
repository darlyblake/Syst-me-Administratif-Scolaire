-- Payment schedules must be readable/writable through an authorization helper,
-- because finance staff are not automatically allowed to read full enrollment rows.
create or replace function private.can_view_enrollment_finance(p_enrollment_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.enrollments e
    where e.id=p_enrollment_id and private.has_permission(e.establishment_id,'payments.view',p_user_id)
  );
$function$;

create or replace function private.can_manage_enrollment_finance(p_enrollment_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.enrollments e
    where e.id=p_enrollment_id and private.has_permission(e.establishment_id,'payments.manage',p_user_id)
  );
$function$;

revoke all on function private.can_view_enrollment_finance(uuid,uuid) from public,anon;
revoke all on function private.can_manage_enrollment_finance(uuid,uuid) from public,anon;
grant execute on function private.can_view_enrollment_finance(uuid,uuid) to authenticated,service_role;
grant execute on function private.can_manage_enrollment_finance(uuid,uuid) to authenticated,service_role;

drop policy if exists schedule_member_select on public.payment_schedules;
create policy schedule_member_select on public.payment_schedules for select to authenticated
using (private.can_view_enrollment_finance(enrollment_id,(select auth.uid())));

drop policy if exists schedule_finance_write on public.payment_schedules;
create policy schedule_finance_write on public.payment_schedules for all to authenticated
using (private.can_manage_enrollment_finance(enrollment_id,(select auth.uid())))
with check (private.can_manage_enrollment_finance(enrollment_id,(select auth.uid())));

-- Views that expose a limited finance/payroll projection use an explicit permission filter.
create or replace view public.v_finance_student_payment_board as
select e.id as enrollment_id,e.establishment_id,e.student_id,e.class_id,e.academic_year_id,
  e.funding_source,e.state_expected_amount,e.parent_payable_amount,
  ps.id as schedule_id,ps.installment_number,ps.label,ps.due_date,ps.amount_due,ps.amount_paid,
  greatest(ps.amount_due-ps.amount_paid,0::numeric) as remaining_amount,ps.status,
  case when ps.status='paid'::installment_status then 'paid'::text
    when ps.amount_paid>0::numeric then case when current_date>ps.due_date then 'partial_late'::text else 'partial'::text end
    when current_date>ps.due_date then 'late'::text else 'pending'::text end as payment_state,
  current_date-ps.due_date as days_overdue,ps.category,
  s.first_name,s.last_name,s.student_number,c.name as class_name
from public.enrollments e
join public.payment_schedules ps on ps.enrollment_id=e.id
join public.students s on s.id=e.student_id
join public.school_classes c on c.id=e.class_id
where ps.payer_type='family'
  and (
    private.has_permission(e.establishment_id,'payments.view')
    or exists (
      select 1 from public.student_guardians sg
      where sg.student_id=e.student_id and sg.establishment_id=e.establishment_id
        and sg.guardian_user_id=auth.uid() and sg.active=true and sg.can_view_finance=true
    )
  );

alter view public.v_finance_student_payment_board set (security_invoker=false);

create or replace view public.v_finance_organization_coverage_board as
select e.id as enrollment_id,e.establishment_id,e.student_id,e.class_id,e.academic_year_id,
  e.funding_source,e.state_expected_amount,e.parent_payable_amount,
  ps.id as schedule_id,ps.installment_number,ps.label,ps.due_date,ps.amount_due,ps.amount_paid,
  greatest(ps.amount_due-ps.amount_paid,0::numeric) as remaining_amount,ps.status,
  case when ps.status='paid'::installment_status then 'paid'::text
    when ps.amount_paid>0::numeric then case when current_date>ps.due_date then 'partial_late'::text else 'partial'::text end
    when current_date>ps.due_date then 'late'::text else 'pending'::text end as payment_state,
  current_date-ps.due_date as days_overdue,ps.category,ps.payer_type,ps.organization_id,
  coalesce(o.name,'État'::text) as organization_name,
  s.first_name,s.last_name,s.student_number,c.name as class_name
from public.enrollments e
join public.payment_schedules ps on ps.enrollment_id=e.id
join public.students s on s.id=e.student_id
join public.school_classes c on c.id=e.class_id
left join public.sponsoring_organizations o on o.id=ps.organization_id
where ((ps.organization_id is not null and ps.payer_type='other') or ps.payer_type='state')
  and private.has_permission(e.establishment_id,'payments.view');

alter view public.v_finance_organization_coverage_board set (security_invoker=false);

create or replace view public.v_payroll_staff as
select s.establishment_id,'staff'::text as staff_type,s.id as staff_id,s.employee_number,
  s.first_name,s.last_name,s."position",s.active
from public.staff_members s
where s.active=true and private.has_permission(s.establishment_id,'staff.view')
union all
select t.establishment_id,'teacher'::text as staff_type,t.id as staff_id,t.employee_number,
  t.first_name,t.last_name,'Enseignant'::text as "position",t.active
from public.teachers t
where t.active=true and private.has_permission(t.establishment_id,'staff.view');

alter view public.v_payroll_staff set (security_invoker=false);

create or replace view public.v_teacher_pointage_payroll as
select pp.id as period_id,pp.establishment_id,t.id as teacher_id,t.employee_number,t.first_name,t.last_name,
  pp.starts_on,pp.ends_on,coalesce(sum(tla.counted_hours),0::numeric) as hours_worked,
  sc.hourly_rate,coalesce(sum(tla.counted_hours),0::numeric)*coalesce(sc.hourly_rate,0::numeric) as calculated_amount
from public.payroll_periods pp
join public.teachers t on t.establishment_id=pp.establishment_id and t.active=true
left join public.teacher_lesson_attendance tla
  on tla.establishment_id=pp.establishment_id and tla.teacher_id=t.id
  and tla.attendance_date>=pp.starts_on and tla.attendance_date<=pp.ends_on
left join lateral (
  select scomp.hourly_rate from public.staff_compensations scomp
  where scomp.establishment_id=pp.establishment_id and scomp.staff_type='teacher'
    and scomp.staff_id=t.id and scomp.active=true
    and scomp.effective_from<=pp.ends_on
    and (scomp.effective_to is null or scomp.effective_to>=pp.starts_on)
  order by scomp.effective_from desc limit 1
) sc on true
where private.has_permission(pp.establishment_id,'staff.view')
group by pp.id,pp.establishment_id,t.id,t.employee_number,t.first_name,t.last_name,pp.starts_on,pp.ends_on,sc.hourly_rate;

alter view public.v_teacher_pointage_payroll set (security_invoker=false);

create or replace function public.get_finance_payment_details(p_payment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_est uuid; result jsonb;
begin
  select establishment_id into v_est from public.payments where id=p_payment_id;
  if v_est is null or not private.has_permission(v_est,'payments.view') then
    raise exception 'Permission financière requise';
  end if;

  select jsonb_build_object(
    'payment',jsonb_build_object(
      'id',p.id,'payment_date',p.payment_date,'amount',p.amount,'method',p.method,
      'reference',p.reference,'notes',p.notes,'payer_type',p.payer_type,'category',p.category,
      'enrollment_id',p.enrollment_id
    ),
    'enrollment',case when e.id is null then null else jsonb_build_object(
      'id',e.id,'student_id',e.student_id,'class_id',e.class_id,
      'academic_year_id',e.academic_year_id,'enrollment_date',e.enrollment_date,
      'funding_source',e.funding_source
    ) end,
    'student',case when s.id is null then null else jsonb_build_object(
      'id',s.id,'first_name',s.first_name,'last_name',s.last_name,'student_number',s.student_number
    ) end,
    'schoolClass',case when c.id is null then null else jsonb_build_object('id',c.id,'name',c.name,'code',c.code) end,
    'academicYear',case when ay.id is null then null else jsonb_build_object('id',ay.id,'name',ay.name) end,
    'allocations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount',pa.amount,'payment_schedule_id',ps.id,
        'payment_schedules',jsonb_build_object(
          'id',ps.id,'installment_number',ps.installment_number,'label',ps.label,
          'due_date',ps.due_date,'amount_due',ps.amount_due,'category',ps.category,'payer_type',ps.payer_type
        )
      ) order by ps.installment_number)
      from public.payment_allocations pa
      join public.payment_schedules ps on ps.id=pa.payment_schedule_id
      where pa.payment_id=p.id
    ),'[]'::jsonb)
  ) into result
  from public.payments p
  left join public.enrollments e on e.id=p.enrollment_id
  left join public.students s on s.id=e.student_id
  left join public.school_classes c on c.id=e.class_id
  left join public.academic_years ay on ay.id=e.academic_year_id
  where p.id=p_payment_id;
  return result;
end;
$function$;

revoke all on function public.get_finance_payment_details(uuid) from public,anon;
grant execute on function public.get_finance_payment_details(uuid) to authenticated,service_role;

drop policy if exists teachers_payroll_select on public.teachers;
create policy teachers_payroll_select on public.teachers for select to authenticated
using (private.has_permission(establishment_id,'staff.view'));
