create or replace function public.validate_tuition_plan_hierarchy()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare le uuid; ye uuid;
begin
  select ec.establishment_id into le
  from public.grade_levels gl
  join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=new.grade_level_id;

  select ay.establishment_id into ye
  from public.academic_years ay
  where ay.id=new.academic_year_id;

  if le is null or le<>new.establishment_id or ye is null or ye<>new.establishment_id then
    raise exception 'Le tarif doit appartenir au meme etablissement que son niveau et son annee';
  end if;
  return new;
end;
$function$;

revoke all on function public.validate_tuition_plan_hierarchy() from public,anon,authenticated;
