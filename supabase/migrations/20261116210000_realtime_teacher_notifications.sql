-- Notifications ciblées pour les enseignants lors des changements de planning et de sanctions.
-- Les notifications restent persistées dans public.notifications ; Realtime ne sert qu'à les distribuer.

CREATE OR REPLACE FUNCTION private.notify_timetable_change_to_teachers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_old_class_id uuid;
  v_old_teacher_id uuid;
  v_old_subject_name text;
  v_new_class_id uuid;
  v_new_teacher_id uuid;
  v_new_subject_name text;
  v_establishment_id uuid;
  v_day integer;
  v_starts_at time;
  v_ends_at time;
  v_class_name text;
  v_target record;
  v_action text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT cs.class_id, cs.teacher_id, sub.name
      INTO v_old_class_id, v_old_teacher_id, v_old_subject_name
    FROM public.class_subjects cs
    LEFT JOIN public.subjects sub ON sub.id = cs.subject_id
    WHERE cs.id = OLD.class_subject_id;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT cs.class_id, cs.teacher_id, sub.name
      INTO v_new_class_id, v_new_teacher_id, v_new_subject_name
    FROM public.class_subjects cs
    LEFT JOIN public.subjects sub ON sub.id = cs.subject_id
    WHERE cs.id = NEW.class_subject_id;
  END IF;

  v_establishment_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.establishment_id ELSE NEW.establishment_id END;
  v_day := CASE WHEN TG_OP = 'DELETE' THEN OLD.day_of_week ELSE NEW.day_of_week END;
  v_starts_at := CASE WHEN TG_OP = 'DELETE' THEN OLD.starts_at ELSE NEW.starts_at END;
  v_ends_at := CASE WHEN TG_OP = 'DELETE' THEN OLD.ends_at ELSE NEW.ends_at END;
  v_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'Un nouveau cours a été ajouté à votre planning.'
    WHEN TG_OP = 'DELETE' THEN 'Un cours a été retiré de votre planning.'
    ELSE 'Un créneau de votre planning a été modifié.'
  END;

  FOR v_target IN
    SELECT DISTINCT t.profile_id, x.class_id, x.subject_name
    FROM (VALUES
      (v_old_class_id, v_old_teacher_id, v_old_subject_name),
      (v_new_class_id, v_new_teacher_id, v_new_subject_name)
    ) AS x(class_id, teacher_id, subject_name)
    JOIN public.teachers t ON t.id = x.teacher_id AND t.active = true
    JOIN public.teacher_establishments te
      ON te.teacher_id = t.id
     AND te.establishment_id = v_establishment_id
     AND te.status = 'active'
    WHERE x.teacher_id IS NOT NULL
      AND t.profile_id IS NOT NULL
  LOOP
    SELECT sc.name INTO v_class_name
    FROM public.school_classes sc
    WHERE sc.id = v_target.class_id
      AND sc.establishment_id = v_establishment_id;

    INSERT INTO public.notifications(
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    VALUES(
      v_establishment_id,
      v_target.profile_id,
      'timetable_updated',
      'Votre emploi du temps a changé',
      v_action || ' Classe : ' || COALESCE(v_class_name, 'classe') ||
        '. Matière : ' || COALESCE(v_target.subject_name, 'matière') ||
        '. Consultez votre planning pour voir les nouveaux horaires.',
      'timetable_schedule',
      v_target.class_id
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_timetable_change_to_teachers ON public.timetable_slots;
CREATE TRIGGER trg_notify_timetable_change_to_teachers
AFTER INSERT OR UPDATE OR DELETE ON public.timetable_slots
FOR EACH ROW EXECUTE FUNCTION private.notify_timetable_change_to_teachers();

CREATE OR REPLACE FUNCTION private.notify_teacher_on_administrative_exclusion_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_student_name text;
  v_class_name text;
  v_type text;
  v_title text;
  v_body text;
  v_teacher record;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'lifted') THEN
    RETURN NEW;
  END IF;

  SELECT concat_ws(' ', s.first_name, s.last_name)
    INTO v_student_name
  FROM public.students s WHERE s.id = NEW.student_id;

  SELECT sc.name INTO v_class_name
  FROM public.school_classes sc WHERE sc.id = NEW.class_id;

  IF TG_OP = 'INSERT' THEN
    v_type := 'administrative_exclusion_published';
    v_title := 'Exclusion administrative prononcée';
    v_body := COALESCE(v_student_name, 'Un élève') || ' de ' ||
      COALESCE(v_class_name, 'votre classe') ||
      ' est exclu de toutes les matières. Motif : ' || NEW.reason ||
      CASE WHEN NEW.is_permanent THEN ' Durée : définitive.'
           ELSE ' Jusqu’au ' || to_char(NEW.end_date, 'DD/MM/YYYY') || '.' END;
  ELSE
    v_type := 'administrative_exclusion_lifted';
    v_title := 'Exclusion administrative levée';
    v_body := 'La décision concernant ' || COALESCE(v_student_name, 'un élève') ||
      ' de ' || COALESCE(v_class_name, 'votre classe') ||
      ' a été levée. L’élève peut reprendre les cours.';
  END IF;

  FOR v_teacher IN
    SELECT DISTINCT t.profile_id
    FROM public.class_subjects cs
    JOIN public.teachers t ON t.id = cs.teacher_id AND t.active = true
    JOIN public.teacher_establishments te
      ON te.teacher_id = t.id
     AND te.establishment_id = NEW.establishment_id
     AND te.status = 'active'
    WHERE cs.class_id = NEW.class_id
      AND t.profile_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications(
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    VALUES(
      NEW.establishment_id, v_teacher.profile_id, v_type, v_title, v_body,
      'administrative_exclusion', NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_teacher_administrative_exclusion ON public.administrative_exclusions;
CREATE TRIGGER trg_notify_teacher_administrative_exclusion
AFTER INSERT OR UPDATE OF status ON public.administrative_exclusions
FOR EACH ROW EXECUTE FUNCTION private.notify_teacher_on_administrative_exclusion_event();

CREATE OR REPLACE FUNCTION private.notify_teacher_on_course_exclusion_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_student_name text;
  v_subject_name text;
  v_class_name text;
  v_title text;
  v_body text;
BEGIN
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT concat_ws(' ', s.first_name, s.last_name)
    INTO v_student_name
  FROM public.students s WHERE s.id = NEW.student_id;

  SELECT sub.name INTO v_subject_name
  FROM public.subjects sub WHERE sub.id = NEW.subject_id;

  SELECT sc.name INTO v_class_name
  FROM public.school_classes sc WHERE sc.id = NEW.class_id;

  IF NEW.status = 'approved' THEN
    v_title := 'Exclusion validée par l’administration';
    v_body := COALESCE(v_student_name, 'L’élève') || ' — ' ||
      COALESCE(v_subject_name, 'matière') || ' (' ||
      COALESCE(v_class_name, 'classe') ||
      '). Votre demande a été validée. Fin prévue : ' ||
      to_char(NEW.end_date, 'DD/MM/YYYY') || '.';
  ELSE
    v_title := 'Exclusion refusée par l’administration';
    v_body := COALESCE(v_student_name, 'L’élève') || ' — ' ||
      COALESCE(v_subject_name, 'matière') ||
      '. Votre demande a été refusée.' ||
      CASE WHEN NEW.review_note IS NOT NULL THEN ' Motif : ' || NEW.review_note ELSE '' END;
  END IF;

  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications(
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    VALUES(
      NEW.establishment_id, NEW.created_by, 'course_exclusion_reviewed',
      v_title, v_body, 'course_exclusion', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_teacher_course_exclusion_review ON public.course_exclusions;
CREATE TRIGGER trg_notify_teacher_course_exclusion_review
AFTER UPDATE OF status ON public.course_exclusions
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION private.notify_teacher_on_course_exclusion_review();

CREATE OR REPLACE FUNCTION private.can_view_notification(
  p_establishment_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_account_type public.account_type;
BEGIN
  IF p_user_id IS NULL OR p_establishment_id IS NULL OR p_type IS NULL THEN
    RETURN false;
  END IF;

  SELECT pr.account_type INTO v_account_type
  FROM public.profiles pr
  WHERE pr.id = p_user_id;

  IF p_type = 'timetable_updated' AND p_entity_type = 'timetable_schedule' THEN
    IF v_account_type = 'parent' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.enrollments en
        JOIN public.student_guardians sg
          ON sg.student_id = en.student_id
         AND sg.establishment_id = en.establishment_id
        WHERE en.establishment_id = p_establishment_id
          AND en.class_id = p_entity_id
          AND en.status::text = 'active'
          AND sg.guardian_user_id = p_user_id
          AND sg.active = true
          AND sg.can_view_academic = true
      );
    END IF;
    IF v_account_type = 'teacher' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.establishment_id = p_establishment_id
          AND n.recipient_user_id = p_user_id
          AND n.type = p_type
          AND n.entity_type = p_entity_type
          AND n.entity_id = p_entity_id
      );
    END IF;
  END IF;

  IF p_type = 'course_exclusion_reviewed' AND p_entity_type = 'course_exclusion'
     AND v_account_type = 'teacher' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.course_exclusions ce
      WHERE ce.id = p_entity_id
        AND ce.establishment_id = p_establishment_id
        AND ce.created_by = p_user_id
    );
  END IF;

  IF p_type IN ('administrative_exclusion_published', 'administrative_exclusion_lifted')
     AND p_entity_type = 'administrative_exclusion' THEN
    IF v_account_type = 'parent' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.administrative_exclusions ae
        JOIN public.student_guardians sg
          ON sg.student_id = ae.student_id
         AND sg.establishment_id = ae.establishment_id
        WHERE ae.id = p_entity_id
          AND ae.establishment_id = p_establishment_id
          AND sg.guardian_user_id = p_user_id
          AND sg.active = true
          AND sg.can_view_academic = true
      );
    END IF;
    IF v_account_type = 'teacher' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.establishment_id = p_establishment_id
          AND n.recipient_user_id = p_user_id
          AND n.type = p_type
          AND n.entity_type = p_entity_type
          AND n.entity_id = p_entity_id
      );
    END IF;
  END IF;

  IF p_type IN ('course_exclusion_reported', 'course_exclusion_approved')
     AND p_entity_type = 'course_exclusion' THEN
    IF v_account_type = 'parent' THEN
      RETURN p_type = 'course_exclusion_approved' AND EXISTS (
        SELECT 1
        FROM public.course_exclusions ce
        JOIN public.student_guardians sg
          ON sg.student_id = ce.student_id
         AND sg.establishment_id = ce.establishment_id
        WHERE ce.id = p_entity_id
          AND ce.establishment_id = p_establishment_id
          AND ce.status = 'approved'
          AND sg.guardian_user_id = p_user_id
          AND sg.active = true
          AND sg.can_view_academic = true
      );
    END IF;
    RETURN private.has_permission(p_establishment_id, 'attendance.manage', p_user_id)
      AND EXISTS (
        SELECT 1 FROM public.course_exclusions ce
        WHERE ce.id = p_entity_id AND ce.establishment_id = p_establishment_id
      );
  END IF;

  RETURN private.can_view_notification_base(
    p_establishment_id, p_type, p_entity_type, p_entity_id, p_user_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_timetable_change_to_teachers() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_teacher_on_administrative_exclusion_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_teacher_on_course_exclusion_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_notification(uuid, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_notification(uuid, text, text, uuid, uuid) TO authenticated, service_role;
