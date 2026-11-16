-- Séparer les exclusions de cours demandées par un enseignant des sanctions administratives globales.
CREATE OR REPLACE FUNCTION public.admin_create_administrative_exclusion(p_establishment_id uuid, p_student_id uuid, p_class_id uuid, p_reason text, p_start_date date, p_is_permanent boolean, p_end_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_academic_year_id uuid; v_id uuid; v_student_name text;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 if not private.has_role(p_establishment_id,array['owner','admin','director','supervisor']::text[]) then raise exception 'Seule l’administration peut prononcer cette exclusion'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Le motif est obligatoire'; end if;
 if p_is_permanent and p_end_date is not null then raise exception 'Une exclusion définitive ne doit pas avoir de date de fin'; end if;
 if not p_is_permanent and (p_end_date is null or p_end_date<p_start_date) then raise exception 'Une date de fin valide est obligatoire'; end if;
 select en.academic_year_id into v_academic_year_id from public.enrollments en
 where en.student_id=p_student_id and en.class_id=p_class_id and en.establishment_id=p_establishment_id and en.status::text='active'
 order by en.created_at desc limit 1;
 if v_academic_year_id is null then raise exception 'Inscription active introuvable'; end if;
 insert into public.administrative_exclusions(establishment_id,student_id,class_id,academic_year_id,reason,start_date,end_date,is_permanent,created_by)
 values(p_establishment_id,p_student_id,p_class_id,v_academic_year_id,trim(p_reason),p_start_date,
 case when p_is_permanent then null else p_end_date end,p_is_permanent,auth.uid()) returning id into v_id;
 select concat_ws(' ',first_name,last_name) into v_student_name from public.students where id=p_student_id;
 insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
 select p_establishment_id,sg.guardian_user_id,'administrative_exclusion_published',
 case when p_is_permanent then 'Exclusion définitive prononcée' else 'Exclusion administrative prononcée' end,
 coalesce(v_student_name,'Votre enfant') || ' est exclu de toutes les matières. Motif : ' || trim(p_reason) ||
 case when p_is_permanent then '. Durée : définitive.' else '. Jusqu’au ' || to_char(p_end_date,'DD/MM/YYYY') || '.' end,
 'administrative_exclusion',v_id
 from public.student_guardians sg where sg.student_id=p_student_id and sg.establishment_id=p_establishment_id
 and sg.active=true and sg.can_view_academic=true;
 return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.admin_review_course_exclusion(p_exclusion_id uuid, p_decision text, p_end_date date DEFAULT NULL::date, p_scope text DEFAULT NULL::text, p_review_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_row public.course_exclusions%rowtype;
  v_student_name text;
  v_subject_name text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Décision invalide'; end if;

  select * into v_row from public.course_exclusions where id = p_exclusion_id for update;
  if not found then raise exception 'Signalement introuvable'; end if;
  if not private.has_role(v_row.establishment_id, array['owner','admin','director','supervisor']::text[]) then
    raise exception 'Vous n’êtes pas autorisé à traiter ce signalement';
  end if;
  if v_row.status <> 'pending' then raise exception 'Ce signalement a déjà été traité'; end if;

  if p_decision = 'approved' then
    if coalesce(p_scope, v_row.scope) not in ('same_subject_until') then
      raise exception 'Portée de sanction invalide';
    end if;
    if coalesce(p_end_date, v_row.end_date) is null or coalesce(p_end_date, v_row.end_date) < v_row.lesson_date then
      raise exception 'Une date de fin valide est obligatoire';
    end if;
  end if;

  update public.course_exclusions set
    status = p_decision,
    scope = case when p_decision = 'approved' then 'same_subject_until' else scope end,
    end_date = case when p_decision = 'approved' then coalesce(p_end_date, end_date) else end_date end,
    reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_review_note),''),
    updated_at = now()
  where id = p_exclusion_id;

  if p_decision = 'approved' then
    select concat_ws(' ', first_name, last_name) into v_student_name from public.students where id = v_row.student_id;
    select name into v_subject_name from public.subjects where id = v_row.subject_id;
    insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
    select v_row.establishment_id, sg.guardian_user_id, 'course_exclusion_approved',
      'Exclusion validée par l’administration',
      coalesce(v_student_name,'Votre enfant') || ' — ' || coalesce(v_subject_name,'Cours') ||
      '. Motif : ' || v_row.reason || '. Jusqu’au ' || to_char(coalesce(p_end_date,v_row.end_date),'DD/MM/YYYY') || '.',
      'course_exclusion', v_row.id
    from public.student_guardians sg
    where sg.student_id = v_row.student_id and sg.establishment_id = v_row.establishment_id
      and sg.active = true and sg.can_view_academic = true;
  end if;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_create_course_exclusion(p_establishment_id uuid, p_student_id uuid, p_class_id uuid, p_subject_id uuid, p_timetable_slot_id uuid, p_lesson_date date, p_reason text, p_scope text DEFAULT 'current_lesson'::text, p_end_date date DEFAULT NULL::date, p_teacher_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_id uuid;
  v_academic_year_id uuid;
  v_teacher_id uuid;
  v_admin record;
  v_student_name text;
  v_subject_name text;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Le motif doit contenir au moins 3 caractères'; end if;
  if p_scope not in ('current_lesson','same_subject_until') then raise exception 'Portée invalide'; end if;
  if p_scope = 'current_lesson' and p_end_date is not null then raise exception 'Une exclusion limitée au cours ne nécessite pas de date de fin'; end if;
  if p_scope <> 'current_lesson' and (p_end_date is null or p_end_date < p_lesson_date) then raise exception 'La date de fin est obligatoire et doit être postérieure au début'; end if;

  select t.academic_year_id, cs.teacher_id
    into v_academic_year_id, v_teacher_id
  from public.timetable_slots t
  join public.class_subjects cs on cs.id = t.class_subject_id
  where t.id = p_timetable_slot_id
    and t.establishment_id = p_establishment_id
    and cs.class_id = p_class_id
    and cs.subject_id = p_subject_id;

  if v_academic_year_id is null then raise exception 'Le cours sélectionné est introuvable'; end if;
  if not private.is_teacher_for_class_subject(p_class_id, p_subject_id) then
    raise exception 'Vous n’êtes pas autorisé à signaler un incident pour ce cours';
  end if;

  if not exists (
    select 1 from public.enrollments en
    join public.students s on s.id = en.student_id
    where en.student_id = p_student_id and en.class_id = p_class_id
      and en.establishment_id = p_establishment_id and en.academic_year_id = v_academic_year_id
      and en.status::text = 'active' and s.active = true
  ) then raise exception 'Cet élève n’est pas inscrit dans cette classe'; end if;

  if exists (
    select 1 from public.attendance_records ar
    where ar.establishment_id = p_establishment_id and ar.student_id = p_student_id
      and ar.class_id = p_class_id and ar.attendance_date = p_lesson_date
      and ar.lesson_key = p_timetable_slot_id::text and ar.status <> 'present'
  ) then raise exception 'Seul un élève enregistré présent peut être exclu du cours'; end if;

  -- Si l'appel est encore en cours de saisie, conserver explicitement la présence avant l'exclusion.
  insert into public.attendance_records(
    establishment_id, student_id, class_id, subject_id, attendance_date,
    status, reason, recorded_by, lesson_key
  )
  select p_establishment_id, p_student_id, p_class_id, p_subject_id, p_lesson_date,
    'present', null, auth.uid(), p_timetable_slot_id::text
  where not exists (
    select 1 from public.attendance_records ar
    where ar.student_id = p_student_id and ar.attendance_date = p_lesson_date
      and ar.lesson_key = p_timetable_slot_id::text
  )
  on conflict (student_id, attendance_date, lesson_key) do nothing;

  v_status := case when p_scope = 'current_lesson' then 'approved' else 'pending' end;
  insert into public.course_exclusions(
    establishment_id, student_id, class_id, subject_id, timetable_slot_id,
    academic_year_id, lesson_date, reason, teacher_note, scope, end_date,
    status, created_by
  ) values (
    p_establishment_id, p_student_id, p_class_id, p_subject_id, p_timetable_slot_id,
    v_academic_year_id, p_lesson_date, trim(p_reason), nullif(trim(p_teacher_note),''),
    p_scope, p_end_date, v_status, auth.uid()
  ) returning id into v_id;

  select concat_ws(' ', s.first_name, s.last_name) into v_student_name
  from public.students s where s.id = p_student_id;
  select sub.name into v_subject_name
  from public.subjects sub where sub.id = p_subject_id;

  -- L'administration est toujours informée, y compris pour une exclusion limitée au cours.
  for v_admin in
    select em.user_id from public.establishment_members em
    where em.establishment_id = p_establishment_id and em.active = true
      and em.role in ('owner','admin','director','supervisor')
  loop
    insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
    values (p_establishment_id, v_admin.user_id, 'course_exclusion_reported',
      'Signalement d’exclusion',
      coalesce(v_student_name,'Un élève') || ' · ' || coalesce(v_subject_name,'Cours') || ' — ' || trim(p_reason),
      'course_exclusion', v_id);
  end loop;

  -- Option B : l'exclusion du cours en cours est communiquée immédiatement au parent.
  if v_status = 'approved' then
    insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
    select p_establishment_id, sg.guardian_user_id, 'course_exclusion_approved',
      'Exclusion du cours signalée',
      coalesce(v_student_name,'Votre enfant') || ' a été sorti du cours de ' || coalesce(v_subject_name,'la matière') || '. Motif : ' || trim(p_reason),
      'course_exclusion', v_id
    from public.student_guardians sg
    where sg.student_id = p_student_id and sg.establishment_id = p_establishment_id
      and sg.active = true and sg.can_view_academic = true;
  end if;

  return v_id;
end;
$function$
;

create table if not exists public.administrative_exclusions (
 id uuid primary key default gen_random_uuid(),
 establishment_id uuid not null references public.establishments(id) on delete cascade,
 student_id uuid not null references public.students(id), class_id uuid not null,
 academic_year_id uuid not null references public.academic_years(id),
 reason text not null check(length(trim(reason)) between 3 and 1000),
 start_date date not null default current_date, end_date date,
 is_permanent boolean not null default false,
 status text not null default 'active' check(status in ('active','lifted','expired')),
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(),
 lifted_by uuid, lifted_at timestamptz, lift_reason text,
 constraint administrative_exclusions_duration check(
  (is_permanent and end_date is null) or
  (not is_permanent and end_date is not null and end_date >= start_date)
 )
);
create index if not exists administrative_exclusions_active_student_idx on public.administrative_exclusions(establishment_id,student_id,status,start_date,end_date);
alter table public.administrative_exclusions enable row level security;
drop policy if exists administrative_exclusions_read_scoped on public.administrative_exclusions;
create policy administrative_exclusions_read_scoped on public.administrative_exclusions for select to authenticated
using(
 private.has_role(establishment_id,array['owner','admin','director','supervisor']::text[])
 or exists(select 1 from public.student_guardians sg where sg.student_id=administrative_exclusions.student_id
  and sg.establishment_id=administrative_exclusions.establishment_id and sg.guardian_user_id=auth.uid()
  and sg.active=true and sg.can_view_academic=true)
);
revoke all on public.administrative_exclusions from anon,authenticated;
grant select on public.administrative_exclusions to authenticated;
