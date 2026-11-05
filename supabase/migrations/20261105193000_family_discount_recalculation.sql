-- Recalcul des réductions familiales pour tous les enfants d'une même famille.
alter table public.school_families
  add column if not exists family_discount_enabled boolean not null default true;

create or replace function public.recalculate_family_discounts(
  p_establishment_id uuid,
  p_family_id uuid,
  p_academic_year_id uuid
) returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_family_enabled boolean;
  v_children_count integer := 0;
  v_schedule record;
  v_rule public.family_discount_rules%rowtype;
  v_original numeric(12,2);
  v_discount numeric(12,2);
  v_net numeric(12,2);
  v_option_type text;
begin
  if auth.uid() is null
     or not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission refusée';
  end if;

  select sf.family_discount_enabled
    into v_family_enabled
  from public.school_families sf
  where sf.id = p_family_id
    and sf.establishment_id = p_establishment_id;

  if not found then
    raise exception 'Famille introuvable';
  end if;

  select count(distinct e.student_id)
    into v_children_count
  from public.student_family_members sfm
  join public.enrollments e
    on e.student_id = sfm.student_id
   and e.establishment_id = sfm.establishment_id
  where sfm.family_id = p_family_id
    and sfm.establishment_id = p_establishment_id
    and sfm.active = true
    and e.academic_year_id = p_academic_year_id
    and e.status = 'active';

  for v_schedule in
    select
      ps.id as schedule_id,
      ps.enrollment_id,
      ps.category,
      ps.label,
      ps.amount_due,
      ps.amount_paid,
      ps.due_date,
      e.enrollment_date
    from public.student_family_members sfm
    join public.enrollments e
      on e.student_id = sfm.student_id
     and e.establishment_id = sfm.establishment_id
    join public.payment_schedules ps
      on ps.enrollment_id = e.id
    where sfm.family_id = p_family_id
      and sfm.establishment_id = p_establishment_id
      and sfm.active = true
      and e.academic_year_id = p_academic_year_id
      and e.status = 'active'
      and ps.payer_type = 'family'
      and not exists (
        select 1
        from public.organization_coverage_snapshots ocs
        where ocs.schedule_id = ps.id
      )
    order by e.id, ps.installment_number, ps.due_date
    for update of ps
  loop
    select eds.original_amount
      into v_original
    from public.enrollment_discount_snapshots eds
    where eds.schedule_id = v_schedule.schedule_id
    order by eds.created_at desc
    limit 1;

    v_original := coalesce(v_original, v_schedule.amount_due);
    v_option_type := null;

    select so.option_type
      into v_option_type
    from public.enrollment_options eo
    join public.student_options so on so.id = eo.option_id
    where eo.enrollment_id = v_schedule.enrollment_id
      and so.name = v_schedule.label
    limit 1;

    v_rule := null;
    if v_family_enabled and v_children_count >= 2 then
      select r.*
        into v_rule
      from public.family_discount_rules r
      where r.establishment_id = p_establishment_id
        and r.active = true
        and (r.academic_year_id is null or r.academic_year_id = p_academic_year_id)
        and r.min_children <= v_children_count
        and (r.max_children is null or r.max_children >= v_children_count)
        and r.applies_to_categories @> array[v_schedule.category]::text[]
        and (
          r.option_type is null
          or exists (
            select 1
            from public.enrollment_options eo
            join public.student_options so on so.id = eo.option_id
            where eo.enrollment_id = v_schedule.enrollment_id
              and so.name = v_schedule.label
              and so.option_type = r.option_type
          )
        )
        and (r.valid_from is null or r.valid_from <= v_schedule.enrollment_date)
        and (r.valid_until is null or r.valid_until >= v_schedule.enrollment_date)
      order by
        r.min_children desc,
        (r.academic_year_id is not null) desc,
        (r.option_type is not null) desc,
        r.created_at desc
      limit 1;
    end if;

    delete from public.enrollment_discount_snapshots
    where schedule_id = v_schedule.schedule_id;

    if v_rule.id is null then
      v_discount := 0;
    else
      v_discount := case
        when v_rule.discount_type = 'percentage'
          then round(v_original * v_rule.discount_value / 100, 2)
        else least(v_original, v_rule.discount_value)
      end;
    end if;

    -- Les paiements déjà encaissés ne sont jamais diminués ni effacés.
    v_net := greatest(v_original - v_discount, coalesce(v_schedule.amount_paid, 0));

    update public.payment_schedules
    set amount_due = v_net,
        status = case
          when coalesce(v_schedule.amount_paid, 0) >= v_net then 'paid'::public.installment_status
          when coalesce(v_schedule.amount_paid, 0) > 0 then 'partial'::public.installment_status
          when v_schedule.due_date < current_date then 'overdue'::public.installment_status
          else 'pending'::public.installment_status
        end,
        updated_at = now()
    where id = v_schedule.schedule_id;

    if v_rule.id is not null and v_original > v_net then
      insert into public.enrollment_discount_snapshots (
        establishment_id, enrollment_id, schedule_id, family_id, rule_id,
        rule_name, category, option_type, discount_type, discount_value,
        original_amount, discount_amount
      ) values (
        p_establishment_id, v_schedule.enrollment_id, v_schedule.schedule_id,
        p_family_id, v_rule.id, v_rule.name, v_schedule.category, v_option_type,
        v_rule.discount_type, v_rule.discount_value, v_original, v_original - v_net
      );
    end if;
  end loop;

  update public.enrollments e
  set parent_payable_amount = coalesce((
        select sum(greatest(ps.amount_due - ps.amount_paid, 0))
        from public.payment_schedules ps
        where ps.enrollment_id = e.id and ps.payer_type = 'family'
      ), 0),
      updated_at = now()
  where e.establishment_id = p_establishment_id
    and e.academic_year_id = p_academic_year_id
    and e.status = 'active'
    and e.student_id in (
      select sfm.student_id
      from public.student_family_members sfm
      where sfm.establishment_id = p_establishment_id
        and sfm.family_id = p_family_id
        and sfm.active = true
    );
end;
$$;

revoke all on function public.recalculate_family_discounts(uuid,uuid,uuid) from public, anon;
grant execute on function public.recalculate_family_discounts(uuid,uuid,uuid) to authenticated;

-- Nouvelle signature : ajoute le nom de famille et l'activation de la réduction.
-- L'ancienne fonction reste appelée en interne pour conserver toute la logique d'inscription.
create or replace function public.create_student_enrollment_with_family_funding(
  p_establishment_id uuid,
  p_academic_year_id uuid,
  p_class_id uuid,
  p_tuition_plan_id uuid,
  p_enrollment_date date,
  p_student_id uuid,
  p_first_name text,
  p_last_name text,
  p_student_number text,
  p_birth_date date,
  p_sex text,
  p_phone text,
  p_email text,
  p_option_ids uuid[],
  p_paid_installment_ids uuid[],
  p_pay_options boolean,
  p_funding_source text,
  p_waive_registration boolean,
  p_waive_tuition boolean,
  p_related_student_id uuid,
  p_sibling_relationship text,
  p_organization_id uuid,
  p_family_name text,
  p_apply_family_discount boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
  v_family_id uuid;
begin
  if auth.uid() is null
     or not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission refusée';
  end if;

  v_result := public.create_student_enrollment_with_family_funding(
    p_establishment_id, p_academic_year_id, p_class_id, p_tuition_plan_id,
    p_enrollment_date, p_student_id, p_first_name, p_last_name,
    p_student_number, p_birth_date, p_sex, p_phone, p_email,
    coalesce(p_option_ids, '{}'::uuid[]),
    coalesce(p_paid_installment_ids, '{}'::uuid[]),
    coalesce(p_pay_options, false), p_funding_source,
    coalesce(p_waive_registration, false), coalesce(p_waive_tuition, false),
    p_related_student_id, coalesce(p_sibling_relationship, 'autre'), p_organization_id
  );

  v_family_id := nullif(v_result->>'family_id', '')::uuid;
  if v_family_id is not null then
    update public.school_families
    set display_name = coalesce(nullif(trim(p_family_name), ''), display_name),
        family_discount_enabled = coalesce(p_apply_family_discount, false),
        updated_at = now()
    where id = v_family_id
      and establishment_id = p_establishment_id;

    perform public.recalculate_family_discounts(
      p_establishment_id, v_family_id, p_academic_year_id
    );

    v_result := v_result || jsonb_build_object(
      'family_id', v_family_id,
      'family_name', (select sf.display_name from public.school_families sf where sf.id = v_family_id),
      'family_discount_enabled', coalesce(p_apply_family_discount, false)
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.create_student_enrollment_with_family_funding(
  uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid,text,boolean
) from public, anon;
grant execute on function public.create_student_enrollment_with_family_funding(
  uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid,text,boolean
) to authenticated;

notify pgrst, 'reload schema';
