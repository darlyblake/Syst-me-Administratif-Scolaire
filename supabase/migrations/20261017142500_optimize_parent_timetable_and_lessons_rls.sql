-- Optimize parent access checks for timetable and lesson entries.
-- Keep all access scoped to the authenticated parent and their active linked students.

CREATE OR REPLACE FUNCTION private.parent_can_view_timetable_slot(
  p_class_subject_id uuid,
  p_establishment_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.class_subjects cs
      JOIN public.enrollments en
        ON en.class_id = cs.class_id
       AND en.establishment_id = p_establishment_id
       AND en.status::text = 'active'
      JOIN public.student_guardians sg
        ON sg.student_id = en.student_id
       AND sg.establishment_id = en.establishment_id
       AND sg.guardian_user_id = p_user_id
       AND sg.active = true
       AND sg.can_view_academic = true
      WHERE cs.id = p_class_subject_id
    );
$$;

CREATE OR REPLACE FUNCTION private.parent_can_view_lesson_entry(
  p_timetable_slot_id uuid,
  p_establishment_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.timetable_slots ts
      JOIN public.class_subjects cs ON cs.id = ts.class_subject_id
      JOIN public.enrollments en
        ON en.class_id = cs.class_id
       AND en.establishment_id = p_establishment_id
       AND en.status::text = 'active'
      JOIN public.student_guardians sg
        ON sg.student_id = en.student_id
       AND sg.establishment_id = en.establishment_id
       AND sg.guardian_user_id = p_user_id
       AND sg.active = true
       AND sg.can_view_academic = true
      WHERE ts.id = p_timetable_slot_id
        AND ts.establishment_id = p_establishment_id
    );
$$;

REVOKE ALL ON FUNCTION private.parent_can_view_timetable_slot(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.parent_can_view_lesson_entry(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.parent_can_view_timetable_slot(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.parent_can_view_lesson_entry(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Parents view linked timetable slots" ON public.timetable_slots;
CREATE POLICY "Parents view linked timetable slots"
ON public.timetable_slots
FOR SELECT TO authenticated
USING (private.parent_can_view_timetable_slot(class_subject_id, establishment_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Parents view linked lesson entries" ON public.teacher_lesson_entries;
CREATE POLICY "Parents view linked lesson entries"
ON public.teacher_lesson_entries
FOR SELECT TO authenticated
USING (private.parent_can_view_lesson_entry(timetable_slot_id, establishment_id, (SELECT auth.uid())));
