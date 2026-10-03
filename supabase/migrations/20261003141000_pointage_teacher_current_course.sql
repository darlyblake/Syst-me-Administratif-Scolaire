create or replace function public.pointage_current_teacher_course(
  p_establishment_id uuid
)
returns table(
  timetable_slot_id uuid,
  academic_year_id uuid,
  class_id uuid,
  subject_id uuid,
  scheduled_start time,
  scheduled_end time,
  late_minutes integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare v_teacher_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  select t.id into v_teacher_id
  from public.teachers t
  join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=(select auth.uid()) and t.active=true
    and te.establishment_id=p_establishment_id and te.status='active'
  order by t.created_at limit 1;
  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;
  return query select * from public.pointage_find_current_lesson(v_teacher_id,p_establishment_id,now());
end;
$$;

revoke execute on function public.pointage_current_teacher_course(uuid) from public, anon;
grant execute on function public.pointage_current_teacher_course(uuid) to authenticated;
