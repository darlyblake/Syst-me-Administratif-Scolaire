-- Le recalcul est un détail interne du RPC d'inscription, pas une API directe.
revoke all on function public.recalculate_family_discounts(uuid,uuid,uuid) from public, anon, authenticated;

-- Retourner le résumé financier après le recalcul de toute la fratrie.
create or replace function public.create_student_enrollment_with_family_funding(
  p_establishment_id uuid, p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid,
  p_enrollment_date date, p_student_id uuid, p_first_name text, p_last_name text,
  p_student_number text, p_birth_date date, p_sex text, p_phone text, p_email text,
  p_option_ids uuid[], p_paid_installment_ids uuid[], p_pay_options boolean, p_funding_source text,
  p_waive_registration boolean, p_waive_tuition boolean, p_related_student_id uuid,
  p_sibling_relationship text, p_organization_id uuid, p_family_name text, p_apply_family_discount boolean
) returns jsonb
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
  v_family_id uuid;
  v_enrollment_id uuid;
begin
  if auth.uid() is null or not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission refusée';
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
    update public.school_families
    set display_name = coalesce(nullif(trim(p_family_name), ''), display_name),
        family_discount_enabled = coalesce(p_apply_family_discount, false),
        updated_at = now()
    where id = v_family_id and establishment_id = p_establishment_id;

    perform public.recalculate_family_discounts(p_establishment_id, v_family_id, p_academic_year_id);
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
$$;

revoke all on function public.create_student_enrollment_with_family_funding(
  uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid,text,boolean
) from public, anon;
grant execute on function public.create_student_enrollment_with_family_funding(
  uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,uuid,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid,text,boolean
) to authenticated;

notify pgrst, 'reload schema';