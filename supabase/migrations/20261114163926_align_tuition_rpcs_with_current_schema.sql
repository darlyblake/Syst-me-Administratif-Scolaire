CREATE OR REPLACE FUNCTION public.create_tuition_plan_with_billing(p_establishment_id uuid, p_academic_year_id uuid, p_grade_level_id uuid, p_name text, p_registration_fee numeric, p_annual_tuition numeric, p_payment_mode text, p_schedule jsonb DEFAULT '[]'::jsonb, p_billing_start_date date DEFAULT NULL::date, p_billing_end_date date DEFAULT NULL::date, p_enrollment_payment_priority text DEFAULT 'schedule_order'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_plan_id uuid;
  v_year public.academic_years;
  v_est uuid;
  v_count integer;
  v_start date;
  v_end date;
begin
  if not private.has_permission(p_establishment_id,'tuition.manage') then
    raise exception 'Permission refusee';
  end if;

  if p_registration_fee < 0 or p_annual_tuition < 0 then
    raise exception 'Montant invalide';
  end if;

  if nullif(trim(p_name),'') is null then
    raise exception 'Nom du plan obligatoire';
  end if;

  if p_payment_mode not in ('single','monthly','installments') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_enrollment_payment_priority not in ('schedule_order','last_due_first') then
    raise exception 'Priorite de paiement invalide';
  end if;

  select * into v_year
  from public.academic_years
  where id=p_academic_year_id and establishment_id=p_establishment_id;

  if v_year.id is null then
    raise exception 'Annee academique hors etablissement';
  end if;

  select ec.establishment_id into v_est
  from public.grade_levels gl
  join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=p_grade_level_id;

  if v_est is null or v_est<>p_establishment_id then
    raise exception 'Niveau hors etablissement';
  end if;

  if exists(
    select 1 from public.tuition_plans
    where academic_year_id=p_academic_year_id
      and grade_level_id=p_grade_level_id
      and active
  ) then
    raise exception 'Un plan actif existe deja pour ce niveau et cette annee';
  end if;

  if p_payment_mode='single' then
    v_count:=1;
    v_start:=coalesce(p_billing_start_date,v_year.start_date);
    v_end:=coalesce(p_billing_end_date,v_year.end_date);
  elsif p_payment_mode='monthly' then
    v_start:=coalesce(p_billing_start_date,v_year.start_date);
    v_end:=coalesce(p_billing_end_date,v_year.end_date);

    if v_start < v_year.start_date or v_end > v_year.end_date or v_start > v_end then
      raise exception 'Periode de facturation hors annee scolaire';
    end if;

    v_count :=
      (extract(year from age(v_end,v_start))::integer*12)
      + extract(month from age(v_end,v_start))::integer+1;

    if v_count<1 or v_count>12 then
      raise exception 'Nombre de mensualites invalide: %',v_count;
    end if;
  else
    if jsonb_typeof(p_schedule)<>'array' then
      raise exception 'Programme d echeances invalide';
    end if;
    v_count:=jsonb_array_length(p_schedule);
    if v_count<2 or v_count>24 then
      raise exception 'Nombre d echeances invalide';
    end if;
    v_start:=p_billing_start_date;
    v_end:=p_billing_end_date;
  end if;

  insert into public.tuition_plans(
    establishment_id,academic_year_id,grade_level_id,registration_fee,
    annual_tuition,payment_mode,installment_count,active,billing_start_date,
    billing_end_date,enrollment_payment_priority
  ) values(
    p_establishment_id,p_academic_year_id,p_grade_level_id,
    p_registration_fee,p_annual_tuition,p_payment_mode,v_count,true,
    v_start,v_end,p_enrollment_payment_priority
  ) returning id into v_plan_id;

  perform private.rebuild_tuition_plan_installments(
    v_plan_id,p_schedule,v_start,v_end
  );

  return public.get_tuition_plan(v_plan_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_tuition_plan_server_validated(p_establishment_id uuid, p_academic_year_id uuid, p_grade_level_id uuid, p_name text, p_annual_tuition numeric, p_payment_mode text, p_schedule jsonb DEFAULT '[]'::jsonb, p_billing_start_date date DEFAULT NULL::date, p_billing_end_date date DEFAULT NULL::date, p_enrollment_payment_priority text DEFAULT 'schedule_order'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_plan_id uuid;
  v_year public.academic_years;
  v_est uuid;
  v_count integer;
begin
  if not private.has_permission(p_establishment_id,'tuition.manage') then
    raise exception 'Permission refusee';
  end if;
  if p_annual_tuition<0 then raise exception 'Scolarite annuelle invalide'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Nom du plan obligatoire'; end if;
  if p_payment_mode not in ('single','monthly','installments') then raise exception 'Mode de paiement invalide'; end if;
  if p_enrollment_payment_priority not in ('schedule_order','last_due_first') then raise exception 'Priorite de paiement invalide'; end if;

  select * into v_year from public.academic_years
  where id=p_academic_year_id and establishment_id=p_establishment_id;
  if v_year.id is null then raise exception 'Annee academique hors etablissement'; end if;

  select ec.establishment_id into v_est
  from public.grade_levels gl
  join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=p_grade_level_id;
  if v_est is null or v_est<>p_establishment_id then raise exception 'Niveau hors etablissement'; end if;

  if exists(
    select 1 from public.tuition_plans
    where academic_year_id=p_academic_year_id and grade_level_id=p_grade_level_id and active
  ) then
    raise exception 'Un plan actif existe deja pour ce niveau et cette annee';
  end if;

  if p_payment_mode='single' then
    v_count:=1;
  elsif p_payment_mode='monthly' then
    v_count :=
      (extract(year from age(coalesce(p_billing_end_date,v_year.end_date),
                             coalesce(p_billing_start_date,v_year.start_date)))::integer*12)
      + extract(month from age(coalesce(p_billing_end_date,v_year.end_date),
                               coalesce(p_billing_start_date,v_year.start_date)))::integer+1;
    if v_count<1 or v_count>12 then raise exception 'Nombre de mensualites invalide: %',v_count; end if;
  else
    if jsonb_typeof(p_schedule)<>'array' then raise exception 'Programme d echeances invalide'; end if;
    v_count:=jsonb_array_length(p_schedule);
    if v_count<2 or v_count>24 then raise exception 'Nombre d echeances invalide'; end if;
  end if;

  insert into public.tuition_plans(
    establishment_id,academic_year_id,grade_level_id,registration_fee,
    annual_tuition,payment_mode,installment_count,active,billing_start_date,
    billing_end_date,enrollment_payment_priority
  ) values(
    p_establishment_id,p_academic_year_id,p_grade_level_id,0,
    p_annual_tuition,p_payment_mode,v_count,true,
    case when p_payment_mode='monthly' then coalesce(p_billing_start_date,v_year.start_date) else p_billing_start_date end,
    case when p_payment_mode='monthly' then coalesce(p_billing_end_date,v_year.end_date) else p_billing_end_date end,
    p_enrollment_payment_priority
  ) returning id into v_plan_id;

  perform private.rebuild_tuition_plan_installments(
    v_plan_id,p_schedule,p_billing_start_date,p_billing_end_date
  );

  return public.get_tuition_plan(v_plan_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_tuition_plan_server_validated(p_tuition_plan_id uuid, p_name text, p_registration_fee numeric, p_annual_tuition numeric, p_payment_mode text, p_schedule jsonb DEFAULT '[]'::jsonb, p_billing_start_date date DEFAULT NULL::date, p_billing_end_date date DEFAULT NULL::date, p_active boolean DEFAULT true, p_enrollment_payment_priority text DEFAULT 'schedule_order'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_plan public.tuition_plans;
  v_year public.academic_years;
  v_start date;
  v_end date;
begin
  select * into v_plan from public.tuition_plans where id=p_tuition_plan_id for update;
  if v_plan.id is null then raise exception 'Plan tarifaire introuvable'; end if;
  if not private.has_permission(v_plan.establishment_id,'tuition.manage') then raise exception 'Permission refusee'; end if;
  if p_registration_fee<0 or p_annual_tuition<0 then raise exception 'Montant invalide'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Nom du plan obligatoire'; end if;
  if p_payment_mode not in ('single','monthly','installments') then raise exception 'Mode de paiement invalide'; end if;
  if p_enrollment_payment_priority not in ('schedule_order','last_due_first') then raise exception 'Priorite de paiement invalide'; end if;

  select * into v_year from public.academic_years where id=v_plan.academic_year_id;
  if v_year.id is null then raise exception 'Annee scolaire introuvable'; end if;

  v_start:=coalesce(p_billing_start_date,case when p_payment_mode='monthly' then v_year.start_date else p_billing_start_date end);
  v_end:=coalesce(p_billing_end_date,case when p_payment_mode='monthly' then v_year.end_date else p_billing_end_date end);

  update public.tuition_plans
  set registration_fee=p_registration_fee,
      annual_tuition=p_annual_tuition,
      payment_mode=p_payment_mode,
      active=p_active,
      enrollment_payment_priority=p_enrollment_payment_priority,
      billing_start_date=v_start,
      billing_end_date=v_end,
      updated_at=now()
  where id=p_tuition_plan_id;

  -- Existing payment schedules belong to existing enrollments and are not rewritten.
  perform private.rebuild_tuition_plan_installments(
    p_tuition_plan_id,p_schedule,v_start,v_end
  );

  return public.get_tuition_plan(p_tuition_plan_id);
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
    private.has_permission(p_establishment_id,'tuition.view')
    or private.has_permission(p_establishment_id,'tuition.manage')
  ) then raise exception 'Acces refuse'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.grade_level_name),'[]'::jsonb) into result
  from (
    select tp.id,tp.establishment_id,tp.academic_year_id,tp.grade_level_id,
      tp.registration_fee,tp.annual_tuition,tp.payment_mode,tp.installment_count,
      tp.active,tp.billing_start_date,tp.billing_end_date,tp.enrollment_payment_priority,
      tp.re_registration_fee,tp.late_enrollment_billing_policy,gl.name as grade_level_name
    from public.tuition_plans tp
    join public.grade_levels gl on gl.id=tp.grade_level_id
    where tp.establishment_id=p_establishment_id
      and (p_academic_year_id is null or tp.academic_year_id=p_academic_year_id)
      and (p_grade_level_id is null or tp.grade_level_id=p_grade_level_id)
      and (not p_active_only or tp.active)
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
declare v_schedule jsonb := '[]'::jsonb; v_result jsonb; v_id uuid;
begin
  if not private.has_permission(p_establishment_id,'tuition.manage') then raise exception 'Permission refusee'; end if;
  if p_payment_mode='installments' then
    if p_installment_count is null or p_installment_count<2 or p_installment_count>24 then
      raise exception 'Nombre de tranches invalide';
    end if;
    select jsonb_agg(jsonb_build_object(
      'label','Tranche '||n,
      'percentage',case when n=p_installment_count
        then 100 - round(100.0/p_installment_count,2)*(p_installment_count-1)
        else round(100.0/p_installment_count,2) end,
      'due_date',null
    ) order by n) into v_schedule
    from generate_series(1,p_installment_count) n;
  end if;
  v_result:=public.create_tuition_plan_with_billing(
    p_establishment_id,p_academic_year_id,p_grade_level_id,p_name,
    p_registration_fee,p_annual_tuition,p_payment_mode,v_schedule,null,null,'schedule_order'
  );
  v_id:=(v_result->>'id')::uuid;
  return v_id;
end;
$function$;

create or replace function public.update_tuition_plan(
  p_tuition_plan_id uuid,p_name text,p_registration_fee numeric,p_annual_tuition numeric,
  p_payment_mode text,p_installment_count integer,p_active boolean default true
)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_schedule jsonb := '[]'::jsonb;
begin
  if p_payment_mode='installments' then
    if p_installment_count is null or p_installment_count<2 or p_installment_count>24 then
      raise exception 'Nombre de tranches invalide';
    end if;
    select jsonb_agg(jsonb_build_object(
      'label','Tranche '||n,
      'percentage',case when n=p_installment_count
        then 100 - round(100.0/p_installment_count,2)*(p_installment_count-1)
        else round(100.0/p_installment_count,2) end,
      'due_date',null
    ) order by n) into v_schedule
    from generate_series(1,p_installment_count) n;
  end if;
  perform public.update_tuition_plan_server_validated(
    p_tuition_plan_id,p_name,p_registration_fee,p_annual_tuition,p_payment_mode,
    v_schedule,null,null,p_active,'schedule_order'
  );
  return true;
end;
$function$;