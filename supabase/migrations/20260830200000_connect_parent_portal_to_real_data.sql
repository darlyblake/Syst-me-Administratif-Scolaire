-- Connect the parent portal to real Supabase data.
-- Parents can only read records for students explicitly linked to their account.

CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian_user_id ON public.student_guardians(guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student_id ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment_id ON public.payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance_records(student_id);

DROP POLICY IF EXISTS "Parents view own guardian links" ON public.student_guardians;
CREATE POLICY "Parents view own guardian links" ON public.student_guardians
FOR SELECT TO authenticated
USING (guardian_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Parents view linked students" ON public.students;
CREATE POLICY "Parents view linked students" ON public.students
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = students.id AND sg.guardian_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Parents view linked enrollments" ON public.enrollments;
CREATE POLICY "Parents view linked enrollments" ON public.enrollments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = enrollments.student_id AND sg.guardian_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Parents view linked attendance" ON public.attendance_records;
CREATE POLICY "Parents view linked attendance" ON public.attendance_records
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = attendance_records.student_id AND sg.guardian_user_id = (select auth.uid()) AND sg.can_view_academic = true));

DROP POLICY IF EXISTS "Parents view linked grades" ON public.grades;
CREATE POLICY "Parents view linked grades" ON public.grades
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = grades.student_id AND sg.guardian_user_id = (select auth.uid()) AND sg.can_view_academic = true));

DROP POLICY IF EXISTS "Parents view assessments for linked children" ON public.assessments;
CREATE POLICY "Parents view assessments for linked children" ON public.assessments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.grades g JOIN public.student_guardians sg ON sg.student_id = g.student_id WHERE g.assessment_id = assessments.id AND sg.guardian_user_id = (select auth.uid()) AND sg.can_view_academic = true));

DROP POLICY IF EXISTS "Parents view linked payments" ON public.payments;
CREATE POLICY "Parents view linked payments" ON public.payments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.enrollments en JOIN public.student_guardians sg ON sg.student_id = en.student_id WHERE en.id = payments.enrollment_id AND sg.guardian_user_id = (select auth.uid()) AND sg.can_view_finance = true));

DROP POLICY IF EXISTS "Parents view linked events" ON public.school_events;
CREATE POLICY "Parents view linked events" ON public.school_events
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_guardians sg WHERE sg.establishment_id = school_events.establishment_id AND sg.guardian_user_id = (select auth.uid())));

-- Include parent establishments in the authenticated context.
CREATE OR REPLACE FUNCTION public.get_my_auth_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE p public.profiles; result jsonb;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id=auth.uid();
  IF p.id IS NULL THEN RETURN jsonb_build_object('authenticated',false); END IF;
  result:=jsonb_build_object('authenticated',true,'user_id',p.id,'account_type',p.account_type,'first_name',p.first_name,'last_name',p.last_name,'email',(SELECT email FROM auth.users WHERE id=p.id));
  IF p.account_type='platform_admin' THEN RETURN result; END IF;
  IF p.account_type='parent' THEN
    RETURN result || jsonb_build_object('establishments',COALESCE((SELECT jsonb_agg(x ORDER BY x->>'name') FROM (SELECT DISTINCT jsonb_build_object('id',e.id,'name',e.name) x FROM public.student_guardians sg JOIN public.establishments e ON e.id=sg.establishment_id WHERE sg.guardian_user_id=p.id) s),'[]'::jsonb));
  END IF;
  IF p.account_type='teacher' THEN
    RETURN result || jsonb_build_object('establishments',COALESCE((SELECT jsonb_agg(x ORDER BY x->>'name') FROM (SELECT jsonb_build_object('id',e.id,'name',e.name) x FROM public.teacher_establishments te JOIN public.teachers t ON t.id=te.teacher_id JOIN public.establishments e ON e.id=te.establishment_id WHERE t.profile_id=p.id AND te.status='active') s),'[]'::jsonb));
  END IF;
  IF p.account_type='school_member' THEN
    RETURN result || jsonb_build_object('establishments',COALESCE((SELECT jsonb_agg(x ORDER BY x->>'name') FROM (SELECT jsonb_build_object('id',e.id,'name',e.name,'role',m.role) x FROM public.establishment_members m JOIN public.establishments e ON e.id=m.establishment_id WHERE m.user_id=p.id AND m.active=true) s),'[]'::jsonb));
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_auth_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_auth_context() TO authenticated;
