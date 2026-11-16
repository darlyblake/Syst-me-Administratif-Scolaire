-- Exclusions de cours — Option B.
-- Le cours actuel est communiqué immédiatement au parent.
-- Les exclusions prolongées restent en attente jusqu'à validation administrative.

create table if not exists public.course_exclusions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id),
  class_id uuid not null,
  subject_id uuid not null,
  timetable_slot_id uuid not null references public.timetable_slots(id),
  academic_year_id uuid not null references public.academic_years(id),
  lesson_date date not null,
  excluded_at timestamptz not null default now(),
  reason text not null check (length(trim(reason)) between 3 and 1000),
  teacher_note text,
  scope text not null check (scope in ('current_lesson','same_subject_until','all_courses_until')),
  end_date date,
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  created_by uuid not null default auth.uid(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_exclusions_scope_dates check (
    (scope = 'current_lesson' and end_date is null) or
    (scope in ('same_subject_until','all_courses_until') and end_date is not null and end_date >= lesson_date)
  )
);

create index if not exists course_exclusions_establishment_status_idx
  on public.course_exclusions(establishment_id, status, created_at desc);
create index if not exists course_exclusions_student_date_idx
  on public.course_exclusions(student_id, lesson_date desc);

alter table public.course_exclusions enable row level security;
drop policy if exists course_exclusions_read_scoped on public.course_exclusions;
create policy course_exclusions_read_scoped on public.course_exclusions
for select to authenticated
using (
  created_by = auth.uid()
  or private.has_role(establishment_id, array['owner','admin','director','supervisor']::text[])
  or exists (
    select 1 from public.student_guardians sg
    where sg.student_id = course_exclusions.student_id
      and sg.establishment_id = course_exclusions.establishment_id
      and sg.guardian_user_id = auth.uid()
      and sg.active = true and sg.can_view_academic = true
      and course_exclusions.status = 'approved'
  )
);
revoke all on public.course_exclusions from anon, authenticated;
grant select on public.course_exclusions to authenticated;

CREATE OR REPLACE FUNCTION private.can_view_notification(p_establishment_id uuid, p_type text, p_entity_type text, p_entity_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_account_type public.account_type;
begin
  if p_user_id is null or p_establishment_id is null or p_type is null then return false; end if;
  if p_type in ('course_exclusion_reported','course_exclusion_approved') and p_entity_type = 'course_exclusion' then
    select account_type into v_account_type from public.profiles where id = p_user_id;
    if v_account_type = 'parent' then
      return p_type = 'course_exclusion_approved' and exists (
        select 1 from public.course_exclusions ce
        join public.student_guardians sg on sg.student_id = ce.student_id
          and sg.establishment_id = ce.establishment_id
        where ce.id = p_entity_id and ce.establishment_id = p_establishment_id
          and ce.status = 'approved' and sg.guardian_user_id = p_user_id
          and sg.active = true and sg.can_view_academic = true
      );
    end if;
    return private.has_permission(p_establishment_id, 'attendance.manage', p_user_id)
      and exists (select 1 from public.course_exclusions ce
        where ce.id = p_entity_id and ce.establishment_id = p_establishment_id);
  end if;
  return private.can_view_notification_base(p_establishment_id,p_type,p_entity_type,p_entity_id,p_user_id);
end;
$function$


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
    if coalesce(p_scope, v_row.scope) not in ('same_subject_until','all_courses_until') then
      raise exception 'Portée de sanction invalide';
    end if;
    if coalesce(p_end_date, v_row.end_date) is null or coalesce(p_end_date, v_row.end_date) < v_row.lesson_date then
      raise exception 'Une date de fin valide est obligatoire';
    end if;
  end if;

  update public.course_exclusions set
    status = p_decision,
    scope = case when p_decision = 'approved' then coalesce(p_scope, scope) else scope end,
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
  if p_scope not in ('current_lesson','same_subject_until','all_courses_until') then raise exception 'Portée invalide'; end if;
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
  if p_scope not in ('current_lesson','same_subject_until','all_courses_until') then raise exception 'Portée invalide'; end if;
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

  if not exists (
    select 1 from public.attendance_records ar
    where ar.establishment_id = p_establishment_id and ar.student_id = p_student_id
      and ar.class_id = p_class_id and ar.attendance_date = p_lesson_date
      and ar.lesson_key = p_timetable_slot_id::text and ar.status = 'present'
  ) then raise exception 'L’élève doit être enregistré présent avant de signaler son exclusion'; end if;

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


revoke all on function public.teacher_create_course_exclusion(uuid,uuid,uuid,uuid,uuid,date,text,text,date,text) from public, anon;
grant execute on function public.teacher_create_course_exclusion(uuid,uuid,uuid,uuid,uuid,date,text,text,date,text) to authenticated;
revoke all on function public.admin_review_course_exclusion(uuid,text,date,text,text) from public, anon;
grant execute on function public.admin_review_course_exclusion(uuid,text,date,text,text) to authenticated;
