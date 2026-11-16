-- Une affectation matière/classe peut modifier le planning sans modifier timetable_slots.
-- Notifier l'ancien et le nouvel enseignant, puis laisser les abonnés Realtime recharger leur vue.
CREATE OR REPLACE FUNCTION private.notify_teachers_on_class_subject_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_old_establishment_id uuid;
  v_new_establishment_id uuid;
  v_target record;
  v_class_name text;
BEGIN
  IF OLD.teacher_id IS NOT DISTINCT FROM NEW.teacher_id
     AND OLD.class_id IS NOT DISTINCT FROM NEW.class_id
     AND OLD.subject_id IS NOT DISTINCT FROM NEW.subject_id THEN
    RETURN NEW;
  END IF;

  SELECT sc.establishment_id INTO v_old_establishment_id
  FROM public.school_classes sc WHERE sc.id = OLD.class_id;
  SELECT sc.establishment_id INTO v_new_establishment_id
  FROM public.school_classes sc WHERE sc.id = NEW.class_id;

  FOR v_target IN
    SELECT DISTINCT t.profile_id, x.establishment_id, x.class_id, x.subject_name, x.teacher_id
    FROM (VALUES
      (v_old_establishment_id, OLD.class_id, OLD.teacher_id, (SELECT s.name FROM public.subjects s WHERE s.id = OLD.subject_id)),
      (v_new_establishment_id, NEW.class_id, NEW.teacher_id, (SELECT s.name FROM public.subjects s WHERE s.id = NEW.subject_id))
    ) AS x(establishment_id, class_id, teacher_id, subject_name)
    JOIN public.teachers t ON t.id = x.teacher_id AND t.active = true
    JOIN public.teacher_establishments te
      ON te.teacher_id = t.id
     AND te.establishment_id = x.establishment_id
     AND te.status = 'active'
    WHERE x.teacher_id IS NOT NULL
      AND x.establishment_id IS NOT NULL
      AND t.profile_id IS NOT NULL
  LOOP
    SELECT sc.name INTO v_class_name
    FROM public.school_classes sc
    WHERE sc.id = v_target.class_id
      AND sc.establishment_id = v_target.establishment_id;

    INSERT INTO public.notifications(
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    VALUES(
      v_target.establishment_id,
      v_target.profile_id,
      'timetable_updated',
      'Votre emploi du temps a changé',
      CASE
        WHEN v_target.teacher_id = OLD.teacher_id AND v_target.teacher_id IS DISTINCT FROM NEW.teacher_id
          THEN 'Vous n’êtes plus affecté à cette matière ou à cette classe : '
        ELSE 'Votre affectation a été modifiée : '
      END ||
      COALESCE(v_target.subject_name, 'Matière') || ' · ' ||
      COALESCE(v_class_name, 'Classe') ||
      '. Consultez votre planning pour voir les créneaux concernés.',
      'timetable_schedule',
      v_target.class_id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_teachers_class_subject_assignment_change ON public.class_subjects;
CREATE TRIGGER trg_notify_teachers_class_subject_assignment_change
AFTER UPDATE OF teacher_id, class_id, subject_id ON public.class_subjects
FOR EACH ROW
EXECUTE FUNCTION private.notify_teachers_on_class_subject_assignment_change();

REVOKE ALL ON FUNCTION private.notify_teachers_on_class_subject_assignment_change() FROM PUBLIC, anon, authenticated;
