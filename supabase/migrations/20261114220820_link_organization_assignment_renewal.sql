-- Lie explicitement une prise en charge renouvelée à celle de l'exercice précédent.
-- Les deux affectations restent distinctes afin de préserver l'historique annuel.
create or replace function public.link_organization_assignment_renewal(
  p_establishment_id uuid,
  p_new_enrollment_id uuid,
  p_previous_assignment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_previous public.organization_student_assignments%rowtype;
  v_current public.organization_student_assignments%rowtype;
  v_previous_start date;
  v_current_start date;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission insuffisante pour renouveler une prise en charge';
  end if;

  select osa.* into v_previous
  from public.organization_student_assignments osa
  where osa.id = p_previous_assignment_id
    and osa.establishment_id = p_establishment_id;

  if v_previous.id is null then
    raise exception 'La prise en charge de l''année précédente est introuvable';
  end if;

  select osa.* into v_current
  from public.organization_student_assignments osa
  where osa.enrollment_id = p_new_enrollment_id
    and osa.establishment_id = p_establishment_id
    and osa.organization_id = v_previous.organization_id
    and osa.student_id = v_previous.student_id
    and osa.status = 'active'
  for update;

  if v_current.id is null then
    raise exception 'Aucune prise en charge active correspondante dans la nouvelle inscription';
  end if;

  select ay.start_date into v_previous_start
  from public.academic_years ay
  where ay.id = v_previous.academic_year_id
    and ay.establishment_id = p_establishment_id;

  select ay.start_date into v_current_start
  from public.academic_years ay
  where ay.id = v_current.academic_year_id
    and ay.establishment_id = p_establishment_id;

  if v_previous_start is null or v_current_start is null or v_current_start <= v_previous_start then
    raise exception 'Le renouvellement doit concerner une année académique postérieure';
  end if;

  update public.organization_student_assignments
  set renewed_from_assignment_id = v_previous.id,
      updated_at = now()
  where id = v_current.id;

  return jsonb_build_object(
    'assignment_id', v_current.id,
    'renewed_from_assignment_id', v_previous.id,
    'academic_year_id', v_current.academic_year_id
  );
end;
$$;

revoke all on function public.link_organization_assignment_renewal(uuid,uuid,uuid) from public, anon;
grant execute on function public.link_organization_assignment_renewal(uuid,uuid,uuid) to authenticated;
