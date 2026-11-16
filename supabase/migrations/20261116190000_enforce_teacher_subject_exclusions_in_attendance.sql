-- Une exclusion enseignant approuvée bloque uniquement la matière concernée.
DROP FUNCTION IF EXISTS public.teacher_attendance_for_lesson(uuid,uuid,uuid,date);
CREATE FUNCTION public.teacher_attendance_for_lesson(p_establishment_id uuid,p_class_id uuid,p_timetable_slot_id uuid,p_date date)
RETURNS TABLE(student_id uuid,first_name text,last_name text,student_number text,status text,reason text,
 administrative_excluded boolean,administrative_exclusion_reason text,administrative_exclusion_end_date date,administrative_exclusion_permanent boolean,
 course_excluded boolean,course_exclusion_reason text,course_exclusion_end_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $function$
 select distinct on(st.id)
  st.id,st.first_name,st.last_name,st.student_number,ar.status,ar.reason,
  (ae.id is not null),ae.reason,ae.end_date,coalesce(ae.is_permanent,false),
  (ce.id is not null),ce.reason,ce.end_date
 from public.timetable_slots ts
 join public.class_subjects cs on cs.id=ts.class_subject_id and cs.class_id=p_class_id
 join public.enrollments en on en.establishment_id=p_establishment_id and en.class_id=p_class_id and en.status='active'
 join public.academic_years ay on ay.id=en.academic_year_id and ay.status='active' and ay.start_date<=p_date and ay.end_date>=p_date
 join public.students st on st.id=en.student_id and st.active=true
 left join lateral (
  select attendance.status,attendance.reason from public.attendance_records attendance
  where attendance.establishment_id=p_establishment_id and attendance.class_id=p_class_id
   and attendance.student_id=st.id and attendance.attendance_date=p_date and attendance.lesson_key=p_timetable_slot_id::text
  order by attendance.updated_at desc nulls last limit 1
 ) ar on true
 left join lateral (
  select x.id,x.reason,x.end_date,x.is_permanent from public.administrative_exclusions x
  where x.establishment_id=p_establishment_id and x.student_id=st.id and x.class_id=p_class_id
   and x.status='active' and x.start_date<=p_date and (x.is_permanent or x.end_date>=p_date)
  order by x.created_at desc limit 1
 ) ae on true
 left join lateral (
  select x.id,x.reason,x.end_date from public.course_exclusions x
  where x.establishment_id=p_establishment_id and x.student_id=st.id and x.class_id=p_class_id
   and x.subject_id=cs.subject_id and x.status='approved'
   and ((x.scope='current_lesson' and x.lesson_date=p_date and x.timetable_slot_id=p_timetable_slot_id)
     or (x.scope='same_subject_until' and x.lesson_date<=p_date and x.end_date>=p_date))
  order by x.created_at desc limit 1
 ) ce on true
 where ts.id=p_timetable_slot_id and ts.establishment_id=p_establishment_id and ts.academic_year_id=ay.id
  and private.is_teacher_for_class_subject(cs.class_id,cs.subject_id)
 order by st.id,en.created_at desc nulls last;
$function$;
REVOKE ALL ON FUNCTION public.teacher_attendance_for_lesson(uuid,uuid,uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.teacher_attendance_for_lesson(uuid,uuid,uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_record_attendance_batch(p_establishment_id uuid,p_timetable_slot_id uuid,p_class_id uuid,p_date date,p_records jsonb)
RETURNS integer LANGUAGE plpgsql SET search_path TO 'public' AS $function$
declare v_teacher_id uuid; v_day integer; v_start time; v_end time; v_academic_year_id uuid;
 v_timezone text; v_local_now timestamp; r jsonb; v_count integer:=0; v_subject_id uuid;
begin
 select t.id into v_teacher_id from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
 where t.profile_id=auth.uid() and t.active=true and te.establishment_id=p_establishment_id and te.status='active' limit 1;
 if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;
 select ts.day_of_week,ts.starts_at,ts.ends_at,ts.academic_year_id,cs.subject_id
 into v_day,v_start,v_end,v_academic_year_id,v_subject_id
 from public.timetable_slots ts join public.class_subjects cs on cs.id=ts.class_subject_id
 where ts.id=p_timetable_slot_id and ts.establishment_id=p_establishment_id and cs.class_id=p_class_id and cs.teacher_id=v_teacher_id limit 1;
 if v_start is null then raise exception 'Aucun cours correspondant à cette classe et cette période'; end if;
 if not exists(select 1 from public.academic_years ay where ay.id=v_academic_year_id and ay.status='active' and p_date between ay.start_date and ay.end_date) then
  raise exception 'Cette période ne correspond pas à l''année académique active'; end if;
 if extract(isodow from p_date)::integer<>v_day then raise exception 'Cette période de cours n''est pas prévue ce jour'; end if;
 select coalesce(e.timezone,'Africa/Libreville') into v_timezone from public.establishments e where e.id=p_establishment_id;
 if v_timezone is null then raise exception 'Établissement introuvable'; end if;
 v_local_now:=timezone(v_timezone,now());
 if p_date<>v_local_now::date then raise exception 'L''appel doit être enregistré le jour du cours'; end if;
 if v_local_now::time<v_start or v_local_now::time>v_end+interval '15 minutes' then
  raise exception 'L''appel est modifiable pendant le cours et jusqu''à 15 minutes après sa fin'; end if;
 if p_records is null or jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)=0 then
  raise exception 'La liste des présences est invalide'; end if;
 for r in select value from jsonb_array_elements(p_records) loop
  if (r->>'status') not in ('present','absent','late','excused') then raise exception 'Statut de présence invalide'; end if;
  if not exists(select 1 from public.enrollments en where en.student_id=(r->>'student_id')::uuid and en.class_id=p_class_id
   and en.establishment_id=p_establishment_id and en.status='active' and en.academic_year_id=v_academic_year_id) then
   raise exception 'Un élève n''est pas inscrit dans cette classe pour l''année académique active'; end if;
  if exists(select 1 from public.administrative_exclusions ae where ae.establishment_id=p_establishment_id
   and ae.student_id=(r->>'student_id')::uuid and ae.class_id=p_class_id and ae.status='active'
   and ae.start_date<=p_date and (ae.is_permanent or ae.end_date>=p_date)) then
   raise exception 'Un élève est sous exclusion administrative globale. L''appel ne peut pas être enregistré pour cet élève.'; end if;
  if exists(select 1 from public.course_exclusions ce where ce.establishment_id=p_establishment_id
   and ce.student_id=(r->>'student_id')::uuid and ce.class_id=p_class_id and ce.subject_id=v_subject_id and ce.status='approved'
   and ((ce.scope='current_lesson' and ce.lesson_date=p_date and ce.timetable_slot_id=p_timetable_slot_id)
    or (ce.scope='same_subject_until' and ce.lesson_date<=p_date and ce.end_date>=p_date))) then
   raise exception 'Cet élève est exclu de ce cours ou de cette matière pendant la période concernée.'; end if;
  insert into public.attendance_records(establishment_id,student_id,class_id,subject_id,attendance_date,status,reason,recorded_by,lesson_key)
  values(p_establishment_id,(r->>'student_id')::uuid,p_class_id,v_subject_id,p_date,r->>'status',nullif(r->>'reason',''),auth.uid(),p_timetable_slot_id::text)
  on conflict(student_id,attendance_date,lesson_key) do update set class_id=excluded.class_id,subject_id=excluded.subject_id,
   status=excluded.status,reason=excluded.reason,recorded_by=auth.uid(),updated_at=now();
  v_count:=v_count+1;
 end loop;
 return v_count;
end; $function$;
NOTIFY pgrst, 'reload schema';
