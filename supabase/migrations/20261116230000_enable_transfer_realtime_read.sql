-- Le module transferts lit les dossiers via une RPC SECURITY DEFINER.
-- Cette politique SELECT reproduit les mêmes permissions pour permettre à Realtime
-- d'informer les pages ouvertes sans exposer les dossiers aux autres comptes.
DROP POLICY IF EXISTS student_transfer_requests_realtime_select ON public.student_transfer_requests;
CREATE POLICY student_transfer_requests_realtime_select
ON public.student_transfer_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    private.has_permission(source_establishment_id, 'students.view', auth.uid())
    OR private.has_permission(source_establishment_id, 'students.read', auth.uid())
    OR private.has_permission(source_establishment_id, 'students.manage', auth.uid())
    OR private.has_permission(source_establishment_id, 'enrollments.view', auth.uid())
    OR private.has_permission(source_establishment_id, 'enrollments.read', auth.uid())
    OR private.has_permission(source_establishment_id, 'enrollments.manage', auth.uid())
    OR private.has_permission(destination_establishment_id, 'students.view', auth.uid())
    OR private.has_permission(destination_establishment_id, 'students.read', auth.uid())
    OR private.has_permission(destination_establishment_id, 'students.manage', auth.uid())
    OR private.has_permission(destination_establishment_id, 'enrollments.view', auth.uid())
    OR private.has_permission(destination_establishment_id, 'enrollments.read', auth.uid())
    OR private.has_permission(destination_establishment_id, 'enrollments.manage', auth.uid())
  )
);
