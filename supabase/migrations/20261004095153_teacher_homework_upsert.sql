create unique index if not exists teacher_homework_lesson_unique
on public.teacher_homework(teacher_id,timetable_slot_id,coalesce(lesson_entry_id,'00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.teacher_save_homework(
  p_establishment_id uuid,p_timetable_slot_id uuid,p_lesson_entry_id uuid,p_title text,p_instructions text,p_due_date date default null
)
returns uuid
language plpgsql security definer set search_path to ''
as $$
declare v_teacher_id uuid; v_class_id uuid; v_subject_id uuid; v_academic_year_id uuid; v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  select t.id into v_teacher_id
  from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
  order by t.created_at limit 1;
  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;
  select ts.academic_year_id,cs.class_id,cs.subject_id into v_academic_year_id,v_class_id,v_subject_id
  from public.timetable_slots ts join public.class_subjects cs on cs.id=ts.class_subject_id
  where ts.id=p_timetable_slot_id and ts.establishment_id=p_establishment_id and cs.teacher_id=v_teacher_id;
  if v_class_id is null then raise exception 'Séance non autorisée pour cet enseignant'; end if;
  if p_lesson_entry_id is not null and not exists (
    select 1 from public.teacher_lesson_entries le
    where le.id=p_lesson_entry_id and le.timetable_slot_id=p_timetable_slot_id and le.teacher_id=v_teacher_id
  ) then raise exception 'Séance de cahier invalide'; end if;
  insert into public.teacher_homework(
    establishment_id,academic_year_id,timetable_slot_id,teacher_id,class_id,subject_id,lesson_entry_id,title,instructions,due_date,updated_at
  ) values (
    p_establishment_id,v_academic_year_id,p_timetable_slot_id,v_teacher_id,v_class_id,v_subject_id,p_lesson_entry_id,
    coalesce(nullif(trim(p_title),''),'Devoir'),coalesce(nullif(trim(p_instructions),''),'À faire'),p_due_date,now()
  )
  on conflict (teacher_id,timetable_slot_id,coalesce(lesson_entry_id,'00000000-0000-0000-0000-000000000000'::uuid))
  do update set title=excluded.title,instructions=excluded.instructions,due_date=excluded.due_date,active=true,updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.teacher_save_homework(uuid,uuid,uuid,text,text,date) from public,anon;
grant execute on function public.teacher_save_homework(uuid,uuid,uuid,text,text,date) to authenticated;
