CREATE OR REPLACE FUNCTION private.permission_category(p_permission text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_permission in ('students.read','students.view') then 'students'
    when p_permission in ('students.manage','students.create','students.edit','students.delete') then 'students.manage'
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

CREATE OR REPLACE FUNCTION private.has_permission(p_establishment_id uuid, p_permission text, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when p_establishment_id is null or p_permission is null or p_user_id is null then false
    when private.is_platform_admin(p_user_id) then true
    when exists (
      select 1 from public.profiles pr
      where pr.id = p_user_id and pr.account_type = 'teacher'
    ) then false
    else exists (
      select 1
      from public.establishment_members m
      left join lateral (
        select mp.effect
        from public.establishment_member_permissions mp
        where mp.establishment_member_id = m.id
          and (
            mp.permission in (p_permission, private.permission_category(p_permission))
            or (
              mp.permission = private.permission_implied_manage(p_permission)
              and mp.effect = 'grant'
            )
          )
        order by case
          when mp.permission = p_permission then 0
          when mp.permission = private.permission_category(p_permission) then 1
          else 2
        end
        limit 1
      ) member_override on true
      where m.establishment_id = p_establishment_id
        and m.user_id = p_user_id
        and m.active = true
        and (
          m.role in ('owner','admin','school_admin')
          or case member_override.effect
            when 'revoke' then false
            when 'grant' then true
            else exists (
              select 1 from public.establishment_role_permissions rp
              where rp.role_id = m.role_id
                and rp.permission in (
                  p_permission,
                  private.permission_category(p_permission),
                  private.permission_implied_manage(p_permission)
                )
            )
          end
        )
    )
  end;
$function$;

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
    if not (
      private.has_permission(p_establishment_id,'students.manage')
      or private.has_permission(p_establishment_id,'enrollments.manage')
    ) then
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