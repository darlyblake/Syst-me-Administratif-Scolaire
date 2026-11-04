-- Suivi annuel des élèves pris en charge par un organisme.
-- Une ligne par inscription/année : les décisions antérieures sont conservées.
create table if not exists public.organization_student_assignments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  organization_id uuid not null references public.sponsoring_organizations(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  status text not null default 'active' check (status in ('active','ended')),
  renewed_from_assignment_id uuid null references public.organization_student_assignments(id) on delete set null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz null,
  unique (organization_id, enrollment_id)
);
create index if not exists organization_student_assignments_org_year_idx
  on public.organization_student_assignments(organization_id, academic_year_id, status);
create index if not exists organization_student_assignments_student_idx
  on public.organization_student_assignments(student_id, academic_year_id);

alter table public.organization_student_assignments enable row level security;
drop policy if exists organization_student_assignments_read on public.organization_student_assignments;
create policy organization_student_assignments_read on public.organization_student_assignments
for select to authenticated using (
  private.has_permission(establishment_id,'settings.read')
  or private.has_permission(establishment_id,'students.read')
  or private.has_permission(establishment_id,'enrollments.manage')
);
grant select on public.organization_student_assignments to authenticated;

create or replace function public.manage_organization_student_assignment(
  p_establishment_id uuid,
  p_organization_id uuid,
  p_enrollment_id uuid,
  p_action text default 'assign',
  p_renewed_from_assignment_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_org public.sponsoring_organizations%rowtype;
  v_assignment public.organization_student_assignments%rowtype;
  v_rule public.organization_coverage_rules%rowtype;
  v_schedule record;
  v_grade_level_id uuid;
  v_option_type text;
  v_covered numeric(12,2);
  v_family_share numeric(12,2);
  v_org_schedule_id uuid;
  v_snapshot_id uuid;
  v_covered_any boolean := false;
  v_remaining numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id,'enrollments.manage') then
    raise exception 'Permission insuffisante pour gérer les prises en charge';
  end if;
  select * into v_org from public.sponsoring_organizations
  where id=p_organization_id and establishment_id=p_establishment_id and active;
  if v_org.id is null then raise exception 'Organisme invalide ou inactif'; end if;
  select * into v_enrollment from public.enrollments
  where id=p_enrollment_id and establishment_id=p_establishment_id and status='active';
  if v_enrollment.id is null then raise exception 'Inscription active introuvable'; end if;

  if p_action='stop' then
    update public.organization_student_assignments
      set status='ended', ended_at=now(), updated_at=now()
    where organization_id=p_organization_id and enrollment_id=p_enrollment_id
      and establishment_id=p_establishment_id and status='active'
    returning * into v_assignment;
    if v_assignment.id is null then raise exception 'Aucune prise en charge active pour cet élève et cette année'; end if;

    -- Les montants déjà encaissés restent attribués à l'organisme.
    -- Les montants non encaissés basculent vers la famille sans effacer l'historique.
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

  insert into public.organization_student_assignments(
    establishment_id,organization_id,student_id,enrollment_id,academic_year_id,status,
    renewed_from_assignment_id,created_by,ended_at
  ) values (
    p_establishment_id,p_organization_id,v_enrollment.student_id,p_enrollment_id,
    v_enrollment.academic_year_id,'active',p_renewed_from_assignment_id,auth.uid(),null
  )
  on conflict(organization_id,enrollment_id) do update
    set status='active',ended_at=null,updated_at=now(),
        renewed_from_assignment_id=coalesce(excluded.renewed_from_assignment_id,organization_student_assignments.renewed_from_assignment_id)
  returning * into v_assignment;

  select sc.grade_level_id into v_grade_level_id
  from public.school_classes sc where sc.id=v_enrollment.class_id and sc.establishment_id=p_establishment_id;

  v_covered_any:=exists(
    select 1 from public.organization_coverage_snapshots
    where enrollment_id=p_enrollment_id and organization_id=p_organization_id
  );

  if not v_covered_any then
    for v_schedule in
      select ps.* from public.payment_schedules ps
      where ps.enrollment_id=p_enrollment_id and ps.payer_type='family'
        and ps.amount_due>ps.amount_paid
      order by ps.priority_rank nulls last,ps.installment_number,ps.id
      for update
    loop
      select so.option_type into v_option_type
      from public.enrollment_options eo
      join public.student_options so on so.id=eo.option_id
      where eo.enrollment_id=p_enrollment_id and so.name=v_schedule.label limit 1;

      select * into v_rule from public.organization_coverage_rules r
      where r.establishment_id=p_establishment_id and r.organization_id=p_organization_id
        and r.category=v_schedule.category and r.active
        and (r.grade_level_id is null or r.grade_level_id=v_grade_level_id)
        and (r.academic_year_id is null or r.academic_year_id=v_enrollment.academic_year_id)
        and (r.option_type is null or r.option_type=v_option_type)
        and (r.valid_from is null or r.valid_from<=v_enrollment.enrollment_date)
        and (r.valid_until is null or r.valid_until>=v_enrollment.enrollment_date)
      order by (r.grade_level_id is not null) desc,(r.academic_year_id is not null) desc,
        (r.option_type is not null) desc,r.created_at desc limit 1;
      if v_rule.id is null or v_rule.coverage_percent<=0 then continue; end if;

      v_covered:=round(v_schedule.amount_due*v_rule.coverage_percent/100,2);
      v_family_share:=greatest(v_schedule.amount_due-v_covered,0);
      if v_covered<=0 then continue; end if;

      insert into public.organization_coverage_snapshots(
        establishment_id,enrollment_id,schedule_id,organization_id,category,option_type,
        coverage_percent,net_amount,organization_amount,family_amount
      ) values (
        p_establishment_id,p_enrollment_id,v_schedule.id,p_organization_id,v_schedule.category,
        v_option_type,v_rule.coverage_percent,v_schedule.amount_due,v_covered,v_family_share
      ) returning id into v_snapshot_id;

      if v_family_share<=0 then
        update public.payment_schedules set payer_type='other',organization_id=p_organization_id,updated_at=now()
        where id=v_schedule.id;
        v_org_schedule_id:=v_schedule.id;
      else
        update public.payment_schedules set amount_due=v_family_share,updated_at=now() where id=v_schedule.id;
        insert into public.payment_schedules(
          enrollment_id,installment_number,label,due_date,amount_due,amount_paid,status,
          payer_type,category,is_refundable,priority_rank,organization_id
        ) values (
          v_schedule.enrollment_id,v_schedule.installment_number,v_schedule.label,v_schedule.due_date,
          v_covered,0,'pending','other',v_schedule.category,v_schedule.is_refundable,
          v_schedule.priority_rank,p_organization_id
        ) returning id into v_org_schedule_id;
        update public.organization_coverage_snapshots set schedule_id=v_org_schedule_id where id=v_snapshot_id;
      end if;
      v_covered_any:=true;
    end loop;
  end if;

  update public.enrollments e set
    funding_source=case when v_covered_any then 'other' else e.funding_source end,
    parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0))
      from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0),
    organization_expected_amount=coalesce((select sum(ps.amount_due)
      from public.payment_schedules ps where ps.enrollment_id=e.id and ps.organization_id is not null),0)
  where e.id=p_enrollment_id;

  return jsonb_build_object('action','assign','assignment_id',v_assignment.id,'has_financial_coverage',v_covered_any);
end;
$$;
revoke all on function public.manage_organization_student_assignment(uuid,uuid,uuid,text,uuid) from anon, public;
grant execute on function public.manage_organization_student_assignment(uuid,uuid,uuid,text,uuid) to authenticated;

-- L’État utilise désormais le même flux que les autres organismes.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.create_student_enrollment_with_family_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid)'::regprocedure)
  into v_definition;
  if position('and o.active and not o.is_state' in v_definition)>0 then
    v_definition:=replace(v_definition,'and o.active and not o.is_state','and o.active');
  end if;
  if position($anchor$  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;$anchor$ in v_definition)>0 then
    v_definition:=replace(v_definition,
      $anchor$  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;$anchor$,
      $replacement$  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;

  if p_organization_id is not null then
    insert into public.organization_student_assignments(
      establishment_id,organization_id,student_id,enrollment_id,academic_year_id,status,created_by
    ) values (
      p_establishment_id,p_organization_id,v_new_student_id,v_enrollment_id,p_academic_year_id,'active',auth.uid()
    )
    on conflict(organization_id,enrollment_id) do update
      set status='active',ended_at=null,updated_at=now();
  end if;$replacement$);
  execute v_definition;
end $$;
