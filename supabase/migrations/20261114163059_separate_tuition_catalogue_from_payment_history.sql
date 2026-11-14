create or replace function private.permission_category(p_permission text)
returns text language sql immutable set search_path = ''
as $function$
  select case
    when p_permission in ('students.read','students.view','students.manage','students.create','students.edit','students.delete') then 'students'
    when p_permission like 'enrollments.%' or p_permission like 'inscriptions.%' then 'inscriptions'
    when p_permission in ('payments.read','payments.view','payments.create','payments.manage','payments.refund','finance.view')
      or p_permission = 'tuition.manage' then 'finance'
    when p_permission like 'grades.%' or p_permission like 'notes.%' then 'notes'
    when p_permission like 'attendance.%' or p_permission like 'pointage.%' then 'attendance'
    when p_permission like 'documents.%' then 'documents'
    when p_permission like 'staff.%' or p_permission like 'personnel.%' or p_permission like 'payroll.%' or p_permission like 'salaires.%' then 'personnel'
    when p_permission like 'teachers.%' or p_permission like 'enseignants.%' then 'teachers'
    when p_permission like 'classes.%' or p_permission like 'academic.%' or p_permission like 'planning.%'
      or p_permission like 'subjects.%' or p_permission like 'timetable.%' then 'classes'
    when p_permission like 'dashboard.%' or p_permission in ('events.view','school.events.view') then 'dashboard'
    when p_permission like 'messages.%' or p_permission like 'communication.%' then 'communication'
    when p_permission like 'settings.%' or p_permission in ('school.manage','events.manage','school.events.manage') then 'settings'
    when p_permission in ('users.view','users.manage','members.manage') then 'users.manage'
    when p_permission = 'roles.manage' then 'roles.manage'
    when p_permission like 'reports.%' or p_permission like 'rapports.%' then 'reports'
    when p_permission like 'support.%' then 'support'
    else null
  end;
$function$;

drop policy if exists tuition_member_select on public.tuition_plans;
create policy tuition_member_select on public.tuition_plans for select to authenticated
using (
  private.has_permission(establishment_id,'tuition.view')
  or private.has_permission(establishment_id,'tuition.manage')
  or private.has_permission(establishment_id,'payments.view')
);

drop policy if exists tuition_installment_member_select on public.tuition_plan_installments;
create policy tuition_installment_member_select on public.tuition_plan_installments for select to authenticated
using (exists (
  select 1 from public.tuition_plans p
  where p.id=tuition_plan_installments.tuition_plan_id
    and (
      private.has_permission(p.establishment_id,'tuition.view')
      or private.has_permission(p.establishment_id,'tuition.manage')
      or private.has_permission(p.establishment_id,'payments.view')
    )
));

drop policy if exists options_member on public.student_options;
create policy options_member on public.student_options for select to authenticated
using (
  private.has_permission(establishment_id,'tuition.view')
  or private.has_permission(establishment_id,'tuition.manage')
  or private.has_permission(establishment_id,'payments.view')
);

drop policy if exists enrollment_options_member on public.enrollment_options;
create policy enrollment_options_member on public.enrollment_options for select to authenticated
using (
  private.has_permission(establishment_id,'tuition.view')
  or private.has_permission(establishment_id,'payments.view')
);

CREATE OR REPLACE FUNCTION public.get_tuition_plan(p_tuition_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; v_est uuid;
begin
  select establishment_id into v_est from public.tuition_plans where id=p_tuition_plan_id;
  if v_est is null or not (
    private.has_permission(v_est,'tuition.view')
    or private.has_permission(v_est,'tuition.manage')
  ) then raise exception 'Acces refuse'; end if;
  select to_jsonb(x) into result
  from (
    select tp.*,gl.name as grade_level_name
    from public.tuition_plans tp
    join public.grade_levels gl on gl.id=tp.grade_level_id
    where tp.id=p_tuition_plan_id
  ) x;
  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_tuition_plans(p_establishment_id uuid, p_academic_year_id uuid DEFAULT NULL::uuid, p_grade_level_id uuid DEFAULT NULL::uuid, p_active_only boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  if not (
    private.has_permission(p_establishment_id,'tuition.view')
    or private.has_permission(p_establishment_id,'tuition.manage')
  ) then raise exception 'Acces refuse'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.grade_level_name,x.name),'[]'::jsonb) into result
  from (
    select tp.id,tp.establishment_id,tp.academic_year_id,tp.grade_level_id,tp.name,
      tp.registration_fee,tp.annual_tuition,tp.payment_mode,tp.installment_count,tp.is_active,
      gl.name as grade_level_name
    from public.tuition_plans tp
    join public.grade_levels gl on gl.id=tp.grade_level_id
    where tp.establishment_id=p_establishment_id
      and (p_academic_year_id is null or tp.academic_year_id=p_academic_year_id)
      and (p_grade_level_id is null or tp.grade_level_id=p_grade_level_id)
      and (not p_active_only or tp.is_active)
  ) x;
  return result;
end;
$function$;