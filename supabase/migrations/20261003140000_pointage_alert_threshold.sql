create or replace function public.pointage_get_alerts(
  p_establishment_id uuid,
  p_date date default null
)
returns table(
  alert_type text,
  teacher_id uuid,
  timetable_slot_id uuid,
  lesson_attendance_id uuid,
  scheduled_start time,
  scheduled_end time,
  status text,
  late_minutes integer
)
language sql
security invoker
stable
set search_path = ''
as $$
  with context as (
    select coalesce(p_date,(now() at time zone e.timezone)::date) as local_date, e.timezone
    from public.establishments e
    where e.id=p_establishment_id
  ),
  active_slots as (
    select ts.id as timetable_slot_id, ts.academic_year_id, ts.starts_at, ts.ends_at,
      cs.teacher_id, c.local_date, c.timezone,
      coalesce(ps.alert_missing_lesson_after_minutes,10) as missing_after_minutes
    from public.timetable_slots ts
    join public.class_subjects cs on cs.id=ts.class_subject_id
    join public.academic_years ay on ay.id=ts.academic_year_id
    join context c on true
    left join public.pointage_settings ps
      on ps.establishment_id=p_establishment_id
     and (ps.academic_year_id is null or ps.academic_year_id=ts.academic_year_id)
    where ts.establishment_id=p_establishment_id
      and ay.status='active'
      and c.local_date between ay.start_date and ay.end_date
      and ts.day_of_week=extract(isodow from (c.local_date::timestamp))::integer
  )
  select
    case
      when tla.id is null and (now() at time zone s.timezone)::time >= (s.starts_at + make_interval(mins => s.missing_after_minutes))::time then 'missing_lesson'
      when tla.id is not null and tla.status='in_progress' and (now() at time zone s.timezone)::time >= s.ends_at then 'lesson_to_close'
      when tla.id is not null and tla.late_minutes > 0 then 'late'
      else 'anomaly'
    end,
    s.teacher_id, s.timetable_slot_id, tla.id, s.starts_at, s.ends_at,
    coalesce(tla.status,'not_started'), coalesce(tla.late_minutes,0)
  from active_slots s
  left join public.teacher_lesson_attendance tla
    on tla.timetable_slot_id=s.timetable_slot_id
   and tla.teacher_id=s.teacher_id
   and tla.attendance_date=s.local_date
  where (tla.id is null and (now() at time zone s.timezone)::time >= (s.starts_at + make_interval(mins => s.missing_after_minutes))::time)
     or (tla.id is not null and tla.status='in_progress' and (now() at time zone s.timezone)::time >= s.ends_at)
     or (tla.id is not null and tla.late_minutes > 0);
$$;

revoke execute on function public.pointage_get_alerts(uuid,date) from public, anon;
grant execute on function public.pointage_get_alerts(uuid,date) to authenticated;
