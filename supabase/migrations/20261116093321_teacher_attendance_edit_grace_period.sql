create or replace function public.teacher_record_attendance_batch(
  p_establishment_id uuid,
  p_timetable_slot_id uuid,
  p_class_id uuid,
  p_date date,
  p_records jsonb
)
returns integer
language plpgsql
set search_path to 'public'
as $function$
declare
  v_teacher_id uuid;
  v_day integer;
  v_start time;
  v_end time;
  v_academic_year_id uuid;
  v_timezone text;
  v_local_now timestamp;
  r jsonb;
  v_count integer := 0;
begin
  select t.id
    into v_teacher_id
  from public.teachers t
  join public.teacher_establishments te on te.teacher_id = t.id
  where t.profile_id = auth.uid()
    and t.active = true
    and te.establishment_id = p_establishment_id
    and te.status = 'active'
  limit 1;

  if v_teacher_id is null then
    raise exception 'Enseignant non rattaché à cet établissement';
  end if;

  select ts.day_of_week, ts.starts_at, ts.ends_at, ts.academic_year_id
    into v_day, v_start, v_end, v_academic_year_id
  from public.timetable_slots ts
  join public.class_subjects cs on cs.id = ts.class_subject_id
  where ts.id = p_timetable_slot_id
    and ts.establishment_id = p_establishment_id
    and cs.class_id = p_class_id
    and cs.teacher_id = v_teacher_id
  limit 1;

  if v_start is null then
    raise exception 'Aucun cours correspondant à cette classe et cette période';
  end if;

  if not exists (
    select 1
    from public.academic_years ay
    where ay.id = v_academic_year_id
      and ay.status = 'active'
      and p_date between ay.start_date and ay.end_date
  ) then
    raise exception 'Cette période ne correspond pas à l''année académique active';
  end if;

  if extract(isodow from p_date)::integer <> v_day then
    raise exception 'Cette période de cours n''est pas prévue ce jour';
  end if;

  select coalesce(e.timezone, 'Africa/Libreville')
    into v_timezone
  from public.establishments e
  where e.id = p_establishment_id;

  if v_timezone is null then
    raise exception 'Établissement introuvable';
  end if;

  v_local_now := timezone(v_timezone, now());

  if p_date <> v_local_now::date then
    raise exception 'L''appel doit être enregistré le jour du cours';
  end if;

  if v_local_now::time < v_start
     or v_local_now::time > v_end + interval '15 minutes' then
    raise exception 'L''appel est modifiable pendant le cours et jusqu''à 15 minutes après sa fin';
  end if;

  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'La liste des présences est invalide';
  end if;

  if jsonb_array_length(p_records) = 0 then
    raise exception 'Aucun élève à enregistrer';
  end if;

  for r in select value from jsonb_array_elements(p_records) loop
    if (r->>'status') not in ('present', 'absent', 'late', 'excused') then
      raise exception 'Statut de présence invalide';
    end if;

    if not exists (
      select 1
      from public.enrollments en
      where en.student_id = (r->>'student_id')::uuid
        and en.class_id = p_class_id
        and en.establishment_id = p_establishment_id
        and en.status = 'active'
        and en.academic_year_id = v_academic_year_id
    ) then
      raise exception 'Un élève n''est pas inscrit dans cette classe pour l''année académique active';
    end if;

    insert into public.attendance_records(
      establishment_id,
      student_id,
      class_id,
      subject_id,
      attendance_date,
      status,
      reason,
      recorded_by,
      lesson_key
    )
    select
      p_establishment_id,
      (r->>'student_id')::uuid,
      p_class_id,
      cs.subject_id,
      p_date,
      r->>'status',
      nullif(r->>'reason', ''),
      auth.uid(),
      p_timetable_slot_id::text
    from public.class_subjects cs
    where cs.id = (
      select ts.class_subject_id
      from public.timetable_slots ts
      where ts.id = p_timetable_slot_id
    )
    on conflict (student_id, attendance_date, lesson_key)
    do update set
      class_id = excluded.class_id,
      subject_id = excluded.subject_id,
      status = excluded.status,
      reason = excluded.reason,
      recorded_by = auth.uid(),
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;
