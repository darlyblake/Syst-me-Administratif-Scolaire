-- Compléter les tables métier qui alimentent les journaux, demandes,
-- familles, inscriptions/transferts et les vues de pilotage de la plateforme.
DO $migration$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'audit_logs',
    'enrollment_discount_snapshots',
    'establishment_members',
    'establishment_registration_requests',
    'establishment_subscriptions',
    'establishments',
    'family_discount_rules',
    'organization_coverage_rules',
    'organization_student_assignments',
    'parent_document_requests',
    'parent_document_request_attachments',
    'school_classes',
    'school_families',
    'student_family_members',
    'student_transfer_requests'
  ]
  LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = v_table
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$migration$;
