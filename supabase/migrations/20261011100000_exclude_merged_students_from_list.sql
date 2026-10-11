-- Exclut les fiches élèves fusionnées de la liste paginée.
-- Les fiches historiques sont conservées en base pour préserver les références.

DO $migration$
DECLARE
  v_definition text;
  v_old text := 'WHERE s.establishment_id=p_establishment_id';
  v_new text := 'WHERE s.establishment_id=p_establishment_id' || chr(10) || '      AND s.merged_into_student_id IS NULL';
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'list_students_paginated'
    AND pg_get_function_identity_arguments(p.oid) =
      'p_establishment_id uuid, p_page integer, p_page_size integer, p_search text, p_active boolean, p_class_id uuid, p_academic_year_id uuid, p_grade_level_id uuid, p_min_age integer, p_max_age integer';

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'Fonction list_students_paginated introuvable';
  END IF;

  IF length(v_definition) - length(replace(v_definition, v_old, '')) <> 2 * length(v_old) THEN
    RAISE EXCEPTION 'La fonction ne contient pas exactement les deux filtres attendus; aucune modification effectuée';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;
