CREATE OR REPLACE FUNCTION private.can_view_notification(p_establishment_id uuid, p_type text, p_entity_type text, p_entity_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_account_type public.account_type; v_permission text;
begin
  if p_user_id is null or p_establishment_id is null or p_type is null then return false; end if;
  select pr.account_type into v_account_type from public.profiles pr where pr.id = p_user_id;

  if v_account_type = 'parent' then
    case
      when p_type in ('payment_received','payment_overdue') then
        return exists (
          select 1 from public.student_guardians sg
          where sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_finance = true
            and (
              (p_entity_type = 'payment' and exists (
                select 1 from public.payments pay join public.enrollments en on en.id = pay.enrollment_id
                where pay.id = p_entity_id and pay.establishment_id = p_establishment_id
                  and en.student_id = sg.student_id and en.establishment_id = sg.establishment_id
              ))
              or (p_entity_type = 'payment_schedule' and exists (
                select 1 from public.payment_schedules ps join public.enrollments en on en.id = ps.enrollment_id
                where ps.id = p_entity_id and en.student_id = sg.student_id
                  and en.establishment_id = sg.establishment_id
              ))
            )
        );
      when p_type in ('enrollment_created') and p_entity_type = 'enrollment' then
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
      when p_type in ('attendance_absent','attendance_present','attendance_updated') and p_entity_type = 'attendance' then
        return exists (
          select 1 from public.attendance_records ar
          join public.student_guardians sg on sg.student_id = ar.student_id
          where ar.id = p_entity_id and ar.establishment_id = p_establishment_id
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
      when p_type = 'school_document_request' and p_entity_type = 'school_document_request' then
        return exists (
          select 1 from public.school_document_requests dr
          join public.student_guardians sg on sg.student_id = dr.student_id
            and sg.establishment_id = dr.establishment_id
          where dr.id = p_entity_id and dr.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.active = true and sg.can_view_academic = true
        );
      when p_type = 'school_document_submission' and p_entity_type = 'school_document_request' then
        return exists (
          select 1 from public.school_document_requests dr
          join public.student_guardians sg on sg.student_id = dr.student_id
          where dr.id = p_entity_id and dr.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );
      else return false;
    end case;
  end if;

  if v_account_type = 'teacher' then
    return exists (
      select 1 from public.teacher_establishments te
      join public.teachers t on t.id = te.teacher_id
      where te.establishment_id = p_establishment_id and te.status = 'active'
        and t.profile_id = p_user_id and t.active = true
        and (
          (p_type in ('lesson_published','lesson_updated') and p_entity_type = 'lesson'
            and exists (select 1 from public.teacher_lesson_entries le where le.id = p_entity_id and le.teacher_id = t.id))
          or (p_type in ('homework_published','homework_updated','homework_removed') and p_entity_type = 'homework'
            and exists (select 1 from public.teacher_homework h where h.id = p_entity_id and h.teacher_id = t.id))
          or p_type like 'attendance_%'
        )
    );
  end if;

  if not exists (
    select 1 from public.establishment_members m
    where m.establishment_id = p_establishment_id and m.user_id = p_user_id and m.active = true
  ) then return false; end if;

  v_permission := case
    when p_type = 'enrollment_created' then 'enrollments.read'
    when p_type in ('payment_overdue','payment_received','option_added') then 'payments.view'
    when p_type in ('grade_published','grade_updated') then 'grades.view'
    when p_type in ('lesson_published','lesson_updated','homework_published','homework_updated','homework_removed') then 'classes.view'
    when p_type like 'attendance_%' then 'attendance.read'
    when p_type = 'school_document_submission' then 'documents.manage'
    when p_type = 'school_event' then 'dashboard.view'
    when p_type = 'support_request_new' then 'support.manage'
    when p_type like 'pointage_%' then 'staff.view'
    else null
  end;
  if v_permission is null then return false; end if;
  return private.has_permission(p_establishment_id, v_permission, p_user_id);
end;
$function$;