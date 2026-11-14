-- Live updates for parent-visible student actions.
-- Notifications are the single Realtime stream; parent data is reloaded through its existing RLS-protected queries.

create or replace function private.notify_parent_on_payment()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_student_id uuid; v_student_name text;
begin
  select e.student_id, trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
    into v_student_id, v_student_name
  from public.enrollments e
  join public.students s on s.id = e.student_id
  where e.id = new.enrollment_id and e.establishment_id = new.establishment_id
  limit 1;

  if v_student_id is not null then
    insert into public.notifications (establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
    select distinct new.establishment_id, sg.guardian_user_id, 'payment_received', 'Paiement enregistré',
      format('Un paiement de %s FCFA a été enregistré pour %s.', to_char(new.amount, 'FM999G999G999'), nullif(v_student_name, '')),
      'payment', new.id
    from public.student_guardians sg
    where sg.student_id = v_student_id and sg.establishment_id = new.establishment_id
      and sg.active = true and sg.can_view_finance = true and sg.guardian_user_id is not null;
  end if;
  return new;
end;
$function$;

create or replace function private.notify_parent_on_grade_change()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  v_establishment_id uuid; v_assessment_title text; v_subject_name text;
  v_max_score numeric; v_student_name text; v_type text; v_title text;
begin
  if tg_op = 'UPDATE' and new.score is not distinct from old.score and new.comment is not distinct from old.comment then
    return new;
  end if;

  select a.establishment_id, a.title, a.max_score, sub.name
    into v_establishment_id, v_assessment_title, v_max_score, v_subject_name
  from public.assessments a
  left join public.subjects sub on sub.id = a.subject_id
  where a.id = new.assessment_id;

  if v_establishment_id is null then return new; end if;

  select trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
    into v_student_name from public.students s where s.id = new.student_id;

  v_type := case when tg_op = 'INSERT' then 'grade_published' else 'grade_updated' end;
  v_title := case when tg_op = 'INSERT' then 'Nouvelle note publiée' else 'Note mise à jour' end;

  insert into public.notifications (establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
  select distinct v_establishment_id, sg.guardian_user_id, v_type, v_title,
    format('%s : %s/%s en %s — %s.',
      coalesce(nullif(v_student_name, ''), 'Votre enfant'), new.score, coalesce(v_max_score, 20),
      coalesce(v_subject_name, 'une matière'), coalesce(v_assessment_title, 'évaluation')),
    'grade', new.id
  from public.student_guardians sg
  where sg.student_id = new.student_id and sg.establishment_id = v_establishment_id
    and sg.active = true and sg.can_view_academic = true and sg.guardian_user_id is not null;
  return new;
end;
$function$;

create or replace function private.notify_parent_on_lesson_entry_change()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_class_id uuid; v_subject_name text; v_type text; v_title text;
begin
  if tg_op = 'UPDATE'
     and new.lesson_date is not distinct from old.lesson_date
     and new.topic is not distinct from old.topic
     and new.content is not distinct from old.content
     and new.activities is not distinct from old.activities then return new; end if;

  select cs.class_id, sub.name into v_class_id, v_subject_name
  from public.timetable_slots ts
  join public.class_subjects cs on cs.id = ts.class_subject_id
  left join public.subjects sub on sub.id = cs.subject_id
  where ts.id = new.timetable_slot_id and ts.establishment_id = new.establishment_id
  limit 1;
  if v_class_id is null then return new; end if;

  v_type := case when tg_op = 'INSERT' then 'lesson_published' else 'lesson_updated' end;
  v_title := case when tg_op = 'INSERT' then 'Cahier de textes mis à jour' else 'Cours modifié' end;

  insert into public.notifications (establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
  select distinct new.establishment_id, sg.guardian_user_id, v_type, v_title,
    format('%s — %s, le %s : %s', coalesce(v_subject_name, 'Cours'),
      coalesce(new.topic, 'Contenu du cours'), to_char(new.lesson_date, 'DD/MM/YYYY'),
      coalesce(nullif(new.content, ''), 'Le cahier de textes a été mis à jour.')),
    'lesson', new.id
  from public.enrollments en
  join public.student_guardians sg on sg.student_id = en.student_id and sg.establishment_id = en.establishment_id
  where en.establishment_id = new.establishment_id and en.class_id = v_class_id
    and en.status::text = 'active' and sg.active = true and sg.can_view_academic = true
    and sg.guardian_user_id is not null;
  return new;
end;
$function$;

create or replace function private.notify_parent_on_homework_change()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_subject_name text; v_type text; v_title text; v_body text;
begin
  if tg_op = 'UPDATE'
     and new.title is not distinct from old.title
     and new.instructions is not distinct from old.instructions
     and new.due_date is not distinct from old.due_date
     and new.active is not distinct from old.active then return new; end if;
  if tg_op = 'INSERT' and new.active is not true then return new; end if;

  select s.name into v_subject_name from public.subjects s where s.id = new.subject_id;
  if new.active is not true then
    v_type := 'homework_removed'; v_title := 'Devoir retiré';
    v_body := format('Le devoir « %s » a été retiré.', coalesce(new.title, 'Devoir'));
  else
    v_type := case when tg_op = 'INSERT' then 'homework_published' else 'homework_updated' end;
    v_title := case when tg_op = 'INSERT' then 'Nouveau devoir publié' else 'Devoir mis à jour' end;
    v_body := format('%s — %s. %s%s', coalesce(v_subject_name, 'Devoir'),
      coalesce(new.title, 'Travail à faire'), coalesce(new.instructions, ''),
      case when new.due_date is null then '' else format(' À rendre le %s.', to_char(new.due_date, 'DD/MM/YYYY')) end);
  end if;

  insert into public.notifications (establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
  select distinct new.establishment_id, sg.guardian_user_id, v_type, v_title, v_body, 'homework', new.id
  from public.enrollments en
  join public.student_guardians sg on sg.student_id = en.student_id and sg.establishment_id = en.establishment_id
  where en.establishment_id = new.establishment_id and en.class_id = new.class_id
    and en.status::text = 'active' and sg.active = true and sg.can_view_academic = true
    and sg.guardian_user_id is not null;
  return new;
end;
$function$;

-- Keep the attendance trigger that already checks can_view_academic and remove its duplicate.
drop trigger if exists trg_parent_notification_attendance on public.attendance_records;

drop trigger if exists trg_parent_notification_grade on public.grades;
create trigger trg_parent_notification_grade after insert or update of score, comment on public.grades
for each row execute function private.notify_parent_on_grade_change();

drop trigger if exists trg_parent_notification_lesson_entry on public.teacher_lesson_entries;
create trigger trg_parent_notification_lesson_entry after insert or update of lesson_date, topic, content, activities on public.teacher_lesson_entries
for each row execute function private.notify_parent_on_lesson_entry_change();

drop trigger if exists trg_parent_notification_homework on public.teacher_homework;
create trigger trg_parent_notification_homework after insert or update of title, instructions, due_date, active on public.teacher_homework
for each row execute function private.notify_parent_on_homework_change();

revoke all on function private.notify_parent_on_payment() from public, anon, authenticated;
revoke all on function private.notify_parent_on_grade_change() from public, anon, authenticated;
revoke all on function private.notify_parent_on_lesson_entry_change() from public, anon, authenticated;
revoke all on function private.notify_parent_on_homework_change() from public, anon, authenticated;
