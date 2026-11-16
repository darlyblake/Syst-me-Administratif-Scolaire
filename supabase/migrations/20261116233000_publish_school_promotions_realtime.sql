DO $migration$
BEGIN
  IF to_regclass('public.school_promotions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='school_promotions'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_promotions;
  END IF;
END;
$migration$;
