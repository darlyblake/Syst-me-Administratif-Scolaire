-- Activer Realtime sur les tables métier qui alimentent les vues de pointage,
-- les prises en charge et l'historique des associations parent-enfant.
DO $migration$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'teacher_lesson_attendance',
    'organization_payments',
    'parent_student_association_history',
    'pointage_alerts',
    'pointage_event_history',
    'staff_attendance',
    'staff_members',
    'sponsoring_organizations'
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
