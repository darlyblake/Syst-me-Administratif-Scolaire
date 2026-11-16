-- Synchroniser automatiquement les décisions disciplinaires dans les portails parent et enseignant.
ALTER PUBLICATION supabase_realtime ADD TABLE public.administrative_exclusions, public.course_exclusions;
