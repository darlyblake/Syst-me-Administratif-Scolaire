-- Consolide le cycle de vie des prises en charge et leur intégration aux inscriptions.
-- Le bloc est idempotent : il complète les fonctions si elles utilisent encore l'ancien flux.

do $$
declare
  v_assignment_definition text;
  v_enrollment_definition text;
  v_old_stop text;
  v_new_stop text;
  v_anchor text;
  v_replacement text;
begin
  select pg_get_functiondef('public.manage_organization_student_assignment(uuid,uuid,uuid,text,uuid)'::regprocedure)
  into v_assignment_definition;

  v_old_stop := $old$
  if p_action='stop' then
    update public.organization_student_assignments
      set status='ended', ended_at=now(), updated_at=now()
    where organization_id=p_organization_id and enrollment_id=p_enrollment_id
      and establishment_id=p_establishment_id and status='active'
    returning * into v_assignment;
    if v_assignment.id is null then raise exception 'Aucune prise en charge active pour cet élève et cette année'; end if;
    return jsonb_build_object('action','stop','assignment_id',v_assignment.id);
  elsif p_action<>'assign' then
    raise exception 'Action inconnue';
  end if;
$old$;
  v_new_stop := $new$
  if p_action='stop' then
    update public.organization_student_assignments
      set status='ended', ended_at=now(), updated_at=now()
    where organization_id=p_organization_id and enrollment_id=p_enrollment_id
      and establishment_id=p_establishment_id and status='active'
    returning * into v_assignment;
    if v_assignment.id is null then raise exception 'Aucune prise en charge active pour cet élève et cette année'; end if;
    -- Les montants déjà encaissés restent attribués à l'organisme.
    -- Le reste non encaissé bascule vers la famille sans effacer la trace de l'organisme.
    for v_schedule in
      select * from public.payment_schedules
      where enrollment_id=p_enrollment_id and organization_id=p_organization_id and payer_type='other'
      for update
    loop
      v_remaining := greatest(coalesce(v_schedule.amount_due,0)-coalesce(v_schedule.amount_paid,0),0);
      if v_remaining<=0 then continue; end if;
      update public.payment_schedules
      set amount_due=amount_paid,status='paid',updated_at=now()
      where id=v_schedule.id;
      insert into public.payment_schedules(
        enrollment_id,installment_number,label,due_date,amount_due,amount_paid,status,
        payer_type,category,is_refundable,priority_rank,organization_id
      ) values (
        v_schedule.enrollment_id,v_schedule.installment_number,v_schedule.label,v_schedule.due_date,
        v_remaining,0,'pending','family',v_schedule.category,v_schedule.is_refundable,
        v_schedule.priority_rank,null
      );
    end loop;
    update public.enrollments e set
      parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0))
        from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0),
      organization_expected_amount=coalesce((select sum(ps.amount_due)
        from public.payment_schedules ps where ps.enrollment_id=e.id and ps.organization_id is not null),0)
    where e.id=p_enrollment_id;
    return jsonb_build_object('action','stop','assignment_id',v_assignment.id);
  elsif p_action<>'assign' then
    raise exception 'Action inconnue';
  end if;
$new$;

  if position(v_old_stop in v_assignment_definition)>0 then
    v_assignment_definition:=replace(v_assignment_definition,v_old_stop,v_new_stop);
  end if;
  if position('v_remaining numeric(12,2)' in v_assignment_definition)=0 then
    v_assignment_definition:=replace(v_assignment_definition,'  v_covered_any boolean := false;',
      '  v_covered_any boolean := false;' || chr(10) || '  v_remaining numeric(12,2);');
  end if;
  execute v_assignment_definition;

  select pg_get_functiondef('public.create_student_enrollment_with_family_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid)'::regprocedure)
  into v_enrollment_definition;
  v_enrollment_definition:=replace(v_enrollment_definition,'and o.active and not o.is_state','and o.active');
  v_anchor := $anchor$  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;$anchor$;
  v_replacement := $replacement$  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;
  if p_organization_id is not null then
    insert into public.organization_student_assignments(
      establishment_id,organization_id,student_id,enrollment_id,academic_year_id,status,created_by
    ) values (
      p_establishment_id,p_organization_id,v_new_student_id,v_enrollment_id,p_academic_year_id,'active',auth.uid()
    )
    on conflict(organization_id,enrollment_id) do update
      set status='active',ended_at=null,updated_at=now();
  end if;$replacement$;
  if position('insert into public.organization_student_assignments' in v_enrollment_definition)=0 then
    if position(v_anchor in v_enrollment_definition)=0 then raise exception 'Enrollment assignment insertion point not found'; end if;
    v_enrollment_definition:=replace(v_enrollment_definition,v_anchor,v_replacement);
  end if;
  execute v_enrollment_definition;
end $$;
