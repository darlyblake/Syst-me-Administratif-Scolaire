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
SET search_path TO ''
AS $function$
DECLARE
  v_account_type public.account_type;
BEGIN
  IF p_user_id IS NULL OR p_establishment_id IS NULL OR p_type IS NULL THEN
    RETURN false;
  END IF;

  IF p_type IN ('attendance_justification_submitted','attendance_justification_reviewed')
     AND p_entity_type = 'attendance_justification_request' THEN
    SELECT pr.account_type INTO v_account_type
    FROM public.profiles pr
    WHERE pr.id = p_user_id;

    IF v_account_type = 'parent' THEN
      IF p_type <> 'attendance_justification_reviewed' THEN
        RETURN false;
      END IF;
      RETURN EXISTS (
        SELECT 1
        FROM public.attendance_justification_requests r
        JOIN public.student_guardians sg
          ON sg.student_id = r.student_id
         AND sg.establishment_id = r.establishment_id
        WHERE r.id = p_entity_id
          AND r.establishment_id = p_establishment_id
          AND r.parent_user_id = p_user_id
          AND sg.guardian_user_id = p_user_id
          AND sg.active = true
          AND sg.can_view_academic = true
      );
    END IF;

    RETURN private.has_permission(p_establishment_id, 'attendance.manage', p_user_id)
      AND EXISTS (
        SELECT 1
        FROM public.attendance_justification_requests r
        WHERE r.id = p_entity_id
          AND r.establishment_id = p_establishment_id
      );
  END IF;

  IF p_type = 'timetable_updated' AND p_entity_type = 'timetable_schedule' THEN
    SELECT pr.account_type INTO v_account_type
    FROM public.profiles pr
    WHERE pr.id = p_user_id;

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
  END IF;

  RETURN private.can_view_notification_base(
    p_establishment_id, p_type, p_entity_type, p_entity_id, p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.notify_attendance_justification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_student_name text;
BEGIN
  SELECT concat_ws(' ', s.first_name, s.last_name)
    INTO v_student_name
  FROM public.students s
  WHERE s.id = NEW.student_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    SELECT
      NEW.establishment_id,
      em.user_id,
      'attendance_justification_submitted',
      'Justification d’absence reçue',
      'Une demande de justification a été envoyée pour ' || coalesce(nullif(v_student_name,''),'un élève') || '.',
      'attendance_justification_request',
      NEW.id
    FROM public.establishment_members em
    WHERE em.establishment_id = NEW.establishment_id
      AND em.active = true
      AND em.user_id <> NEW.parent_user_id
      AND private.has_permission(NEW.establishment_id, 'attendance.manage', em.user_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifications (
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    VALUES (
      NEW.establishment_id,
      NEW.parent_user_id,
      'attendance_justification_reviewed',
      CASE WHEN NEW.status = 'approved'
        THEN 'Justification acceptée'
        ELSE 'Justification refusée'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'La justification pour ' || coalesce(nullif(v_student_name,''),'votre enfant') || ' a été acceptée.'
        ELSE 'La justification pour ' || coalesce(nullif(v_student_name,''),'votre enfant') || ' a été refusée.' ||
          CASE WHEN nullif(trim(NEW.reviewer_note),'') IS NOT NULL THEN ' Motif : ' || trim(NEW.reviewer_note) ELSE '' END
      END,
      'attendance_justification_request',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS attendance_justification_notifications ON public.attendance_justification_requests;
CREATE TRIGGER attendance_justification_notifications
AFTER INSERT OR UPDATE OF status ON public.attendance_justification_requests
FOR EACH ROW
EXECUTE FUNCTION private.notify_attendance_justification_change();

REVOKE ALL ON FUNCTION private.notify_attendance_justification_change() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Parents view own attendance justification files" ON storage.objects;
CREATE POLICY "Parents and attendance managers view justification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attendance-justifications'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.attendance_justification_requests r
      WHERE r.attachment_path = objects.name
        AND private.has_permission(r.establishment_id, 'attendance.manage')
    )
  )
);
