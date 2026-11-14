-- Attendance workflow completion: parent notifications, teacher grace window,
-- administrative backfill, and recurring missing-call reminders.

CREATE OR REPLACE FUNCTION private.can_view_notification(p_establishment_id uuid, p_type text, p_entity_type text, p_entity_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_account_type public.account_type;
  v_permission text;
begin
  if p_user_id is null or p_establishment_id is null or p_type is null then
    return false;
  end if;

  select pr.account_type into v_account_type
  from public.profiles pr where pr.id = p_user_id;

  if v_account_type = 'parent' then
    case
      when p_type in ('attendance_present','attendance_late','attendance_absent','attendance_updated')
        and p_entity_type = 'attendance_record' then
        return exists (
          select 1
          from public.attendance_records ar
          join public.student_guardians sg
            on sg.student_id = ar.student_id
           and sg.establishment_id = ar.establishment_id
          where ar.id = p_entity_id
            and ar.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id
            and sg.active = true
            and sg.can_view_academic = true
        );

      when p_type in ('payment_received','payment_overdue') then
        return exists (
          select 1 from public.student_guardians sg
          where sg.guardian_user_id = p_user_id
            and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_finance = true
            and (
              (p_entity_type = 'payment' and exists (
                select 1 from public.payments pay
                join public.enrollments en on en.id = pay.enrollment_id
                where pay.id = p_entity_id and pay.establishment_id = p_establishment_id
                  and en.student_id = sg.student_id and en.establishment_id = sg.establishment_id
              ))
              or (p_entity_type = 'payment_schedule' and exists (
                select 1 from public.payment_schedules ps
                join public.enrollments en on en.id = ps.enrollment_id
                where ps.id = p_entity_id and en.student_id = sg.student_id
                  and en.establishment_id = sg.establishment_id
              ))
            )
        );

      when p_type = 'enrollment_created' and p_entity_type = 'enrollment' then
        return exists (
          select 1 from public.enrollments en
          join public.student_guardians sg on sg.student_id = en.student_id
          where en.id = p_entity_id and en.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );

      when p_type = 'option_added' and p_entity_type = 'enrollment_option' then
        return exists (
          select 1 from public.enrollment_options eo
          join public.enrollments en on en.id = eo.enrollment_id
          join public.student_guardians sg on sg.student_id = en.student_id
          where eo.id = p_entity_id and eo.establishment_id = p_establishment_id
            and en.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_finance = true
        );

      when p_type in ('grade_published','grade_updated') and p_entity_type = 'grade' then
        return exists (
          select 1 from public.grades g
          join public.student_guardians sg on sg.student_id = g.student_id
          where g.id = p_entity_id and sg.guardian_user_id = p_user_id
            and sg.establishment_id = p_establishment_id and sg.active = true
            and sg.can_view_academic = true
        );

      when p_type in ('lesson_published','lesson_updated') and p_entity_type = 'lesson' then
        return exists (
          select 1 from public.teacher_lesson_entries le
          join public.timetable_slots ts on ts.id = le.timetable_slot_id
          join public.class_subjects cs on cs.id = ts.class_subject_id
          join public.enrollments en on en.class_id = cs.class_id
          join public.student_guardians sg on sg.student_id = en.student_id
          where le.id = p_entity_id and le.establishment_id = p_establishment_id
            and en.establishment_id = p_establishment_id and en.status::text = 'active'
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );

      when p_type in ('homework_published','homework_updated','homework_removed') and p_entity_type = 'homework' then
        return exists (
          select 1 from public.teacher_homework h
          join public.enrollments en on en.class_id = h.class_id
          join public.student_guardians sg on sg.student_id = en.student_id
          where h.id = p_entity_id and h.establishment_id = p_establishment_id
            and en.establishment_id = p_establishment_id and en.status::text = 'active'
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );

      when p_type = 'school_event' and p_entity_type = 'school_event' then
        return exists (
          select 1 from public.school_events se
          join public.student_guardians sg on sg.establishment_id = se.establishment_id
          where se.id = p_entity_id and se.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.active = true
        );

      when p_type = 'school_document_published' and p_entity_type = 'parent_document_publication' then
        return exists (
          select 1 from public.parent_document_publications dp
          join public.student_guardians sg on sg.student_id = dp.student_id
            and sg.establishment_id = dp.establishment_id
          where dp.id = p_entity_id and dp.establishment_id = p_establishment_id and dp.active = true
            and sg.guardian_user_id = p_user_id and sg.active = true and sg.can_view_academic = true
        );

      when p_type = 'document_request' and p_entity_type = 'parent_document_request' then
        return exists (
          select 1 from public.parent_document_requests dr
          join public.student_guardians sg on sg.student_id = dr.student_id
            and sg.establishment_id = dr.establishment_id
          where dr.id = p_entity_id and dr.establishment_id = p_establishment_id
            and dr.parent_user_id = p_user_id and sg.guardian_user_id = p_user_id
            and sg.active = true and sg.can_view_academic = true
        );

      when p_type in ('school_document_request','school_document_submission')
        and p_entity_type = 'school_document_request' then
        return exists (
          select 1 from public.school_document_requests dr
          join public.student_guardians sg on sg.student_id = dr.student_id
          where dr.id = p_entity_id and dr.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );

      else
        return false;
    end case;
  end if;

  if v_account_type = 'teacher' or exists (
    select 1 from public.establishment_members em
    where em.establishment_id = p_establishment_id and em.user_id = p_user_id
      and em.active = true and em.role = 'teacher'
  ) then
    return exists (
      select 1
      from public.teacher_establishments te
      join public.teachers t on t.id = te.teacher_id
      where te.establishment_id = p_establishment_id and te.status = 'active'
        and t.profile_id = p_user_id and t.active = true
        and (
          (p_type in ('lesson_published','lesson_updated') and p_entity_type = 'lesson'
            and exists (select 1 from public.teacher_lesson_entries le
              where le.id = p_entity_id and le.teacher_id = t.id))
          or (p_type in ('homework_published','homework_updated','homework_removed') and p_entity_type = 'homework'
            and exists (select 1 from public.teacher_homework h
              where h.id = p_entity_id and h.teacher_id = t.id))
          or (p_type like 'attendance_%' and p_entity_type = 'attendance_record'
            and exists (select 1 from public.attendance_records ar
              join public.class_subjects cs on cs.class_id = ar.class_id
                and cs.subject_id = ar.subject_id and cs.teacher_id = t.id
              where ar.id = p_entity_id and ar.establishment_id = p_establishment_id))
        )
    );
  end if;

  if not exists (
    select 1 from public.establishment_members m
    where m.establishment_id = p_establishment_id and m.user_id = p_user_id and m.active = true
  ) then
    return false;
  end if;

  v_permission := case
    when p_type = 'enrollment_created' then 'enrollments.read'
    when p_type in ('payment_overdue','payment_received','option_added') then 'payments.view'
    when p_type in ('grade_published','grade_updated') then 'grades.view'
    when p_type in ('lesson_published','lesson_updated','homework_published','homework_updated','homework_removed') then 'classes.view'
    when p_type like 'attendance_%' and p_type = 'attendance_call_missing' then 'attendance.manage'
    when p_type like 'attendance_%' then 'attendance.read'
    when p_type = 'school_document_submission' then 'documents.manage'
    when p_type = 'school_event' then 'dashboard.view'
    when p_type = 'support_request_new' then 'support.manage'
    when p_type like 'pointage_%' then 'staff.view'
    else null
  end;

  if v_permission is null then return false; end if;
  if p_type = 'attendance_call_missing' and p_entity_type <> 'timetable_slot' then return false; end if;
  if p_type <> 'attendance_call_missing' and p_entity_type = 'timetable_slot' then return false; end if;
  return private.has_permission(p_establishment_id, v_permission, p_user_id);
end;
$function$


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


CREATE OR REPLACE FUNCTION public.notify_parent_attendance_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_subject text;
  v_start time;
  v_end time;
  v_label text;
  v_type text;
  v_title text;
  v_body text;
  g record;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select sub.name, ts.starts_at, ts.ends_at
    into v_subject, v_start, v_end
  from public.timetable_slots ts
  left join public.class_subjects cs on cs.id = ts.class_subject_id
  left join public.subjects sub on sub.id = cs.subject_id
  where ts.id::text = new.lesson_key::text
    and ts.establishment_id = new.establishment_id
  limit 1;

  v_label := coalesce(v_subject, 'Cours');
  if v_start is not null and v_end is not null then
    v_label := v_label || ' (' || to_char(v_start, 'HH24:MI') || '–' || to_char(v_end, 'HH24:MI') || ')';
  end if;

  v_type := case new.status
    when 'present' then 'attendance_present'
    when 'late' then 'attendance_late'
    when 'justified' then 'attendance_updated'
    when 'excused' then 'attendance_updated'
    else 'attendance_absent'
  end;
  v_title := case new.status
    when 'present' then 'Présence enregistrée'
    when 'late' then 'Retard enregistré'
    when 'justified' then 'Absence justifiée'
    when 'excused' then 'Absence excusée'
    else 'Absence enregistrée'
  end;
  v_body := case new.status
    when 'present' then 'Votre enfant a été marqué présent au cours de ' || v_label || '.'
    when 'late' then 'Votre enfant a été marqué en retard au cours de ' || v_label || '.'
    when 'justified' then 'Le statut de présence de votre enfant a été mis à jour : absence justifiée (' || v_label || ').'
    when 'excused' then 'Le statut de présence de votre enfant a été mis à jour : absence excusée (' || v_label || ').'
    else 'Votre enfant a été marqué absent au cours de ' || v_label || '.'
  end;

  for g in
    select sg.guardian_user_id
    from public.student_guardians sg
    where sg.student_id = new.student_id
      and sg.establishment_id = new.establishment_id
      and sg.active = true
      and sg.can_view_academic = true
      and sg.guardian_user_id is not null
  loop
    insert into public.notifications(
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    ) values (
      new.establishment_id, g.guardian_user_id, v_type, v_title, v_body,
      'attendance_record', new.id
    );
  end loop;

  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.record_lesson_attendance(p_establishment_id uuid, p_student_id uuid, p_class_id uuid, p_subject_id uuid, p_date date, p_lesson_key text, p_status text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_id uuid;
  v_is_privileged boolean;
  v_teacher_allowed boolean;
  v_slot record;
  v_local_now timestamp;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_establishment_id is null or p_student_id is null or p_class_id is null
     or p_subject_id is null or p_date is null then
    raise exception 'Informations d’appel incomplètes';
  end if;

  select ts.id, ts.day_of_week, ts.starts_at, ts.ends_at, cs.class_id, cs.subject_id
    into v_slot
  from public.timetable_slots ts
  join public.class_subjects cs on cs.id = ts.class_subject_id
  where ts.id = nullif(trim(p_lesson_key), '')::uuid
    and ts.establishment_id = p_establishment_id
    and cs.class_id = p_class_id
    and cs.subject_id = p_subject_id;

  if not found then raise exception 'Le créneau ne correspond pas à cette classe et cette matière'; end if;

  select timezone(coalesce(e.timezone, 'Africa/Libreville'), now())
    into v_local_now
  from public.establishments e
  where e.id = p_establishment_id;

  if v_local_now is null then raise exception 'Établissement introuvable'; end if;
  if extract(dow from p_date)::integer <> v_slot.day_of_week then
    raise exception 'Ce cours n’est pas prévu le jour sélectionné';
  end if;

  v_is_privileged := private.can_manage_all_attendance(p_establishment_id);

  v_teacher_allowed := exists (
    select 1
    from public.class_subjects cs
    join public.teachers t on t.id = cs.teacher_id
    join public.teacher_establishments te on te.teacher_id = t.id
    where cs.class_id = p_class_id
      and cs.subject_id = p_subject_id
      and t.profile_id = auth.uid()
      and t.active = true
      and te.establishment_id = p_establishment_id
      and te.status = 'active'
  );

  if not v_is_privileged and not v_teacher_allowed then
    raise exception 'Vous n’êtes pas autorisé à faire l’appel pour cette matière et cette classe';
  end if;

  if not v_is_privileged and (
    p_date <> v_local_now::date
    or v_local_now::time < v_slot.starts_at
    or v_local_now::time > v_slot.ends_at + interval '15 minutes'
  ) then
    raise exception 'L’appel enseignant est autorisé pendant le cours et pendant les 15 minutes qui suivent';
  end if;

  if p_status not in ('present','absent','late','justified','excused') then
    raise exception 'Statut de présence invalide';
  end if;

  if not exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id
      and e.class_id = p_class_id
      and e.establishment_id = p_establishment_id
      and e.status = 'active'
  ) then
    raise exception 'Élève non inscrit dans cette classe';
  end if;

  insert into public.attendance_records(
    establishment_id, student_id, class_id, subject_id,
    attendance_date, lesson_key, status, reason, recorded_by
  ) values (
    p_establishment_id, p_student_id, p_class_id, p_subject_id,
    p_date, p_lesson_key, p_status, p_reason, auth.uid()
  )
  on conflict (student_id, attendance_date, lesson_key) do update
  set class_id = excluded.class_id,
      subject_id = excluded.subject_id,
      status = excluded.status,
      reason = excluded.reason,
      recorded_by = auth.uid(),
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$function$



revoke all on function private.notify_missing_attendance_calls() from public, anon, authenticated;
grant execute on function private.notify_missing_attendance_calls() to service_role;

do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job
  where jobname = 'school-missing-attendance-call-reminders' limit 1;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule(
    'school-missing-attendance-call-reminders',
    '*/10 * * * *',
    'select private.notify_missing_attendance_calls();'
  );
end;
$block$;
