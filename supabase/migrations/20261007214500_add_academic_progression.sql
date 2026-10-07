create or replace function public.get_student_next_academic_progression(
  p_establishment_id uuid,
  p_student_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $function$
declare
  v_current_cycle_id uuid;
  v_current_level_id uuid;
  v_current_level_order integer;
  v_current_cycle_order integer;
  v_next_level record;
  v_next_cycle record;
begin
  select sc.grade_level_id
    into v_current_level_id
  from public.enrollments e
  join public.academic_years ay on ay.id=e.academic_year_id
  join public.school_classes sc on sc.id=e.class_id
  where e.establishment_id=p_establishment_id
    and e.student_id=p_student_id
    and e.status <> 'cancelled'
  order by ay.start_date desc nulls last, e.created_at desc
  limit 1;

  if v_current_level_id is null then
    return jsonb_build_object('available',false,'reason','no_current_level');
  end if;

  select gl.cycle_id, gl.display_order, ec.display_order
    into v_current_cycle_id, v_current_level_order, v_current_cycle_order
  from public.grade_levels gl
  join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=v_current_level_id and gl.active=true and ec.active=true;

  select gl.id, gl.name, gl.code, gl.cycle_id, ec.name as cycle_name
    into v_next_level
  from public.grade_levels gl
  join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.cycle_id=v_current_cycle_id and gl.active=true and ec.active=true
    and gl.display_order > v_current_level_order
  order by gl.display_order
  limit 1;

  if found then
    return jsonb_build_object('available',true,'transitioned_cycle',false,
      'cycle_id',v_next_level.cycle_id,'cycle_name',v_next_level.cycle_name,
      'level_id',v_next_level.id,'level_name',v_next_level.name,
      'level_code',v_next_level.code,'reason','next_level');
  end if;

  select ec.id, ec.name, ec.code, ec.display_order
    into v_next_cycle
  from public.education_cycles ec
  where ec.establishment_id=p_establishment_id and ec.active=true
    and ec.display_order > v_current_cycle_order
  order by ec.display_order
  limit 1;

  if found then
    select gl.id, gl.name, gl.code
      into v_next_level
    from public.grade_levels gl
    where gl.cycle_id=v_next_cycle.id and gl.active=true
    order by gl.display_order
    limit 1;

    if found then
      return jsonb_build_object('available',true,'transitioned_cycle',true,
        'cycle_id',v_next_cycle.id,'cycle_name',v_next_cycle.name,
        'level_id',v_next_level.id,'level_name',v_next_level.name,
        'level_code',v_next_level.code,'reason','next_cycle');
    end if;
  end if;

  return jsonb_build_object('available',false,'reason','end_of_school_structure');
end;
$function$;

revoke all on function public.get_student_next_academic_progression(uuid,uuid) from public;
grant execute on function public.get_student_next_academic_progression(uuid,uuid) to authenticated;
