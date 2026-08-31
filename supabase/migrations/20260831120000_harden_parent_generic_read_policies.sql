-- Parent accounts must not inherit establishment-wide member SELECT policies.
-- Their access is granted only by explicit guardian-link policies.

DROP POLICY IF EXISTS "students_member_select" ON public.students;
CREATE POLICY "students_member_select" ON public.students
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

DROP POLICY IF EXISTS "enrollment_member_select" ON public.enrollments;
CREATE POLICY "enrollment_member_select" ON public.enrollments
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

DROP POLICY IF EXISTS "grades_member" ON public.grades;
CREATE POLICY "grades_member" ON public.grades
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = grades.assessment_id
      AND private.is_member(a.establishment_id)
      AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
  )
);

DROP POLICY IF EXISTS "assessments_member" ON public.assessments;
CREATE POLICY "assessments_member" ON public.assessments
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

DROP POLICY IF EXISTS "attendance_member" ON public.attendance_records;
CREATE POLICY "attendance_member" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

DROP POLICY IF EXISTS "payments_member_select" ON public.payments;
CREATE POLICY "payments_member_select" ON public.payments
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

DROP POLICY IF EXISTS "events_member" ON public.school_events;
CREATE POLICY "events_member" ON public.school_events
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

DROP POLICY IF EXISTS "subjects_member" ON public.subjects;
CREATE POLICY "subjects_member" ON public.subjects
FOR SELECT TO authenticated
USING (
  private.is_member(establishment_id)
  AND COALESCE((SELECT account_type FROM public.profiles WHERE id = (SELECT auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);
