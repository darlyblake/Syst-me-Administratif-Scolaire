-- Close financial-data RPCs that bypassed the newly hardened table policies.

create or replace function public.get_payment_summary(
  p_establishment_id uuid,
  p_academic_year_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb;
begin
  if not private.has_permission(p_establishment_id,'payments.view') then
    raise exception 'Permission refusee';
  end if;

  select jsonb_build_object(
    'expected',coalesce(sum(s.amount_due),0),
    'paid',coalesce(sum(s.amount_paid),0),
    'remaining',coalesce(sum(s.amount_due-s.amount_paid),0),
    'overdue',coalesce(sum(case when s.status='overdue' and s.payer_type='family' then s.amount_due-s.amount_paid else 0 end),0),
    'paid_schedules',count(*) filter(where s.status='paid' and s.payer_type='family'),
    'pending_schedules',count(*) filter(where s.status in ('pending','partial','overdue') and s.payer_type='family'),
    'family_expected',coalesce(sum(s.amount_due) filter(where s.payer_type='family'),0),
    'family_paid',coalesce(sum(s.amount_paid) filter(where s.payer_type='family'),0),
    'family_remaining',coalesce(sum(s.amount_due-s.amount_paid) filter(where s.payer_type='family'),0),
    'state_expected',coalesce(sum(s.amount_due) filter(where s.payer_type='state'),0),
    'state_paid',coalesce(sum(s.amount_paid) filter(where s.payer_type='state'),0),
    'state_remaining',coalesce(sum(s.amount_due-s.amount_paid) filter(where s.payer_type='state'),0),
    'state_schedules',count(*) filter(where s.payer_type='state')
  ) into result
  from public.payment_schedules s
  join public.enrollments e on e.id=s.enrollment_id
  where e.establishment_id=p_establishment_id
    and (p_academic_year_id is null or e.academic_year_id=p_academic_year_id);
  return result;
end;
$function$;

create or replace function public.get_state_finance_settings(p_establishment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare r public.establishment_finance_settings;
begin
  if not private.has_permission(p_establishment_id,'payments.view') then raise exception 'Permission refusee'; end if;
  select * into r from public.establishment_finance_settings where establishment_id=p_establishment_id;
  if r.id is null then
    return jsonb_build_object(
      'establishment_id',p_establishment_id,'state_students_enabled',false,
      'state_covers_registration',true,'state_covers_tuition',true,
      'state_allows_family_options',true,'state_allows_caution',false,
      'state_caution_default_amount',0,'state_caution_refundable',true
    );
  end if;
  return to_jsonb(r);
end;
$function$;

create or replace function public.get_tuition_plan(p_tuition_plan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb; v_est uuid;
begin
  select establishment_id into v_est from public.tuition_plans where id=p_tuition_plan_id;
  if v_est is null or not (
    private.has_permission(v_est,'payments.view')
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

create or replace function public.list_tuition_plans(
  p_establishment_id uuid,
  p_academic_year_id uuid default null,
  p_grade_level_id uuid default null,
  p_active_only boolean default true
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb;
begin
  if not (
    private.has_permission(p_establishment_id,'payments.view')
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

create or replace function public.create_tuition_plan(
  p_establishment_id uuid,p_academic_year_id uuid,p_grade_level_id uuid,p_name text,
  p_registration_fee numeric,p_annual_tuition numeric,p_payment_mode text,
  p_installment_count integer default null
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_id uuid; v_est uuid; v_year public.academic_years; v_count integer;
begin
  if not private.has_permission(p_establishment_id,'tuition.manage') then
    raise exception 'Permission refusee';
  end if;
  if p_payment_mode not in ('single','monthly','installments') then raise exception 'Mode de paiement invalide'; end if;
  if p_registration_fee<0 or p_annual_tuition<0 then raise exception 'Montant invalide'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Nom obligatoire'; end if;

  select ec.establishment_id into v_est
  from public.grade_levels gl join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=p_grade_level_id;
  if v_est is distinct from p_establishment_id then raise exception 'Niveau hors etablissement'; end if;

  select * into v_year from public.academic_years
  where id=p_academic_year_id and establishment_id=p_establishment_id;
  if v_year.id is null then raise exception 'Annee scolaire introuvable'; end if;

  if exists (
    select 1 from public.tuition_plans
    where academic_year_id=p_academic_year_id and grade_level_id=p_grade_level_id and active
  ) then raise exception 'Un plan actif existe deja pour ce niveau et cette annee'; end if;

  if p_payment_mode='single' then
    v_count:=1;
  elsif p_payment_mode='monthly' then
    v_count:=(extract(year from age(v_year.end_date,v_year.start_date))::integer*12)
      +extract(month from age(v_year.end_date,v_year.start_date))::integer+1;
    if v_count<1 or v_count>12 then raise exception 'Nombre de mensualites invalide: %',v_count; end if;
  else
    if p_installment_count is null or p_installment_count<2 or p_installment_count>24 then
      raise exception 'Pour les tranches, le nombre doit etre compris entre 2 et 24';
    end if;
    v_count:=p_installment_count;
  end if;

  insert into public.tuition_plans(
    establishment_id,academic_year_id,grade_level_id,name,registration_fee,annual_tuition,
    payment_mode,installment_count,active,billing_start_date,billing_end_date,enrollment_payment_priority
  ) values (
    p_establishment_id,p_academic_year_id,p_grade_level_id,trim(p_name),p_registration_fee,
    p_annual_tuition,p_payment_mode,v_count,true,
    case when p_payment_mode='monthly' then v_year.start_date else null end,
    case when p_payment_mode='monthly' then v_year.end_date else null end,'schedule_order'
  ) returning id into v_id;

  if p_payment_mode in ('single','monthly') then
    perform private.rebuild_tuition_plan_installments(v_id,'[]'::jsonb,v_year.start_date,v_year.end_date);
  end if;
  return v_id;
end;
$function$;

create or replace function public.pointage_get_payroll_fiche(p_period_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_row public.pointage_payroll_fiches%rowtype;
begin
  select * into v_row from public.pointage_payroll_fiches where payroll_period_id=p_period_id;
  if v_row.id is null then return null; end if;
  if not private.has_permission(v_row.establishment_id,'staff.view') then
    raise exception 'Non autorisé';
  end if;
  return jsonb_build_object(
    'id',v_row.id,'payroll_period_id',v_row.payroll_period_id,
    'starts_on',v_row.starts_on,'ends_on',v_row.ends_on,
    'generated_at',v_row.generated_at,'snapshot',v_row.snapshot
  );
end;
$function$;

create or replace function public.validate_payroll_period(p_period_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare e uuid; v_start date; v_end date; v_snapshot jsonb;
begin
  select establishment_id,starts_on,ends_on into e,v_start,v_end
  from public.payroll_periods where id=p_period_id;
  if e is null or not private.has_permission(e,'staff.manage') then
    raise exception 'Permission refusee';
  end if;

  update public.payroll_periods set status='validated' where id=p_period_id and status='draft';
  update public.payroll_entries set status='validated' where period_id=p_period_id and status='draft';

  select jsonb_build_object(
    'summary',coalesce((select jsonb_agg(to_jsonb(s) order by s.last_name,s.first_name)
      from public.pointage_period_summary(e,v_start,v_end) s),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.attendance_date,d.last_name,d.first_name)
      from public.pointage_daily_report(e,v_start,v_end) d),'[]'::jsonb)
  ) into v_snapshot;

  insert into public.pointage_payroll_fiches(
    establishment_id,payroll_period_id,starts_on,ends_on,generated_at,generated_by,snapshot
  ) values(e,p_period_id,v_start,v_end,now(),auth.uid(),v_snapshot)
  on conflict(payroll_period_id) do update set
    generated_at=excluded.generated_at,generated_by=excluded.generated_by,snapshot=excluded.snapshot;
  return true;
end;
$function$;

create or replace function public.get_enrollment_financial_summary(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare e uuid; result jsonb; v_user uuid:=auth.uid();
begin
  select establishment_id into e from public.enrollments where id=p_enrollment_id;
  if e is null then raise exception 'Inscription introuvable'; end if;
  if not private.has_permission(e,'payments.read') and not exists (
    select 1 from public.student_guardians sg
    join public.enrollments en on en.student_id=sg.student_id
    where en.id=p_enrollment_id and en.establishment_id=e
      and sg.guardian_user_id=v_user and sg.active=true and sg.can_view_finance=true
  ) then raise exception 'Accès refusé'; end if;

  select jsonb_build_object(
    'total_due',coalesce(sum(amount_due),0),
    'total_paid',coalesce(sum(amount_paid),0),
    'remaining',coalesce(sum(amount_due-amount_paid),0),
    'parent_due',coalesce(sum(amount_due-amount_paid) filter(where payer_type='family'),0),
    'state_expected',coalesce(sum(amount_due) filter(where payer_type='state'),0),
    'state_paid',coalesce(sum(amount_paid) filter(where payer_type='state'),0),
    'organization_expected',coalesce(sum(amount_due) filter(where organization_id is not null),0),
    'organization_paid',coalesce(sum(amount_paid) filter(where organization_id is not null),0),
    'schedules',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'number',installment_number,'label',label,'due_date',due_date,
      'amount_due',amount_due,'amount_paid',amount_paid,'status',status,
      'payer_type',payer_type,'organization_id',organization_id,'category',category,
      'is_refundable',is_refundable
    ) order by installment_number),'[]'::jsonb)
  ) into result from public.payment_schedules where enrollment_id=p_enrollment_id;
  return result;
end;
$function$;

create or replace function public.student_payment_status(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare eid uuid; result jsonb; v_student_id uuid;
begin
  select e.establishment_id,e.student_id into eid,v_student_id
  from public.enrollments e where e.id=p_enrollment_id;
  if eid is null then raise exception 'Inscription introuvable'; end if;

  if not private.has_permission(eid,'payments.view') and not exists (
    select 1 from public.student_guardians sg
    where sg.student_id=v_student_id and sg.establishment_id=eid
      and sg.guardian_user_id=auth.uid() and sg.active=true and sg.can_view_finance=true
  ) then raise exception 'Acces refuse'; end if;

  select jsonb_build_object(
    'enrollment_id',p_enrollment_id,
    'total_due',(select coalesce(sum(amount_due),0) from public.payment_schedules where enrollment_id=p_enrollment_id),
    'total_paid',(select coalesce(sum(amount_paid),0) from public.payment_schedules where enrollment_id=p_enrollment_id),
    'remaining',(select greatest(coalesce(sum(amount_due),0)-coalesce(sum(amount_paid),0),0) from public.payment_schedules where enrollment_id=p_enrollment_id),
    'next_due',(select min(due_date) from public.payment_schedules where enrollment_id=p_enrollment_id and status <> 'paid'),
    'schedules',(select coalesce(jsonb_agg(to_jsonb(ps) order by ps.installment_number),'[]'::jsonb)
      from public.payment_schedules ps where ps.enrollment_id=p_enrollment_id)
  ) into result;
  return result;
end;
$function$;

-- Appointment writes must retain the same requester/staff/administrator scope as reads.
drop policy if exists appointments_write on public.appointments;
create policy appointments_write on public.appointments for all to authenticated
using (
  private.is_member(establishment_id)
  and (
    requester_user_id=(select auth.uid())
    or staff_user_id=(select auth.uid())
    or private.has_permission(establishment_id,'school.manage')
  )
)
with check (
  private.is_member(establishment_id)
  and (
    requester_user_id=(select auth.uid())
    or staff_user_id=(select auth.uid())
    or private.has_permission(establishment_id,'school.manage')
  )
);

-- Keep internal payroll generator callable only through the checked public wrapper.
revoke all on function private.generate_payroll_period(uuid,date,date) from public, anon, authenticated;
grant execute on function private.generate_payroll_period(uuid,date,date) to service_role;
