create or replace function public.pointage_teacher_active_course(p_establishment_id uuid)
returns table(
  attendance_id uuid,
  timetable_slot_id uuid,
  academic_year_id uuid,
  class_id uuid,
  subject_id uuid,
  scheduled_start time,
  scheduled_end time,
  started_time time,
  ended_time time,
  late_minutes integer,
  counted_hours numeric,
  status text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_teacher_id uuid;
  v_timezone text;
  v_local timestamp;
  v_date date;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;

  select t.id into v_teacher_id
  from public.teachers t
  join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=(select auth.uid())
    and t.active=true
    and te.establishment_id=p_establishment_id
    and te.status='active'
  order by t.created_at
  limit 1;

  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;

  select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
  v_local:=now() at time zone v_timezone;
  v_date:=v_local::date;

  return query
  select tla.id,tla.timetable_slot_id,tla.academic_year_id,cs.class_id,cs.subject_id,
         ts.starts_at,ts.ends_at,tla.started_time,tla.ended_time,tla.late_minutes,tla.counted_hours,tla.status
  from public.teacher_lesson_attendance tla
  join public.timetable_slots ts on ts.id=tla.timetable_slot_id
  join public.class_subjects cs on cs.id=ts.class_subject_id
  where tla.establishment_id=p_establishment_id
    and tla.teacher_id=v_teacher_id
    and tla.attendance_date=v_date
    and tla.status='in_progress'
  order by tla.started_time desc
  limit 1;

  if found then return; end if;

  return query
  select null::uuid,c.timetable_slot_id,c.academic_year_id,c.class_id,c.subject_id,
         c.scheduled_start,c.scheduled_end,null::time,null::time,c.late_minutes,null::numeric,'scheduled'::text
  from public.pointage_find_current_lesson(v_teacher_id,p_establishment_id,now()) c;
end;
$function$;
