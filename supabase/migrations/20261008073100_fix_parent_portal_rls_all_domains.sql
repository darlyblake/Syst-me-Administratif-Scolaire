-- Portail parent : policies SELECT basées sur la relation parent -> élève -> inscription active.
-- Les comparaisons d'enrollment_status sont volontairement faites en texte.

-- EMPLOI DU TEMPS
DROP POLICY IF EXISTS "Parents view linked timetable slots" ON public.timetable_slots;
CREATE POLICY "Parents view linked timetable slots"
ON public.timetable_slots FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_subjects cs
  JOIN public.enrollments en ON en.class_id = cs.class_id
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE cs.id = timetable_slots.class_subject_id
    AND en.status::text = 'active'
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND sg.establishment_id = timetable_slots.establishment_id
));

DROP POLICY IF EXISTS "Parents view linked class subjects" ON public.class_subjects;
CREATE POLICY "Parents view linked class subjects"
ON public.class_subjects FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.enrollments en
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE en.class_id = class_subjects.class_id
    AND en.status::text = 'active'
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
));

DROP POLICY IF EXISTS "Parents view linked subjects" ON public.subjects;
CREATE POLICY "Parents view linked subjects"
ON public.subjects FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_subjects cs
  JOIN public.enrollments en ON en.class_id = cs.class_id
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE cs.subject_id = subjects.id
    AND en.status::text = 'active'
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND sg.establishment_id = subjects.establishment_id
));

DROP POLICY IF EXISTS "Parents view linked lesson entries" ON public.teacher_lesson_entries;
CREATE POLICY "Parents view linked lesson entries"
ON public.teacher_lesson_entries FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.timetable_slots ts
  JOIN public.class_subjects cs ON cs.id = ts.class_subject_id
  JOIN public.enrollments en ON en.class_id = cs.class_id
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE ts.id = teacher_lesson_entries.timetable_slot_id
    AND en.status::text = 'active'
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND sg.establishment_id = teacher_lesson_entries.establishment_id
));

DROP POLICY IF EXISTS "Parents view linked homework" ON public.teacher_homework;
CREATE POLICY "Parents view linked homework"
ON public.teacher_homework FOR SELECT TO authenticated
USING (active = true AND EXISTS (
  SELECT 1 FROM public.enrollments en
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE en.class_id = teacher_homework.class_id
    AND en.status::text = 'active'
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND sg.establishment_id = teacher_homework.establishment_id
));

-- NOTES / EVALUATIONS
DROP POLICY IF EXISTS "Parents view linked grades in active establishments" ON public.grades;
CREATE POLICY "Parents view linked grades in active establishments"
ON public.grades FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.student_guardians sg
  JOIN public.assessments a ON a.id = grades.assessment_id
  JOIN public.enrollments en ON en.student_id = sg.student_id
  WHERE sg.student_id = grades.student_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND en.status::text = 'active'
    AND en.class_id = a.class_id
    AND a.establishment_id = sg.establishment_id
));

DROP POLICY IF EXISTS "Parents view assessments for linked children" ON public.assessments;
CREATE POLICY "Parents view assessments for linked children"
ON public.assessments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grades g
  JOIN public.student_guardians sg ON sg.student_id = g.student_id
  WHERE g.assessment_id = assessments.id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND sg.establishment_id = assessments.establishment_id
));

-- FINANCE : réaffirmer les policies parent directement sur l'inscription liée.
DROP POLICY IF EXISTS "Parents view linked payments in active establishments" ON public.payments;
CREATE POLICY "Parents view linked payments in active establishments"
ON public.payments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.enrollments en
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE en.id = payments.enrollment_id
    AND payments.establishment_id = en.establishment_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_finance = true
));

DROP POLICY IF EXISTS "Parents view linked payment schedules" ON public.payment_schedules;
CREATE POLICY "Parents view linked payment schedules"
ON public.payment_schedules FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.enrollments en
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE en.id = payment_schedules.enrollment_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_finance = true
));

DROP POLICY IF EXISTS "Parents view linked payment allocations" ON public.payment_allocations;
CREATE POLICY "Parents view linked payment allocations"
ON public.payment_allocations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.payments p
  JOIN public.enrollments en ON en.id = p.enrollment_id
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE p.id = payment_allocations.payment_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_finance = true
));

DROP POLICY IF EXISTS "Parents view linked enrollment options" ON public.enrollment_options;
CREATE POLICY "Parents view linked enrollment options"
ON public.enrollment_options FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.enrollments en
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE en.id = enrollment_options.enrollment_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_finance = true
));

DROP POLICY IF EXISTS "Parents view linked student options" ON public.student_options;
CREATE POLICY "Parents view linked student options"
ON public.student_options FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.enrollment_options eo
  JOIN public.enrollments en ON en.id = eo.enrollment_id
  JOIN public.student_guardians sg ON sg.student_id = en.student_id AND sg.establishment_id = en.establishment_id
  WHERE eo.option_id = student_options.id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_finance = true
));

-- PRESENCES
DROP POLICY IF EXISTS "Parents view linked attendance in active establishments" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_parent_read" ON public.attendance_records;
CREATE POLICY "Parents view linked attendance in active establishments"
ON public.attendance_records FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.student_guardians sg
  WHERE sg.student_id = attendance_records.student_id
    AND sg.guardian_user_id = (SELECT auth.uid())
    AND sg.active = true AND sg.can_view_academic = true
    AND sg.establishment_id = attendance_records.establishment_id
));
