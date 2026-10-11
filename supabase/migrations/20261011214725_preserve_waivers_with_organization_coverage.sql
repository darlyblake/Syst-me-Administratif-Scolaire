-- Preserve explicitly configured fee waivers when an organization also covers eligible fees.
-- A waived category produces no billable schedule, so the coverage allocator naturally skips it.

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
  if (p_related_student_id is not null or p_organization_id is not null) and (coalesce(array_length(p_paid_installment_ids,1),0)>0 or coalesce(p_pay_options,false)) then
    raise exception 'Pour appliquer une réduction familiale ou une prise en charge partielle, enregistrez d’abord l’inscription. Les paiements pourront être saisis ensuite dans Finance.';
  end if;
  if p_organization_id is not null and not exists(select 1 from public.sponsoring_organizations o where o.id=p_organization_id and o.establishment_id=p_establishment_id and o.active and not o.is_state) then
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
  v_result:=v_result||jsonb_build_object('financial_summary',public.get_enrollment_financial_summary(v_enrollment_id));
  return v_result;
end $function$
