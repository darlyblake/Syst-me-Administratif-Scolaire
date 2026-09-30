-- Attendance is recorded per scheduled lesson.
alter table public.attendance_records
  add column if not exists subject_id uuid references public.subjects(id),
  add column if not exists lesson_key text;

update public.attendance_records
set lesson_key = coalesce(lesson_key, 'legacy')
where lesson_key is null;

alter table public.attendance_records
  alter column lesson_key set default 'legacy',
  alter column lesson_key set not null;

alter table public.attendance_records
  drop constraint if exists attendance_records_student_id_attendance_date_key;

create unique index if not exists attendance_records_student_date_lesson_key
  on public.attendance_records(student_id, attendance_date, lesson_key);

create index if not exists idx_attendance_class_date_lesson
  on public.attendance_records(class_id, attendance_date, lesson_key);

create or replace function public.record_lesson_attendance(
  p_establishment_id uuid,
  p_student_id uuid,
  p_class_id uuid,
  p_subject_id uuid,
  p_date date,
  p_lesson_key text,
  p_status text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_id uuid;
  v_is_privileged boolean;
  v_teacher_allowed boolean;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;

  v_is_privileged := exists (
    select 1 from public.establishment_members m
    where m.establishment_id=p_establishment_id
      and m.user_id=auth.uid()
      and m.active=true
      and m.role in ('owner','admin','director','supervisor')
  ) or private.is_platform_admin(auth.uid());

  v_teacher_allowed := exists (
    select 1
    from public.class_subjects cs
    join public.teachers t on t.id=cs.teacher_id
    join public.teacher_establishments te on te.teacher_id=t.id
    where cs.class_id=p_class_id
      and cs.subject_id=p_subject_id
      and t.profile_id=auth.uid()
      and t.active=true
      and te.establishment_id=p_establishment_id
      and te.status='active'
  );

  if not v_is_privileged and not v_teacher_allowed then
    raise exception 'Vous n''êtes pas autorisé à faire l''appel pour cette matière et cette classe';
  end if;

  if p_status not in ('present','absent','late','justified','excused') then
    raise exception 'Statut de présence invalide';
  end if;

  if nullif(trim(p_lesson_key), '') is null then
    raise exception 'Le créneau de cours est requis';
  end if;

  if not exists (
    select 1 from public.enrollments e
    where e.student_id=p_student_id and e.class_id=p_class_id
      and e.establishment_id=p_establishment_id and e.status='active'
  ) then
    raise exception 'Élève non inscrit dans cette classe';
  end if;

  if not exists (
    select 1 from public.class_subjects cs
    where cs.class_id=p_class_id and cs.subject_id=p_subject_id
  ) then
    raise exception 'Cette matière n''est pas affectée à cette classe';
  end if;

  insert into public.attendance_records(
    establishment_id,student_id,class_id,subject_id,attendance_date,lesson_key,status,reason,recorded_by
  ) values (
    p_establishment_id,p_student_id,p_class_id,p_subject_id,p_date,p_lesson_key,p_status,p_reason,auth.uid()
  )
  on conflict (student_id,attendance_date,lesson_key) do update
  set class_id=excluded.class_id,subject_id=excluded.subject_id,status=excluded.status,
      reason=excluded.reason,recorded_by=auth.uid(),updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.record_lesson_attendance(uuid,uuid,uuid,uuid,date,text,text,text) from public;
grant execute on function public.record_lesson_attendance(uuid,uuid,uuid,uuid,date,text,text,text) to authenticated;
