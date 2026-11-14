create or replace function private.teacher_has_class(p_class_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1
    from public.class_subjects cs
    join public.teachers t on t.id=cs.teacher_id
    join public.teacher_establishments te on te.teacher_id=t.id
    where cs.class_id=p_class_id and t.profile_id=p_user_id and t.active=true
      and te.status='active'
  );
$function$;
revoke all on function private.teacher_has_class(uuid,uuid) from public,anon;
grant execute on function private.teacher_has_class(uuid,uuid) to authenticated,service_role;

create or replace function public.get_academic_structure(
  p_establishment_id uuid,p_academic_year_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb; v_general_access boolean;
begin
  v_general_access :=
    private.has_permission(p_establishment_id,'classes.view')
    or private.has_permission(p_establishment_id,'inscriptions.read')
    or private.has_permission(p_establishment_id,'students.read')
    or private.has_permission(p_establishment_id,'attendance.read')
    or private.has_permission(p_establishment_id,'tuition.view');

  if not v_general_access and not exists (
    select 1 from public.education_cycles c
    where c.establishment_id=p_establishment_id
      and private.teacher_has_cycle(p_establishment_id,c.id,auth.uid())
  ) then raise exception 'Accès refusé'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.name,'code',c.code,'display_order',c.display_order,
    'levels',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',g.id,'name',g.name,'code',g.code,'display_order',g.display_order,
        'classes',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',sc.id,'name',sc.name,'code',sc.code,'capacity',sc.capacity,'active',sc.active
          ) order by sc.name)
          from public.school_classes sc
          where sc.grade_level_id=g.id and sc.establishment_id=p_establishment_id
            and sc.active and (v_general_access or private.teacher_has_class(sc.id,auth.uid()))
        ),'[]'::jsonb)
      ) order by g.display_order,g.name)
      from public.grade_levels g
      where g.cycle_id=c.id and g.active
        and (v_general_access or private.teacher_has_grade_level(p_establishment_id,g.id,auth.uid()))
    ),'[]'::jsonb)
  ) order by c.display_order,c.name),'[]'::jsonb)
  into result
  from public.education_cycles c
  where c.establishment_id=p_establishment_id and c.active
    and (v_general_access or private.teacher_has_cycle(p_establishment_id,c.id,auth.uid()));
  return result;
end;
$function$;

create or replace function public.get_academic_structure()
returns jsonb language sql stable security definer set search_path = ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ec.id,'establishment_id',ec.establishment_id,'name',ec.name,'code',ec.code,
    'sort_order',ec.display_order,'is_active',ec.active,
    'grade_levels',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',gl.id,'cycle_id',gl.cycle_id,'name',gl.name,'code',gl.code,
        'sort_order',gl.display_order,'is_active',gl.active,
        'classes',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',sc.id,'grade_level_id',sc.grade_level_id,'name',sc.name,'code',sc.code,'is_active',sc.active
          ) order by sc.name)
          from public.school_classes sc
          where sc.grade_level_id=gl.id and sc.establishment_id=ec.establishment_id and sc.active
            and (
              private.has_permission(ec.establishment_id,'classes.view')
              or private.has_permission(ec.establishment_id,'inscriptions.read')
              or private.has_permission(ec.establishment_id,'students.read')
              or private.has_permission(ec.establishment_id,'attendance.read')
              or private.has_permission(ec.establishment_id,'tuition.view')
              or private.teacher_has_class(sc.id,auth.uid())
            )
        ),'[]'::jsonb)
      ) order by gl.display_order)
      from public.grade_levels gl
      where gl.cycle_id=ec.id and gl.active
        and (
          private.has_permission(ec.establishment_id,'classes.view')
          or private.has_permission(ec.establishment_id,'inscriptions.read')
          or private.has_permission(ec.establishment_id,'students.read')
          or private.has_permission(ec.establishment_id,'attendance.read')
          or private.has_permission(ec.establishment_id,'tuition.view')
          or private.teacher_has_grade_level(ec.establishment_id,gl.id,auth.uid())
        )
    ),'[]'::jsonb)
  ) order by ec.display_order),'[]'::jsonb)
  from public.education_cycles ec
  where ec.active and (
    private.has_permission(ec.establishment_id,'classes.view')
    or private.has_permission(ec.establishment_id,'inscriptions.read')
    or private.has_permission(ec.establishment_id,'students.read')
    or private.has_permission(ec.establishment_id,'attendance.read')
    or private.has_permission(ec.establishment_id,'tuition.view')
    or private.teacher_has_cycle(ec.establishment_id,ec.id,auth.uid())
  );
$function$;

create or replace function public.list_education_cycles(p_establishment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb; v_general boolean;
begin
  v_general :=
    private.has_permission(p_establishment_id,'classes.view')
    or private.has_permission(p_establishment_id,'inscriptions.read')
    or private.has_permission(p_establishment_id,'students.read')
    or private.has_permission(p_establishment_id,'attendance.read')
    or private.has_permission(p_establishment_id,'tuition.view');
  if not v_general and not exists (
    select 1 from public.education_cycles c
    where c.establishment_id=p_establishment_id
      and private.teacher_has_cycle(p_establishment_id,c.id,auth.uid())
  ) then raise exception 'Accès refusé'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_order),'[]'::jsonb) into result
  from (
    select c.id,c.name,c.code,c.display_order as sort_order,c.active as is_active
    from public.education_cycles c
    where c.establishment_id=p_establishment_id and c.active
      and (v_general or private.teacher_has_cycle(p_establishment_id,c.id,auth.uid()))
  ) x;
  return result;
end;
$function$;

create or replace function public.list_grade_levels(p_cycle_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_est uuid; result jsonb; v_general boolean;
begin
  select establishment_id into v_est from public.education_cycles where id=p_cycle_id;
  if v_est is null then raise exception 'Cycle introuvable'; end if;
  v_general :=
    private.has_permission(v_est,'classes.view')
    or private.has_permission(v_est,'inscriptions.read')
    or private.has_permission(v_est,'students.read')
    or private.has_permission(v_est,'attendance.read')
    or private.has_permission(v_est,'tuition.view');
  if not v_general and not private.teacher_has_cycle(v_est,p_cycle_id,auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_order),'[]'::jsonb) into result
  from (
    select gl.id,gl.cycle_id,gl.name,gl.code,gl.display_order as sort_order,gl.active as is_active
    from public.grade_levels gl where gl.cycle_id=p_cycle_id and gl.active
      and (v_general or private.teacher_has_grade_level(v_est,gl.id,auth.uid()))
  ) x;
  return result;
end;
$function$;

create or replace function public.list_school_classes(p_grade_level_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_est uuid; result jsonb; v_general boolean;
begin
  select ec.establishment_id into v_est
  from public.grade_levels gl join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=p_grade_level_id;
  if v_est is null then raise exception 'Niveau introuvable'; end if;
  v_general :=
    private.has_permission(v_est,'classes.view')
    or private.has_permission(v_est,'inscriptions.read')
    or private.has_permission(v_est,'students.read')
    or private.has_permission(v_est,'attendance.read')
    or private.has_permission(v_est,'tuition.view');
  if not v_general and not private.teacher_has_grade_level(v_est,p_grade_level_id,auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) into result
  from (
    select sc.id,sc.grade_level_id,sc.name,sc.code,sc.active as is_active
    from public.school_classes sc
    where sc.grade_level_id=p_grade_level_id and sc.establishment_id=v_est and sc.active
      and (v_general or private.teacher_has_class(sc.id,auth.uid()))
  ) x;
  return result;
end;
$function$;

create or replace function public.get_financial_overview(p_establishment_id uuid,p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb;
begin
  if not private.has_permission(p_establishment_id,'payments.view') then
    raise exception 'Permission financière requise';
  end if;
  select jsonb_build_object(
    'student_payments',(select coalesce(sum(amount),0) from public.payments where establishment_id=p_establishment_id and payment_date::date between p_from and p_to),
    'expenses',(select coalesce(sum(amount),0) from public.expenses where establishment_id=p_establishment_id and expense_date between p_from and p_to),
    'payroll',case when private.has_permission(p_establishment_id,'staff.view')
      then (select coalesce(sum(net_amount),0) from public.payroll_entries pe join public.payroll_periods pp on pp.id=pe.period_id where pe.establishment_id=p_establishment_id and pp.starts_on<=p_to and pp.ends_on>=p_from)
      else null end,
    'transactions',(select count(*) from public.accounting_transactions where establishment_id=p_establishment_id and transaction_date between p_from and p_to)
  ) into result;
  return result;
end;
$function$;

create or replace function public.get_school_dashboard(p_establishment_id uuid,p_academic_year_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare y uuid:=p_academic_year_id; result jsonb;
begin
  if not private.has_permission(p_establishment_id,'dashboard.view') then
    raise exception 'Accès au tableau de bord refusé';
  end if;
  if y is null then
    select id into y from public.academic_years
    where establishment_id=p_establishment_id and status='active' limit 1;
  end if;

  select jsonb_build_object(
    'students',case when private.has_permission(p_establishment_id,'students.read')
      then (select count(*) from public.students where establishment_id=p_establishment_id and active) else null end,
    'teachers',case when private.has_permission(p_establishment_id,'teachers.view')
      then (select count(*) from public.teachers where establishment_id=p_establishment_id and active) else null end,
    'staff',case when private.has_permission(p_establishment_id,'staff.view')
      then (select count(*) from public.staff_members where establishment_id=p_establishment_id and active) else null end,
    'classes',case when private.has_permission(p_establishment_id,'classes.view')
      or private.has_permission(p_establishment_id,'inscriptions.read')
      or private.has_permission(p_establishment_id,'students.read')
      or private.has_permission(p_establishment_id,'attendance.read')
      then (select count(*) from public.school_classes where establishment_id=p_establishment_id and active) else null end,
    'enrollments',case when private.has_permission(p_establishment_id,'inscriptions.read')
      then (select count(*) from public.enrollments where establishment_id=p_establishment_id and academic_year_id=y and status='active') else null end,
    'payments_total',case when private.has_permission(p_establishment_id,'payments.view')
      then (select coalesce(sum(amount),0) from public.payments where establishment_id=p_establishment_id and payment_date::date >= coalesce((select start_date from public.academic_years where id=y),current_date))
      else null end,
    'overdue_schedules',case when private.has_permission(p_establishment_id,'payments.view')
      then (select count(*) from public.payment_schedules s join public.enrollments e on e.id=s.enrollment_id where e.establishment_id=p_establishment_id and s.status='overdue')
      else null end
  ) into result;
  return result;
end;
$function$;
