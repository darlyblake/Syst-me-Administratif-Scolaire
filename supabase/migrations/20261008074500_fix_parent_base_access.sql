-- Le portail parent doit pouvoir lire ses propres liens et ses inscriptions sans
-- devoir lire la table establishments via une policy membre.
DROP POLICY IF EXISTS "Parents view own active guardian links" ON public.student_guardians;
CREATE POLICY "Parents view own active guardian links"
ON public.student_guardians FOR SELECT TO authenticated
USING (
  guardian_user_id = (SELECT auth.uid())
  AND active = true
);

DROP POLICY IF EXISTS "Parents view linked enrollments in active establishments" ON public.enrollments;
CREATE POLICY "Parents view linked enrollments in active establishments"
ON public.enrollments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.student_guardians sg
  WHERE sg.student_id = enrollments.student_id
    AND sg.establishment_id = enrollments.establishment_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true
));

DROP POLICY IF EXISTS "Parents view linked students in active establishments" ON public.students;
CREATE POLICY "Parents view linked students in active establishments"
ON public.students FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.student_guardians sg
  WHERE sg.student_id = students.id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true
));
