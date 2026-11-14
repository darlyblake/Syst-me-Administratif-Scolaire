-- Avoid reminders for timetable slots with no active students.
CREATE OR REPLACE FUNCTION private.notify_missing_attendance_calls()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_slot record;
  v_admin record;
  v_count integer := 0;
  v_local_now timestamp;
begin
  for v_slot in
    select ts.id as slot_id, ts.establishment_id, ts.day_of_week, ts.starts_at, ts.ends_at,
           cs.class_id, cs.subject_id, sub.name as subject_name, sc.name as class_name,
           e.timezone
    from public.timetable_slots ts
    join public.class_subjects cs on cs.id = ts.class_subject_id
    left join public.subjects sub on sub.id = cs.subject_id
    left join public.school_classes sc on sc.id = cs.class_id
    join public.establishments e on e.id = ts.establishment_id
    join public.academic_years ay on ay.id = ts.academic_year_id
    where ay.status = 'active'
      and ts.day_of_week = extract(dow from (now() at time zone coalesce(e.timezone,'Africa/Libreville')))::integer
      and (now() at time zone coalesce(e.timezone,'Africa/Libreville'))::time
          > ts.ends_at + interval '15 minutes'
      and exists (
        select 1 from public.enrollments en
        where en.establishment_id = ts.establishment_id
          and en.class_id = cs.class_id
          and en.status = 'active'
      )
      and not exists (
        select 1 from public.attendance_records ar
        where ar.establishment_id = ts.establishment_id
          and ar.class_id = cs.class_id
          and ar.subject_id = cs.subject_id
          and ar.attendance_date = (now() at time zone coalesce(e.timezone,'Africa/Libreville'))::date
          and ar.lesson_key = ts.id::text
      )
  loop
    for v_admin in
      select em.user_id
      from public.establishment_members em
      where em.establishment_id = v_slot.establishment_id
        and em.active = true
        and private.has_permission(v_slot.establishment_id, 'attendance.manage', em.user_id)
    loop
      if not exists (
        select 1 from public.notifications n
        where n.establishment_id = v_slot.establishment_id
          and n.recipient_user_id = v_admin.user_id
          and n.type = 'attendance_call_missing'
          and n.entity_type = 'timetable_slot'
          and n.entity_id = v_slot.slot_id
          and n.created_at >= date_trunc('day', now())
      ) then
        insert into public.notifications(
          establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
        ) values (
          v_slot.establishment_id, v_admin.user_id, 'attendance_call_missing',
          'Appel non effectué',
          'L’appel de ' || coalesce(v_slot.class_name, 'la classe') || ' – ' ||
            coalesce(v_slot.subject_name, 'cours') || ' (' ||
            to_char(v_slot.starts_at, 'HH24:MI') || '–' ||
            to_char(v_slot.ends_at, 'HH24:MI') || ') n’a pas encore été enregistré.',
          'timetable_slot', v_slot.slot_id
        );
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$function$
;

revoke all on function private.notify_missing_attendance_calls() from public, anon, authenticated;
grant execute on function private.notify_missing_attendance_calls() to service_role;