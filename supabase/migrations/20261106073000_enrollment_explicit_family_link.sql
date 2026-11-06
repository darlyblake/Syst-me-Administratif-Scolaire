-- Permet de rattacher un nouvel élève à une famille choisie explicitement,
-- y compris lorsque la famille a été créée avant sa première inscription.
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
  p_apply_family_discount boolean,
  p_family_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
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

    update public.school_families
    set family_discount_enabled = coalesce(p_apply_family_discount, false),
        updated_at = now()
    where id = p_family_id and establishment_id = p_establishment_id;

    perform public.recalculate_family_discounts(
      p_establishment_id, p_family_id, p_academic_year_id
    );

    v_result := v_result || jsonb_build_object(
      'family_id', p_family_id,
      'family_name', (select sf.display_name from public.school_families sf where sf.id = p_family_id),
      'family_discount_enabled', coalesce(p_apply_family_discount, false)
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.create_student_enrollment_with_family_funding(
  uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid,text,boolean,uuid
) from public, anon;
grant execute on function public.create_student_enrollment_with_family_funding(
  uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid,text,boolean,uuid
) to authenticated;

notify pgrst, 'reload schema';
