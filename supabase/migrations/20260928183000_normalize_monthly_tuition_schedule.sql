-- Normalize and protect monthly tuition schedules.
-- Fixes duplicate months such as two September installments and prevents
-- future monthly tuition schedule collisions for the same enrollment.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT enrollment_id
    FROM public.payment_schedules
    WHERE category = 'tuition'
      AND lower(label) ~ '(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre|mensualité)'
  LOOP
    WITH monthly AS (
      SELECT
        ps.id,
        row_number() OVER (ORDER BY ps.installment_number, ps.due_date, ps.created_at, ps.id) - 1 AS rn,
        min(ps.due_date) OVER () AS anchor_date
      FROM public.payment_schedules ps
      WHERE ps.enrollment_id = r.enrollment_id
        AND ps.category = 'tuition'
        AND lower(ps.label) ~ '(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre|mensualité)'
    )
    UPDATE public.payment_schedules ps
    SET
      due_date = (m.anchor_date + make_interval(months => m.rn))::date,
      label = 'Mensualité ' || (m.rn + 1),
      updated_at = now()
    FROM monthly m
    WHERE ps.id = m.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_monthly_tuition_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate_date date;
BEGIN
  IF NEW.category = 'tuition'
     AND lower(coalesce(NEW.label, '')) ~ '(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre|mensualité)'
  THEN
    candidate_date := NEW.due_date;

    WHILE EXISTS (
      SELECT 1
      FROM public.payment_schedules ps
      WHERE ps.enrollment_id = NEW.enrollment_id
        AND ps.category = 'tuition'
        AND ps.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND date_trunc('month', ps.due_date) = date_trunc('month', candidate_date)
    )
    LOOP
      candidate_date := (candidate_date + interval '1 month')::date;
    END LOOP;

    NEW.due_date := candidate_date;
    NEW.label := 'Mensualité ' || NEW.installment_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_monthly_tuition_schedule ON public.payment_schedules;

CREATE TRIGGER trg_normalize_monthly_tuition_schedule
BEFORE INSERT OR UPDATE OF due_date, label, installment_number, category, enrollment_id
ON public.payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.normalize_monthly_tuition_schedule();

REVOKE ALL ON FUNCTION public.normalize_monthly_tuition_schedule() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_monthly_tuition_schedule() TO authenticated;
