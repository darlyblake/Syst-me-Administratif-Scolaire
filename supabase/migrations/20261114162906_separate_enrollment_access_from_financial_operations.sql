CREATE OR REPLACE FUNCTION public.create_student_enrollment_with_schedule(p_establishment_id uuid, p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid, p_enrollment_date date, p_student_id uuid, p_first_name text, p_last_name text, p_student_number text, p_birth_date date, p_sex text, p_phone text, p_email text, p_option_ids uuid[], p_paid_installment_ids uuid[], p_pay_options boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_student_id uuid := p_student_id;
  v_enrollment_id uuid;
  v_schedule jsonb;
  v_summary jsonb;
  v_active_year uuid;
  v_option record;
  v_registration_schedule_id uuid;
  v_registration_amount numeric := 0;
  v_tuition_payment_id uuid;
  v_tuition_total numeric := 0;
  v_option_payment_id uuid;
  v_option_total numeric := 0;
  v_selected_count integer := 0;
  v_matching_count integer := 0;
  v_offset integer := 0;
  v_can_manage_finance boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if not private.has_permission(p_establishment_id,'enrollments.manage') then
    raise exception 'Permission refusee';
  end if;
  v_can_manage_finance := private.has_permission(p_establishment_id,'payments.manage');
  if not v_can_manage_finance and (
    coalesce(array_length(p_paid_installment_ids,1),0)>0 or coalesce(p_pay_options,false)
  ) then
    raise exception 'Permission financière requise pour enregistrer un paiement lors de l’inscription';
  end if;

  select id into v_active_year
  from public.academic_years
  where establishment_id=p_establishment_id and status='active'
  order by updated_at desc,created_at desc
  limit 1;

  if v_active_year is null then
    raise exception 'Aucune annee scolaire active pour cet etablissement';
  end if;

  if p_academic_year_id is distinct from v_active_year then
    raise exception 'L''inscription doit utiliser l''annee scolaire active';
  end if;

  if v_student_id is null then
    if not private.has_permission(p_establishment_id,'students.manage') then
      raise exception 'Permission refusee';
    end if;

    if nullif(trim(coalesce(p_first_name,'')),'') is null
       or nullif(trim(coalesce(p_last_name,'')),'') is null then
      raise exception 'Nom et prenom obligatoires';
    end if;

    insert into public.students(
      establishment_id,student_number,last_name,first_name,birth_date,sex,phone,email,active
    )
    values(
      p_establishment_id,
      nullif(trim(p_student_number),''),
      trim(p_last_name),
      trim(p_first_name),
      p_birth_date,
      nullif(trim(p_sex),''),
      nullif(trim(p_phone),''),
      nullif(trim(p_email),''),
      true
    )
    returning id into v_student_id;
  else
    if not exists(
      select 1 from public.students
      where id=v_student_id
        and establishment_id=p_establishment_id
        and active=true
    ) then
      raise exception 'Eleve introuvable ou hors etablissement';
    end if;
  end if;

  v_enrollment_id := public.create_enrollment_with_schedule(
    p_establishment_id,
    v_student_id,
    v_active_year,
    p_class_id,
    p_tuition_plan_id,
    coalesce(p_enrollment_date,current_date)
  );

  if coalesce(array_length(p_option_ids,1),0)>0 then
    for v_option in
      select id,name,default_amount
      from public.student_options
      where establishment_id=p_establishment_id
        and active=true
        and id=any(p_option_ids)
    loop
      insert into public.enrollment_options(
        establishment_id,enrollment_id,option_id,amount
      )
      values(
        p_establishment_id,
        v_enrollment_id,
        v_option.id,
        coalesce(v_option.default_amount,0)
      );
      -- Le trigger trg_enrollment_option_schedule crée l'échéance.
      -- Ne pas créer une deuxième ligne ici.
    end loop;

    if (
      select count(*) from public.enrollment_options
      where enrollment_id=v_enrollment_id
    )<>array_length(p_option_ids,1) then
      raise exception 'Une ou plusieurs options sont invalides';
    end if;
  end if;

  select s.id, s.amount_due
    into v_registration_schedule_id, v_registration_amount
  from public.payment_schedules s
  where s.enrollment_id=v_enrollment_id
    and s.category='registration'
  order by s.priority_rank nulls first, s.due_date
  limit 1;

  if coalesce(v_registration_amount,0)>0 and v_can_manage_finance then
    insert into public.payments(
      establishment_id,enrollment_id,payment_date,amount,reference,method,
      notes,recorded_by,payer_type,category,is_refundable
    )
    values(
      p_establishment_id,
      v_enrollment_id,
      coalesce(p_enrollment_date,current_date)::timestamp with time zone,
      v_registration_amount,
      'INSCRIPTION-'||replace(v_enrollment_id::text,'-',''),
      'cash',
      'Paiement enregistré lors de l''inscription',
      auth.uid(),
      'family',
      'registration',
      false
    )
    returning id into v_tuition_payment_id;

    insert into public.payment_allocations(payment_id,payment_schedule_id,amount)
    values(v_tuition_payment_id,v_registration_schedule_id,v_registration_amount);
  end if;

  select count(*) into v_selected_count
  from unnest(coalesce(p_paid_installment_ids,'{}'::uuid[])) x;

  select count(*) into v_matching_count
  from public.tuition_plan_installments i
  where i.tuition_plan_id=p_tuition_plan_id
    and i.id=any(coalesce(p_paid_installment_ids,'{}'::uuid[]));

  if v_selected_count<>v_matching_count then
    raise exception 'Une ou plusieurs echeances de scolarite selectionnees sont invalides';
  end if;

  if v_matching_count>0 then
    select coalesce(sum(i.amount),0)
      into v_tuition_total
    from public.tuition_plan_installments i
    where i.tuition_plan_id=p_tuition_plan_id
      and i.id=any(p_paid_installment_ids);

    if v_tuition_total>0 then
      insert into public.payments(
        establishment_id,enrollment_id,payment_date,amount,reference,method,
        notes,recorded_by,payer_type,category,is_refundable
      )
      values(
        p_establishment_id,
        v_enrollment_id,
        coalesce(p_enrollment_date,current_date)::timestamp with time zone,
        v_tuition_total,
        'SCOLARITE-'||replace(v_enrollment_id::text,'-',''),
        'cash',
        'Paiement de scolarite enregistré lors de l''inscription',
        auth.uid(),
        'family',
        'tuition',
        false
      )
      returning id into v_tuition_payment_id;

      v_offset := case when coalesce(
        (select registration_fee from public.tuition_plans where id=p_tuition_plan_id),0
      )>0 then 1 else 0 end;

      for v_option in
        select i.installment_number, i.amount
        from public.tuition_plan_installments i
        where i.tuition_plan_id=p_tuition_plan_id
          and i.id=any(p_paid_installment_ids)
        order by i.installment_number
      loop
        insert into public.payment_allocations(
          payment_id,payment_schedule_id,amount
        )
        select
          v_tuition_payment_id,
          s.id,
          v_option.amount
        from public.payment_schedules s
        where s.enrollment_id=v_enrollment_id
          and s.category='tuition'
          and s.installment_number=v_option.installment_number+v_offset
        limit 1;

        if not found then
          raise exception 'Echeance de scolarite introuvable pour l''echeance %',v_option.installment_number;
        end if;
      end loop;
    end if;
  end if;

  if coalesce(p_pay_options,false) then
    select coalesce(sum(eo.amount),0)
      into v_option_total
    from public.enrollment_options eo
    where eo.enrollment_id=v_enrollment_id
      and eo.amount>0;

    if v_option_total>0 then
      insert into public.payments(
        establishment_id,enrollment_id,payment_date,amount,reference,method,
        notes,recorded_by,payer_type,category,is_refundable
      )
      values(
        p_establishment_id,
        v_enrollment_id,
        coalesce(p_enrollment_date,current_date)::timestamp with time zone,
        v_option_total,
        'OPTIONS-'||replace(v_enrollment_id::text,'-',''),
        'cash',
        'Paiement des options enregistré lors de l''inscription',
        auth.uid(),
        'family',
        'option',
        false
      )
      returning id into v_option_payment_id;

      for v_option in
        select ps.id, ps.amount_due
        from public.payment_schedules ps
        where ps.enrollment_id=v_enrollment_id
          and ps.category='option'
          and ps.amount_due>0
        order by ps.installment_number
      loop
        insert into public.payment_allocations(
          payment_id,payment_schedule_id,amount
        )
        values(v_option_payment_id,v_option.id,v_option.amount_due);
      end loop;
    end if;
  end if;

  if private.has_permission(p_establishment_id,'payments.view') then
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,
    'installment_number',s.installment_number,
    'label',s.label,
    'due_date',s.due_date,
    'amount_due',s.amount_due,
    'amount_paid',s.amount_paid,
    'status',s.status,
    'category',s.category
  ) order by s.due_date,s.installment_number),'[]'::jsonb)
  into v_schedule
  from public.payment_schedules s
  where s.enrollment_id=v_enrollment_id;

  v_summary:=public.get_enrollment_financial_summary(v_enrollment_id);

  else
    v_schedule := '[]'::jsonb;
    v_summary := null;
  end if;

  return jsonb_build_object(
    'student_id',v_student_id,
    'enrollment_id',v_enrollment_id,
    'schedule',v_schedule,
    'financial_summary',v_summary
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_student_enrollment_with_funding(p_establishment_id uuid, p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid, p_enrollment_date date, p_student_id uuid, p_first_name text, p_last_name text, p_student_number text, p_birth_date date, p_sex text, p_phone text, p_email text, p_option_ids uuid[], p_paid_installment_ids uuid[], p_pay_options boolean, p_funding_source text, p_waive_registration boolean, p_waive_tuition boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result jsonb; v_student_id uuid; v_enrollment_id uuid; v_settings public.establishment_finance_settings%rowtype;
  v_registration_payer text; v_tuition_payer text; v_schedule jsonb; v_summary jsonb;
begin
  if p_funding_source not in ('family','state','other') then raise exception 'Mode de prise en charge invalide'; end if;
  if not private.has_permission(p_establishment_id,'payments.manage') and (
    p_funding_source <> 'family'
    or coalesce(p_waive_registration,false)
    or coalesce(p_waive_tuition,false)
    or coalesce(array_length(p_paid_installment_ids,1),0)>0
    or coalesce(p_pay_options,false)
  ) then
    raise exception 'Permission financière requise pour modifier la prise en charge ou enregistrer un paiement';
  end if;
  if p_funding_source='state' then
    select * into v_settings from public.establishment_finance_settings where establishment_id=p_establishment_id;
    if not coalesce(v_settings.state_students_enabled,false) then raise exception 'Activez d''abord la prise en charge des élèves de l''État dans Paramètres → Scolarité'; end if;
    if not coalesce(v_settings.state_allows_family_options,true) and coalesce(array_length(p_option_ids,1),0)>0 then
      raise exception 'Les options à la charge de la famille ne sont pas autorisées pour les élèves de l''État';
    end if;
  end if;
  v_registration_payer := case when p_funding_source='other' or coalesce(p_waive_registration,false) then 'other'
    when p_funding_source='state' and coalesce(v_settings.state_covers_registration,true) then 'state' else 'family' end;
  v_tuition_payer := case when p_funding_source='other' or coalesce(p_waive_tuition,false) then 'other'
    when p_funding_source='state' and coalesce(v_settings.state_covers_tuition,true) then 'state' else 'family' end;
  if p_funding_source='family' and not coalesce(p_waive_registration,false) and not coalesce(p_waive_tuition,false) then
    v_result := public.create_student_enrollment_with_schedule(
      p_establishment_id,p_academic_year_id,p_class_id,p_tuition_plan_id,p_enrollment_date,p_student_id,
      p_first_name,p_last_name,p_student_number,p_birth_date,p_sex,p_phone,p_email,
      coalesce(p_option_ids,'{}'::uuid[]),coalesce(p_paid_installment_ids,'{}'::uuid[]),coalesce(p_pay_options,false));
  else
    if coalesce(array_length(p_paid_installment_ids,1),0)>0 or coalesce(p_pay_options,false) then
      raise exception 'Les paiements immédiats sont disponibles uniquement pour une inscription familiale sans exonération. Vous pourrez enregistrer les paiements depuis Finance.';
    end if;
    v_result := public.create_student_enrollment_with_schedule(
      p_establishment_id,p_academic_year_id,p_class_id,p_tuition_plan_id,p_enrollment_date,p_student_id,
      p_first_name,p_last_name,p_student_number,p_birth_date,p_sex,p_phone,p_email,coalesce(p_option_ids,'{}'::uuid[]));
  end if;
  v_student_id := (v_result->>'student_id')::uuid;
  v_enrollment_id := (v_result->>'enrollment_id')::uuid;
  update public.enrollments set funding_source=p_funding_source where id=v_enrollment_id;
  update public.payment_schedules set payer_type=case when category='registration' then v_registration_payer
    when category='tuition' then v_tuition_payer else 'family' end
  where enrollment_id=v_enrollment_id and category in ('registration','tuition');
  update public.enrollments e set
    state_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='state'),0),
    parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0)) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0)
  where e.id=v_enrollment_id;
  if private.has_permission(p_establishment_id,'payments.view') then
  select coalesce(jsonb_agg(jsonb_build_object('id',ps.id,'installment_number',ps.installment_number,'label',ps.label,'due_date',ps.due_date,
    'amount_due',ps.amount_due,'amount_paid',ps.amount_paid,'status',ps.status,'category',ps.category,'payer_type',ps.payer_type)
    order by ps.due_date,ps.installment_number),'[]'::jsonb) into v_schedule
  from public.payment_schedules ps where ps.enrollment_id=v_enrollment_id;
  v_summary := public.get_enrollment_financial_summary(v_enrollment_id);
  else
    v_schedule := '[]'::jsonb;
    v_summary := null;
  end if;

  return jsonb_build_object('student_id',v_student_id,'enrollment_id',v_enrollment_id,'schedule',v_schedule,'financial_summary',v_summary);
end $function$;

CREATE OR REPLACE FUNCTION public.create_student_enrollment_with_family_funding(p_establishment_id uuid, p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid, p_enrollment_date date, p_student_id uuid, p_first_name text, p_last_name text, p_student_number text, p_birth_date date, p_sex text, p_phone text, p_email text, p_option_ids uuid[], p_paid_installment_ids uuid[], p_pay_options boolean, p_funding_source text, p_waive_registration boolean, p_waive_tuition boolean, p_related_student_id uuid DEFAULT NULL::uuid, p_sibling_relationship text DEFAULT 'autre'::text, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result jsonb; v_new_student_id uuid; v_enrollment_id uuid; v_family_id uuid; v_related_family_id uuid;
  v_children_count integer:=0; v_rule public.family_discount_rules%rowtype; v_schedule record;
  v_original numeric(12,2); v_discount numeric(12,2); v_net numeric(12,2); v_covered numeric(12,2); v_family_share numeric(12,2);
  v_coverage_rule public.organization_coverage_rules%rowtype; v_grade_level_id uuid; v_has_coverage boolean:=false; v_org_schedule_id uuid; v_snapshot_id uuid; v_option_type text;
begin
  if not private.has_permission(p_establishment_id,'enrollments.manage') then raise exception 'Permission refusée'; end if;
  if p_organization_id is not null and not private.has_permission(p_establishment_id,'payments.manage') then
    raise exception 'Permission financière requise pour appliquer une prise en charge';
  end if;
  if (p_related_student_id is not null or p_organization_id is not null) and (coalesce(array_length(p_paid_installment_ids,1),0)>0 or coalesce(p_pay_options,false)) then
    raise exception 'Pour appliquer une réduction familiale ou une prise en charge partielle, enregistrez d’abord l’inscription. Les paiements pourront être saisis ensuite dans Finance.';
  end if;
  if p_organization_id is not null and not exists(select 1 from public.sponsoring_organizations o where o.id=p_organization_id and o.establishment_id=p_establishment_id and o.active) then
    raise exception 'Organisme de prise en charge invalide ou inactif';
  end if;
  v_result:=public.create_student_enrollment_with_funding(
    p_establishment_id,p_academic_year_id,p_class_id,p_tuition_plan_id,p_enrollment_date,p_student_id,p_first_name,p_last_name,
    p_student_number,p_birth_date,p_sex,p_phone,p_email,coalesce(p_option_ids,'{}'::uuid[]),
    case when p_related_student_id is not null or p_organization_id is not null then '{}'::uuid[] else coalesce(p_paid_installment_ids,'{}'::uuid[]) end,
    case when p_related_student_id is not null or p_organization_id is not null then false else coalesce(p_pay_options,false) end,
    case when p_organization_id is not null then 'family' else p_funding_source end,
    coalesce(p_waive_registration,false),
    coalesce(p_waive_tuition,false)
  );
  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;

  if p_organization_id is not null then
    insert into public.organization_student_assignments(
      establishment_id,organization_id,student_id,enrollment_id,academic_year_id,status,created_by
    ) values (
      p_establishment_id,p_organization_id,v_new_student_id,v_enrollment_id,p_academic_year_id,'active',auth.uid()
    )
    on conflict(organization_id,enrollment_id) do update
      set status='active',ended_at=null,updated_at=now();
  end if;

  if p_related_student_id is not null then
    if p_related_student_id=v_new_student_id then raise exception 'Un élève ne peut pas être associé à lui-même'; end if;
    if not exists(select 1 from public.students s where s.id=p_related_student_id and s.establishment_id=p_establishment_id and s.active and s.merged_into_student_id is null) then
      raise exception 'L’élève choisi comme frère ou sœur n’est pas disponible dans cet établissement';
    end if;
    select family_id into v_related_family_id from public.student_family_members where student_id=p_related_student_id and establishment_id=p_establishment_id and active=true limit 1;
    if v_related_family_id is null then
      insert into public.school_families(establishment_id,display_name,created_by) values(p_establishment_id,coalesce(nullif(trim(p_last_name),''),'Famille')||' — famille',auth.uid()) returning id into v_family_id;
      insert into public.student_family_members(establishment_id,family_id,student_id,relationship,active,verified_at,created_by)
      values(p_establishment_id,v_family_id,p_related_student_id,'autre',true,now(),auth.uid());
    else v_family_id:=v_related_family_id; end if;
    if exists(select 1 from public.student_family_members where student_id=v_new_student_id and active=true and family_id<>v_family_id) then raise exception 'Le nouvel élève est déjà rattaché à une autre famille'; end if;
    insert into public.student_family_members(establishment_id,family_id,student_id,relationship,active,verified_at,created_by)
    values(p_establishment_id,v_family_id,v_new_student_id,coalesce(p_sibling_relationship,'autre'),true,now(),auth.uid())
    on conflict(family_id,student_id) do update set active=true,relationship=excluded.relationship,verified_at=now(),updated_at=now();

    select count(distinct sfm.student_id) into v_children_count from public.student_family_members sfm
    join public.enrollments e on e.student_id=sfm.student_id and e.establishment_id=sfm.establishment_id
    where sfm.family_id=v_family_id and sfm.establishment_id=p_establishment_id and sfm.active=true and e.academic_year_id=p_academic_year_id and e.status='active';

    if private.has_permission(p_establishment_id,'payments.manage') then
      for v_schedule in
        select * from public.payment_schedules ps
        where ps.enrollment_id=v_enrollment_id and ps.payer_type='family'
        order by ps.installment_number for update
      loop
      select so.option_type into v_option_type from public.enrollment_options eo join public.student_options so on so.id=eo.option_id where eo.enrollment_id=v_enrollment_id and so.name=v_schedule.label limit 1;
      select * into v_rule from public.family_discount_rules r
      where r.establishment_id=p_establishment_id and r.active
        and (r.academic_year_id is null or r.academic_year_id=p_academic_year_id)
        and r.min_children<=v_children_count and (r.max_children is null or r.max_children>=v_children_count)
        and r.applies_to_categories @> array[v_schedule.category]::text[]
        and (r.option_type is null or exists(select 1 from public.enrollment_options eo join public.student_options so on so.id=eo.option_id where eo.enrollment_id=v_enrollment_id and so.name=v_schedule.label and so.option_type=r.option_type))
        and (r.valid_from is null or r.valid_from<=p_enrollment_date)
        and (r.valid_until is null or r.valid_until>=p_enrollment_date)
      order by r.min_children desc,(r.academic_year_id is not null) desc,(r.option_type is not null) desc,r.created_at desc limit 1;
      if v_rule.id is null then continue; end if;
      v_original:=v_schedule.amount_due;
      v_discount:=case when v_rule.discount_type='percentage' then round(v_original*v_rule.discount_value/100,2) else least(v_original,v_rule.discount_value) end;
      v_net:=greatest(v_original-v_discount,0);
      insert into public.enrollment_discount_snapshots(establishment_id,enrollment_id,schedule_id,family_id,rule_id,rule_name,category,option_type,discount_type,discount_value,original_amount,discount_amount)
      values(p_establishment_id,v_enrollment_id,v_schedule.id,v_family_id,v_rule.id,v_rule.name,v_schedule.category,v_option_type,v_rule.discount_type,v_rule.discount_value,v_original,v_discount);
      if v_net<=0 then
        update public.payment_schedules set amount_due=0,amount_paid=0,status='paid',updated_at=now() where id=v_schedule.id;
      else
        update public.payment_schedules set amount_due=v_net,updated_at=now() where id=v_schedule.id;
      end if;
      end loop;
    end if;
  end if;

  if p_organization_id is not null then
    select sc.grade_level_id into v_grade_level_id from public.school_classes sc where sc.id=p_class_id and sc.establishment_id=p_establishment_id;
    for v_schedule in select * from public.payment_schedules ps where ps.enrollment_id=v_enrollment_id and ps.payer_type='family' and ps.amount_due>0 order by ps.installment_number for update loop
      select so.option_type into v_option_type from public.enrollment_options eo join public.student_options so on so.id=eo.option_id where eo.enrollment_id=v_enrollment_id and so.name=v_schedule.label limit 1;
      select * into v_coverage_rule from public.organization_coverage_rules r
      where r.establishment_id=p_establishment_id and r.organization_id=p_organization_id and r.category=v_schedule.category and r.active
        and (r.grade_level_id is null or r.grade_level_id=v_grade_level_id) and (r.academic_year_id is null or r.academic_year_id=p_academic_year_id)
        and (r.option_type is null or exists(select 1 from public.enrollment_options eo join public.student_options so on so.id=eo.option_id where eo.enrollment_id=v_enrollment_id and so.name=v_schedule.label and so.option_type=r.option_type))
        and (r.valid_from is null or r.valid_from<=p_enrollment_date) and (r.valid_until is null or r.valid_until>=p_enrollment_date)
      order by (r.grade_level_id is not null) desc,(r.academic_year_id is not null) desc,(r.option_type is not null) desc,r.created_at desc limit 1;
      if v_coverage_rule.id is null or v_coverage_rule.coverage_percent<=0 then continue; end if;
      v_net:=v_schedule.amount_due; v_covered:=round(v_net*v_coverage_rule.coverage_percent/100,2); v_family_share:=greatest(v_net-v_covered,0);
      if v_covered<=0 then continue; end if;
      v_has_coverage:=true;
      insert into public.organization_coverage_snapshots(establishment_id,enrollment_id,schedule_id,organization_id,category,option_type,coverage_percent,net_amount,organization_amount,family_amount)
      values(p_establishment_id,v_enrollment_id,v_schedule.id,p_organization_id,v_schedule.category,v_option_type,v_coverage_rule.coverage_percent,v_net,v_covered,v_family_share) returning id into v_snapshot_id;
      if v_family_share<=0 then update public.payment_schedules set payer_type='other',organization_id=p_organization_id,updated_at=now() where id=v_schedule.id;
      else
        update public.payment_schedules set amount_due=v_family_share,updated_at=now() where id=v_schedule.id;
        insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,amount_paid,status,payer_type,category,is_refundable,priority_rank,organization_id)
        values(v_schedule.enrollment_id,v_schedule.installment_number,v_schedule.label,v_schedule.due_date,v_covered,0,'pending','other',v_schedule.category,v_schedule.is_refundable,v_schedule.priority_rank,p_organization_id) returning id into v_org_schedule_id;
        update public.organization_coverage_snapshots set schedule_id=v_org_schedule_id where id=v_snapshot_id;
      end if;
    end loop;
    update public.enrollments set funding_source=case when v_has_coverage then 'other' else 'family' end where id=v_enrollment_id;
  end if;

  update public.enrollments e set
    parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0)) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0),
    state_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='state'),0),
    organization_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.organization_id is not null),0)
  where e.id=v_enrollment_id;
  v_result:=v_result||jsonb_build_object('family_id',v_family_id,'family_children_count',v_children_count,'family_discount_rule',case when v_rule.id is null then null else jsonb_build_object('id',v_rule.id,'name',v_rule.name,'type',v_rule.discount_type,'value',v_rule.discount_value) end,'organization_id',p_organization_id);
  if private.has_permission(p_establishment_id,'payments.view') then
    v_result:=v_result||jsonb_build_object('financial_summary',public.get_enrollment_financial_summary(v_enrollment_id));
  else
    v_result:=v_result||jsonb_build_object('financial_summary',null,'schedule','[]'::jsonb);
  end if;
  return v_result;
end $function$;

CREATE OR REPLACE FUNCTION public.create_student_enrollment_with_family_funding(p_establishment_id uuid, p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid, p_enrollment_date date, p_student_id uuid, p_first_name text, p_last_name text, p_student_number text, p_birth_date date, p_sex text, p_phone text, p_email text, p_option_ids uuid[], p_paid_installment_ids uuid[], p_pay_options boolean, p_funding_source text, p_waive_registration boolean, p_waive_tuition boolean, p_related_student_id uuid, p_sibling_relationship text, p_organization_id uuid, p_family_name text, p_apply_family_discount boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_result jsonb;
  v_family_id uuid;
  v_enrollment_id uuid;
begin
  if auth.uid() is null or not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission refusée';
  end if;
  if p_apply_family_discount and not private.has_permission(p_establishment_id,'payments.manage') then
    raise exception 'Permission financière requise pour appliquer une réduction familiale';
  end if;

  v_result := public.create_student_enrollment_with_family_funding(
    p_establishment_id, p_academic_year_id, p_class_id, p_tuition_plan_id,
    p_enrollment_date, p_student_id, p_first_name, p_last_name,
    p_student_number, p_birth_date, p_sex, p_phone, p_email,
    coalesce(p_option_ids, '{}'::uuid[]), coalesce(p_paid_installment_ids, '{}'::uuid[]),
    coalesce(p_pay_options, false), p_funding_source,
    coalesce(p_waive_registration, false), coalesce(p_waive_tuition, false),
    p_related_student_id, coalesce(p_sibling_relationship, 'autre'), p_organization_id
  );

  v_family_id := nullif(v_result->>'family_id', '')::uuid;
  v_enrollment_id := nullif(v_result->>'enrollment_id', '')::uuid;
  if v_family_id is not null then
    if private.has_permission(p_establishment_id,'payments.manage') then
      update public.school_families
      set display_name = coalesce(nullif(trim(p_family_name), ''), display_name),
          family_discount_enabled = coalesce(p_apply_family_discount, false),
          updated_at = now()
      where id = v_family_id and establishment_id = p_establishment_id;
      perform public.recalculate_family_discounts(p_establishment_id, v_family_id, p_academic_year_id);
    end if;
    v_result := v_result || jsonb_build_object(
      'family_id', v_family_id,
      'family_name', (select sf.display_name from public.school_families sf where sf.id = v_family_id),
      'family_discount_enabled', coalesce(p_apply_family_discount, false)
    );
  end if;

  if v_enrollment_id is not null then
    v_result := v_result || jsonb_build_object(
      'financial_summary', public.get_enrollment_financial_summary(v_enrollment_id)
    );
  end if;
  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_student_enrollment_with_family_funding(p_establishment_id uuid, p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid, p_enrollment_date date, p_student_id uuid, p_first_name text, p_last_name text, p_student_number text, p_birth_date date, p_sex text, p_phone text, p_email text, p_option_ids uuid[], p_paid_installment_ids uuid[], p_pay_options boolean, p_funding_source text, p_waive_registration boolean, p_waive_tuition boolean, p_related_student_id uuid, p_sibling_relationship text, p_organization_id uuid, p_family_name text, p_apply_family_discount boolean, p_family_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_result jsonb;
  v_result_family_id uuid;
  v_new_student_id uuid;
  v_existing_family_id uuid;
begin
  if auth.uid() is null
     or not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission refusée';
  end if;
  if p_apply_family_discount and not private.has_permission(p_establishment_id,'payments.manage') then
    raise exception 'Permission financière requise pour appliquer une réduction familiale';
  end if;

  v_result := public.create_student_enrollment_with_family_funding(
    p_establishment_id, p_academic_year_id, p_class_id, p_tuition_plan_id,
    p_enrollment_date, p_student_id, p_first_name, p_last_name,
    p_student_number, p_birth_date, p_sex, p_phone, p_email,
    coalesce(p_option_ids, '{}'::uuid[]),
    coalesce(p_paid_installment_ids, '{}'::uuid[]),
    coalesce(p_pay_options, false), p_funding_source,
    coalesce(p_waive_registration, false), coalesce(p_waive_tuition, false),
    p_related_student_id, coalesce(p_sibling_relationship, 'autre'),
    p_organization_id, p_family_name, coalesce(p_apply_family_discount, false)
  );

  v_result_family_id := nullif(v_result->>'family_id', '')::uuid;

  if p_family_id is not null then
    if not exists (
      select 1 from public.school_families sf
      where sf.id = p_family_id and sf.establishment_id = p_establishment_id
    ) then
      raise exception 'Famille introuvable dans cet établissement';
    end if;

    if v_result_family_id is not null and v_result_family_id <> p_family_id then
      raise exception 'L’élève choisi appartient à une autre famille que celle sélectionnée';
    end if;

    v_new_student_id := (v_result->>'student_id')::uuid;

    select sfm.family_id into v_existing_family_id
    from public.student_family_members sfm
    where sfm.establishment_id = p_establishment_id
      and sfm.student_id = v_new_student_id
      and sfm.active = true
    limit 1;

    if v_existing_family_id is not null and v_existing_family_id <> p_family_id then
      raise exception 'Cet élève est déjà rattaché à une autre famille';
    end if;

    insert into public.student_family_members (
      establishment_id, family_id, student_id, relationship,
      active, verified_at, created_by
    ) values (
      p_establishment_id, p_family_id, v_new_student_id,
      coalesce(p_sibling_relationship, 'autre'), true, now(), auth.uid()
    )
    on conflict (family_id, student_id) do update
      set active = true,
          relationship = excluded.relationship,
          verified_at = now(),
          updated_at = now();

    if private.has_permission(p_establishment_id,'payments.manage') then
      update public.school_families
      set family_discount_enabled = coalesce(p_apply_family_discount, false),
          updated_at = now()
      where id = p_family_id and establishment_id = p_establishment_id;
      perform public.recalculate_family_discounts(
        p_establishment_id, p_family_id, p_academic_year_id
      );
    end if;

    v_result := v_result || jsonb_build_object(
      'family_id', p_family_id,
      'family_name', (select sf.display_name from public.school_families sf where sf.id = p_family_id),
      'family_discount_enabled', coalesce(p_apply_family_discount, false)
    );
  end if;

  return v_result;
end;
$function$;