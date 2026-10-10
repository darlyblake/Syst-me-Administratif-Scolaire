-- Correct overdue-payment notifications and make enrollment financing explicit.
-- Also repairs the active Albertine record and prevents new active student orphans.

create or replace function private.notify_parent_on_payment_schedule()
returns trigger language plpgsql set search_path to 'public','private' as $$
declare
  v_student_id uuid; v_student_name text; v_status text; v_title text; v_body text;
begin
  v_status := lower(coalesce(new.status::text,''));
  if v_status <> 'late' and not (new.due_date < current_date and coalesce(new.amount_paid,0) < coalesce(new.amount_due,0)) then return new; end if;
  select e.student_id,trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))
    into v_student_id,v_student_name
  from public.enrollments e join public.students s on s.id=e.student_id where e.id=new.enrollment_id limit 1;
  if v_student_id is null then return new; end if;
  v_title := 'Paiement en retard';
  v_body := format('%s a une échéance en retard : %s. Montant restant : %s FCFA.',
    nullif(v_student_name,''),coalesce(new.label,'Échéance scolaire'),
    to_char(greatest(coalesce(new.amount_due,0)-coalesce(new.amount_paid,0),0),'FM999G999G999'));
  insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
  select distinct en.establishment_id,sg.guardian_user_id,'payment_overdue',v_title,v_body,'payment_schedule',new.id
  from public.enrollments en
  join public.student_guardians sg on sg.student_id=en.student_id and sg.establishment_id=en.establishment_id and sg.active=true
  where en.id=new.enrollment_id and not exists(
    select 1 from public.notifications n where n.recipient_user_id=sg.guardian_user_id
      and n.entity_type='payment_schedule' and n.entity_id=new.id and n.type='payment_overdue');
  return new;
end $$;

create or replace function public.create_student_enrollment_with_funding(
  p_establishment_id uuid,p_academic_year_id uuid,p_class_id uuid,p_tuition_plan_id uuid,p_enrollment_date date,
  p_student_id uuid,p_first_name text,p_last_name text,p_student_number text,p_birth_date date,p_sex text,p_phone text,p_email text,
  p_option_ids uuid[],p_paid_installment_ids uuid[],p_pay_options boolean,p_funding_source text,p_waive_registration boolean,p_waive_tuition boolean
) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_result jsonb; v_student_id uuid; v_enrollment_id uuid; v_settings public.establishment_finance_settings%rowtype;
  v_registration_payer text; v_tuition_payer text; v_schedule jsonb; v_summary jsonb;
begin
  if p_funding_source not in ('family','state','other') then raise exception 'Mode de prise en charge invalide'; end if;
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
  select coalesce(jsonb_agg(jsonb_build_object('id',ps.id,'installment_number',ps.installment_number,'label',ps.label,'due_date',ps.due_date,
    'amount_due',ps.amount_due,'amount_paid',ps.amount_paid,'status',ps.status,'category',ps.category,'payer_type',ps.payer_type)
    order by ps.due_date,ps.installment_number),'[]'::jsonb) into v_schedule
  from public.payment_schedules ps where ps.enrollment_id=v_enrollment_id;
  v_summary := public.get_enrollment_financial_summary(v_enrollment_id);
  return jsonb_build_object('student_id',v_student_id,'enrollment_id',v_enrollment_id,'schedule',v_schedule,'financial_summary',v_summary);
end $$;
revoke all on function public.create_student_enrollment_with_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean) from public;
grant execute on function public.create_student_enrollment_with_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean) to authenticated;

create or replace function public.list_enrollments_paginated(
  p_establishment_id uuid,p_page integer default 1,p_page_size integer default 25,
  p_academic_year_id uuid default null,p_class_id uuid default null,p_status text default null,p_search text default null
) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_page integer := greatest(coalesce(p_page,1),1); v_size integer := least(greatest(coalesce(p_page_size,25),1),100);
  v_total bigint; v_rows jsonb; v_search text := nullif(trim(coalesce(p_search,'')),'');
begin
  if not (private.has_permission(p_establishment_id,'enrollments.read') or private.has_permission(p_establishment_id,'students.read')) then raise exception 'Permission refusee'; end if;
  select count(*) into v_total from public.enrollments e join public.students s on s.id=e.student_id
  where e.establishment_id=p_establishment_id and (p_academic_year_id is null or e.academic_year_id=p_academic_year_id)
    and (p_class_id is null or e.class_id=p_class_id) and (p_status is null or e.status::text=p_status)
    and (v_search is null or concat_ws(' ',s.first_name,s.last_name,s.student_number) ilike '%'||v_search||'%');
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (
    select e.id,e.student_id,e.academic_year_id,e.class_id,e.tuition_plan_id,e.enrollment_date,e.status,e.created_at,
      e.funding_source,e.state_expected_amount,e.parent_payable_amount,
      s.student_number,s.first_name,s.last_name,s.guardian_first_name,s.guardian_last_name,s.guardian_phone,s.guardian_email,s.guardian_address,s.guardian_relationship,
      gp.first_name as linked_guardian_first_name,gp.last_name as linked_guardian_last_name,gp.phone as linked_guardian_phone,
      au.email as linked_guardian_email,sg.relationship as linked_guardian_relationship
    from public.enrollments e join public.students s on s.id=e.student_id
    left join lateral (select sg.guardian_user_id,sg.relationship from public.student_guardians sg
      where sg.student_id=s.id and sg.establishment_id=p_establishment_id and sg.active=true
      order by sg.is_primary desc nulls last,sg.created_at limit 1) sg on true
    left join public.profiles gp on gp.id=sg.guardian_user_id left join auth.users au on au.id=sg.guardian_user_id
    where e.establishment_id=p_establishment_id and (p_academic_year_id is null or e.academic_year_id=p_academic_year_id)
      and (p_class_id is null or e.class_id=p_class_id) and (p_status is null or e.status::text=p_status)
      and (v_search is null or concat_ws(' ',s.first_name,s.last_name,s.student_number) ilike '%'||v_search||'%')
    order by e.created_at desc,e.id desc limit v_size offset ((v_page-1)*v_size)
  ) x;
  return jsonb_build_object('data',v_rows,'page',v_page,'page_size',v_size,'total',v_total,
    'total_pages',case when v_total=0 then 0 else ceil(v_total::numeric/v_size)::int end);
end $$;

do $$
declare
  v_student_id uuid; v_establishment_id uuid; v_year_id uuid; v_class_id uuid; v_grade_level_id uuid; v_plan_id uuid; v_enrollment_id uuid; v_registration_fee numeric;
begin
  select s.id,s.establishment_id into v_student_id,v_establishment_id from public.students s
  where s.student_number='ECO-10264-2026' and lower(s.first_name)='elve2' and lower(s.last_name)='eleve2' and s.active=true;
  if v_student_id is not null then
    select id into v_year_id from public.academic_years where establishment_id=v_establishment_id and name='2026-2027' and status='active' order by updated_at desc,created_at desc limit 1;
    select c.id,c.grade_level_id into v_class_id,v_grade_level_id from public.school_classes c
      where c.establishment_id=v_establishment_id and c.name='6eme A' and c.active=true limit 1;
    select tp.id,tp.registration_fee into v_plan_id,v_registration_fee from public.tuition_plans tp
      where tp.establishment_id=v_establishment_id and tp.academic_year_id=v_year_id and tp.grade_level_id=v_grade_level_id and tp.active=true
      order by tp.created_at desc limit 1;
    if v_year_id is not null and v_class_id is not null and v_plan_id is not null
       and not exists(select 1 from public.enrollments e where e.student_id=v_student_id and e.academic_year_id=v_year_id and e.status in ('pending','active')) then
      insert into public.enrollments(establishment_id,student_id,academic_year_id,class_id,tuition_plan_id,enrollment_date,status,funding_source,state_expected_amount,parent_payable_amount)
      values(v_establishment_id,v_student_id,v_year_id,v_class_id,v_plan_id,current_date,'active','family',0,0) returning id into v_enrollment_id;
      if coalesce(v_registration_fee,0)>0 and not exists(select 1 from public.payment_schedules ps where ps.enrollment_id=v_enrollment_id and ps.category='registration') then
        insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category,priority_rank)
        values(v_enrollment_id,1,'Frais d''inscription',current_date,v_registration_fee,'family','registration',0);
      end if;
      update public.enrollments e set parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0)) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0) where e.id=v_enrollment_id;
    end if;
  end if;
end $$;

create or replace function public.enforce_active_student_enrollment()
returns trigger language plpgsql set search_path to 'public','pg_temp' as $$
begin
  if new.active=true and not exists(select 1 from public.enrollments e where e.student_id=new.id and e.status in ('pending','active')) then
    raise exception 'Un élève actif doit avoir une inscription active ou en attente. Utilisez le formulaire d''inscription complet.';
  end if;
  return new;
end $$;
drop trigger if exists trg_students_require_enrollment on public.students;
create constraint trigger trg_students_require_enrollment after insert or update on public.students
deferrable initially deferred for each row execute function public.enforce_active_student_enrollment();
