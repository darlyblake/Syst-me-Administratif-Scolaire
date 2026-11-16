create or replace function public.teacher_attendance_for_lesson(
  p_establishment_id uuid,
  p_class_id uuid,
  p_timetable_slot_id uuid,
  p_date date
)
returns table(
  student_id uuid,
  first_name text,
  last_name text,
  student_number text,
  status text,
  reason text
)
language sql
stable
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
  select distinct on (st.id)
    st.id,
    st.first_name,
    st.last_name,
    st.student_number,
    ar.status,
    ar.reason
  from public.timetable_slots ts
  join public.class_subjects cs
    on cs.id = ts.class_subject_id
   and cs.class_id = p_class_id
  join public.enrollments en
    on en.establishment_id = p_establishment_id
   and en.class_id = p_class_id
   and en.status = 'active'
  join public.academic_years ay
    on ay.id = en.academic_year_id
   and ay.status = 'active'
   and ay.start_date <= p_date
   and ay.end_date >= p_date
  join public.students st
    on st.id = en.student_id
   and st.active = true
  left join lateral (
    select attendance.status, attendance.reason
    from public.attendance_records attendance
    where attendance.establishment_id = p_establishment_id
      and attendance.class_id = p_class_id
      and attendance.student_id = st.id
      and attendance.attendance_date = p_date
      and attendance.lesson_key = p_timetable_slot_id::text
    order by attendance.updated_at desc nulls last
    limit 1
  ) ar on true
  where ts.id = p_timetable_slot_id
    and ts.establishment_id = p_establishment_id
    and ts.academic_year_id = ay.id
    and private.is_teacher_for_class_subject(cs.class_id, cs.subject_id)
  order by st.id, en.created_at desc nulls last;
$function$;

revoke all on function public.teacher_attendance_for_lesson(uuid, uuid, uuid, date) from public;
grant execute on function public.teacher_attendance_for_lesson(uuid, uuid, uuid, date) to authenticated;
