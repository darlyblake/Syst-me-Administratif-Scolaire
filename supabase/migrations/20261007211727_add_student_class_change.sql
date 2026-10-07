create or replace function public.change_student_enrollment_class(
  p_establishment_id uuid,
  p_enrollment_id uuid,
  p_class_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_enrollment public.enrollments%rowtype;
  v_new_class public.school_classes%rowtype;
  v_current_grade_id uuid;
  v_new_grade_id uuid;
  v_active_year uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if not private.has_permission(p_establishment_id,'enrollments.manage')
     and not private.has_permission(p_establishment_id,'students.manage') then
    raise exception 'Permission refusee';
  end if;

  select id into v_active_year
  from public.academic_years
  where establishment_id=p_establishment_id and status='active'
  order by updated_at desc, created_at desc
  limit 1;

  if v_active_year is null then
    raise exception 'Aucune annee scolaire active pour cet etablissement';
  end if;

  select *
  into v_enrollment
  from public.enrollments
  where id=p_enrollment_id
    and establishment_id=p_establishment_id
    and academic_year_id=v_active_year
    and coalesce(status,'active') <> 'cancelled'
  for update;

  if not found then
    raise exception 'Inscription introuvable ou inactive';
  end if;

  select * into v_new_class
  from public.school_classes
  where id=p_class_id
    and establishment_id=p_establishment_id
    and active=true;

  if not found then
    raise exception 'Classe introuvable ou inactive';
  end if;

  v_new_grade_id := v_new_class.grade_level_id;

  if v_enrollment.class_id is not null then
    select grade_level_id into v_current_grade_id
    from public.school_classes
    where id=v_enrollment.class_id
      and establishment_id=p_establishment_id;
  else
    select grade_level_id into v_current_grade_id
    from public.tuition_plans
    where id=v_enrollment.tuition_plan_id
      and establishment_id=p_establishment_id
      and active=true;
  end if;

  if v_current_grade_id is null then
    raise exception 'Impossible de determiner le niveau de l''inscription';
  end if;

  if v_current_grade_id <> v_new_grade_id then
    raise exception 'class_level_mismatch';
  end if;

  if v_enrollment.class_id = p_class_id then
    return jsonb_build_object('changed',false,'enrollment_id',v_enrollment.id,'student_id',v_enrollment.student_id,'class_id',p_class_id,'message','L''eleve est deja dans cette classe');
  end if;

  update public.enrollments
  set class_id=p_class_id, updated_at=now()
  where id=v_enrollment.id;

  return jsonb_build_object('changed',true,'enrollment_id',v_enrollment.id,'student_id',v_enrollment.student_id,'class_id',p_class_id,'previous_class_id',v_enrollment.class_id);
end;
$function$;

revoke all on function public.change_student_enrollment_class(uuid,uuid,uuid) from public;
grant execute on function public.change_student_enrollment_class(uuid,uuid,uuid) to authenticated;
