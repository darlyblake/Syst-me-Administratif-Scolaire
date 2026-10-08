-- Présence par cours, notifications parent et justificatifs
alter table public.attendance_justification_requests
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size_bytes bigint;

create index if not exists idx_attendance_justification_status_establishment
  on public.attendance_justification_requests(establishment_id,status,created_at desc);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('attendance-justifications','attendance-justifications',false,10485760,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Parents upload attendance justification files" on storage.objects;
create policy "Parents upload attendance justification files" on storage.objects for insert to authenticated
with check (
  bucket_id='attendance-justifications'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.attendance_justification_requests r
    where r.parent_user_id=(select auth.uid())
      and r.attachment_path is null
      and r.id::text=(storage.foldername(name))[2]
  )
);

drop policy if exists "Parents view own attendance justification files" on storage.objects;
create policy "Parents view own attendance justification files" on storage.objects for select to authenticated
using (
  bucket_id='attendance-justifications'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists (
      select 1 from public.attendance_justification_requests r
      where r.attachment_path=name and private.is_member(r.establishment_id)
    )
  )
);

drop policy if exists "Parents attach file to own pending attendance justification" on public.attendance_justification_requests;
create policy "Parents attach file to own pending attendance justification"
on public.attendance_justification_requests for update to authenticated
using (parent_user_id=(select auth.uid()) and status='pending')
with check (parent_user_id=(select auth.uid()) and status='pending');

-- Le batch enseignant doit créer une présence par créneau, pas une seule par journée.
drop function if exists public.teacher_record_attendance_batch(uuid,uuid,uuid,date,jsonb);
create function public.teacher_record_attendance_batch(
  p_establishment_id uuid,p_timetable_slot_id uuid,p_class_id uuid,p_date date,p_records jsonb
)
returns integer language plpgsql security invoker set search_path=public
as $$
declare v_teacher_id uuid;v_day integer;v_start time;v_end time;v_academic_year_id uuid;r jsonb;v_count integer:=0;
begin
  select t.id into v_teacher_id from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=auth.uid() and t.active=true and te.establishment_id=p_establishment_id and te.status='active' limit 1;
  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;

  select ts.day_of_week,ts.starts_at,ts.ends_at,ts.academic_year_id into v_day,v_start,v_end,v_academic_year_id
  from public.timetable_slots ts join public.class_subjects cs on cs.id=ts.class_subject_id
  where ts.id=p_timetable_slot_id and ts.establishment_id=p_establishment_id and cs.class_id=p_class_id and cs.teacher_id=v_teacher_id limit 1;
  if v_start is null then raise exception 'Aucun cours correspondant à cette classe et cette période'; end if;
  if not exists(select 1 from public.academic_years ay where ay.id=v_academic_year_id and ay.status='active' and p_date between ay.start_date and ay.end_date) then raise exception 'Cette période ne correspond pas à l''année académique active'; end if;
  if extract(isodow from p_date)::integer<>v_day then raise exception 'Cette période de cours n''est pas prévue ce jour'; end if;
  if p_date<>(now() at time zone 'Africa/Libreville')::date then raise exception 'L''appel doit être enregistré le jour du cours'; end if;
  if (now() at time zone 'Africa/Libreville')::time<v_start or (now() at time zone 'Africa/Libreville')::time>v_end then raise exception 'L''appel est disponible uniquement pendant le cours'; end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)=0 then raise exception 'Aucun élève à enregistrer'; end if;

  for r in select value from jsonb_array_elements(p_records) loop
    if (r->>'status') not in ('present','absent','late','excused') then raise exception 'Statut de présence invalide'; end if;
    if not exists(select 1 from public.enrollments en where en.student_id=(r->>'student_id')::uuid and en.class_id=p_class_id and en.establishment_id=p_establishment_id and en.status='active' and en.academic_year_id=v_academic_year_id) then raise exception 'Un élève n''est pas inscrit dans cette classe pour l''année académique active'; end if;

    insert into public.attendance_records(establishment_id,student_id,class_id,subject_id,attendance_date,status,reason,recorded_by,lesson_key)
    select p_establishment_id,(r->>'student_id')::uuid,p_class_id,cs.subject_id,p_date,r->>'status',nullif(r->>'reason',''),auth.uid(),p_timetable_slot_id::text
    from public.class_subjects cs where cs.id=(select class_subject_id from public.timetable_slots where id=p_timetable_slot_id)
    on conflict(student_id,attendance_date,lesson_key) do update
      set class_id=excluded.class_id,subject_id=excluded.subject_id,status=excluded.status,reason=excluded.reason,recorded_by=auth.uid(),updated_at=now();
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.review_attendance_justification(p_request_id uuid,p_status text,p_reviewer_note text default null)
returns public.attendance_justification_requests
language plpgsql security invoker set search_path=public
as $$
declare v_request public.attendance_justification_requests;v_attendance public.attendance_records;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Statut de validation invalide'; end if;
  select * into v_request from public.attendance_justification_requests where id=p_request_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if not private.is_member(v_request.establishment_id) or coalesce((select p.account_type from public.profiles p where p.id=(select auth.uid())), 'school_member')='parent' then raise exception 'Accès refusé'; end if;
  select * into v_attendance from public.attendance_records where id=v_request.attendance_id and student_id=v_request.student_id and establishment_id=v_request.establishment_id for update;
  if not found then raise exception 'Présence concernée introuvable'; end if;

  update public.attendance_justification_requests
  set status=p_status,reviewed_by=auth.uid(),reviewed_at=now(),reviewer_note=nullif(trim(coalesce(p_reviewer_note,'')),''),updated_at=now()
  where id=p_request_id returning * into v_request;

  if p_status='approved' then
    update public.attendance_records set status='justified',reason=coalesce(v_attendance.reason,'Justification approuvée'),updated_at=now() where id=v_attendance.id;
  end if;

  insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
  values (
    v_request.establishment_id,v_request.parent_user_id,
    case when p_status='approved' then 'attendance_justification_approved' else 'attendance_justification_rejected' end,
    case when p_status='approved' then 'Justification approuvée' else 'Justification refusée' end,
    case when p_status='approved' then 'La justification de votre enfant a été approuvée. Le statut du cours est maintenant « Justifié ».'
         else 'La justification de votre enfant a été refusée.' ||
              case when nullif(trim(coalesce(p_reviewer_note,'')),'') is not null then ' Motif : '||trim(p_reviewer_note) else '' end end,
    'attendance_justification_request',v_request.id
  );
  return v_request;
end;
$$;
revoke all on function public.review_attendance_justification(uuid,text,text) from public;
grant execute on function public.review_attendance_justification(uuid,text,text) to authenticated;

create or replace function public.notify_parent_attendance_change()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_subject text;v_start time;v_end time;v_label text;g record;
begin
  if tg_op='UPDATE' and new.status=old.status then return new; end if;
  if new.status in ('justified','excused') and old.status is not null then return new; end if;
  select sub.name,ts.starts_at,ts.ends_at into v_subject,v_start,v_end
  from public.timetable_slots ts left join public.class_subjects cs on cs.id=ts.class_subject_id left join public.subjects sub on sub.id=cs.subject_id
  where ts.id::text=new.lesson_key::text limit 1;
  v_label:=coalesce(v_subject,'Cours');
  if v_start is not null and v_end is not null then v_label:=v_label||' ('||to_char(v_start,'HH24:MI')||'–'||to_char(v_end,'HH24:MI')||')'; end if;
  for g in select sg.guardian_user_id from public.student_guardians sg where sg.student_id=new.student_id and sg.establishment_id=new.establishment_id and sg.active=true and sg.can_view_academic=true and sg.guardian_user_id is not null loop
    insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
    values(new.establishment_id,g.guardian_user_id,
      case new.status when 'present' then 'attendance_present' when 'late' then 'attendance_late' else 'attendance_absent' end,
      case new.status when 'present' then 'Présence enregistrée' when 'late' then 'Retard enregistré' else 'Absence enregistrée' end,
      case new.status when 'present' then 'Votre enfant a été marqué présent au cours de '||v_label||'.'
           when 'late' then 'Votre enfant a été marqué en retard au cours de '||v_label||'.'
           else 'Votre enfant a été marqué absent au cours de '||v_label||'.' end,
      'attendance_record',new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_parent_attendance_change on public.attendance_records;
create trigger trg_notify_parent_attendance_change after insert or update of status on public.attendance_records
for each row execute function public.notify_parent_attendance_change();
