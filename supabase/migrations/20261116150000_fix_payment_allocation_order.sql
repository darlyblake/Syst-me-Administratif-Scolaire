CREATE OR REPLACE FUNCTION public.create_payment_with_allocations(
  p_enrollment_id uuid,
  p_amount numeric,
  p_reference text DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_allocations jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment_id uuid;
  v_establishment_id uuid;
  v_allocated numeric := 0;
  v_schedule_id uuid;
  v_target uuid;
  v_amount numeric;
  v_payer text;
  v_category text;
  v_refundable boolean;
  v_org uuid;
  v_first uuid;
  v_remaining numeric;
  v_alloc_payer text;
  v_alloc_org uuid;
  r jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT establishment_id
  INTO v_establishment_id
  FROM public.enrollments
  WHERE id = p_enrollment_id;

  IF v_establishment_id IS NULL THEN
    RAISE EXCEPTION 'Inscription introuvable';
  END IF;

  IF NOT private.has_role(v_establishment_id, ARRAY['owner','admin','director','accountant']) THEN
    RAISE EXCEPTION 'Permission insuffisante';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant de paiement invalide';
  END IF;

  IF jsonb_typeof(p_allocations) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'Allocations invalides';
  END IF;

  SELECT COALESCE(SUM((x.value->>'amount')::numeric), 0)
  INTO v_allocated
  FROM jsonb_array_elements(p_allocations) AS x(value);

  IF v_allocated <> p_amount THEN
    RAISE EXCEPTION 'Le total des affectations doit egaler le paiement';
  END IF;

  -- Le premier élément envoyé par le navigateur n'est pas une source d'ordre fiable.
  -- On détermine la première échéance à partir de l'ordre canonique de la base.
  SELECT s.id
  INTO v_target
  FROM jsonb_array_elements(p_allocations) AS x(value)
  JOIN public.payment_schedules s
    ON s.id = (x.value->>'payment_schedule_id')::uuid
  WHERE s.enrollment_id = p_enrollment_id
  ORDER BY s.priority_rank NULLS LAST, s.installment_number, s.due_date, s.id
  LIMIT 1;

  SELECT
    s.payer_type,
    s.category,
    COALESCE(s.is_refundable, false),
    s.organization_id,
    GREATEST(COALESCE(s.amount_due, 0) - COALESCE(s.amount_paid, 0), 0)
  INTO v_payer, v_category, v_refundable, v_org, v_remaining
  FROM public.payment_schedules s
  WHERE s.id = v_target
    AND s.enrollment_id = p_enrollment_id;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Echeance invalide';
  END IF;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Cette échéance est déjà soldée';
  END IF;

  IF v_category IN ('registration', 'tuition', 'scolarite') THEN
    SELECT s.id
    INTO v_first
    FROM public.payment_schedules s
    WHERE s.enrollment_id = p_enrollment_id
      AND s.category IN ('registration', 'tuition', 'scolarite')
      AND s.payer_type = v_payer
      AND COALESCE(s.organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(v_org, '00000000-0000-0000-0000-000000000000'::uuid)
      AND GREATEST(COALESCE(s.amount_due, 0) - COALESCE(s.amount_paid, 0), 0) > 0
    ORDER BY s.priority_rank NULLS LAST, s.installment_number, s.due_date, s.id
    LIMIT 1;

    IF v_first IS NULL THEN
      RAISE EXCEPTION 'Aucune échéance restante pour ce payeur';
    END IF;

    IF v_target IS DISTINCT FROM v_first THEN
      RAISE EXCEPTION 'Vous devez d’abord solder l’échéance précédente de ce payeur';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) AS x(value)
    GROUP BY (x.value->>'payment_schedule_id')
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Une échéance ne peut apparaître qu’une fois dans un même paiement';
  END IF;

  INSERT INTO public.payments(
    establishment_id, enrollment_id, amount, reference, method, notes,
    recorded_by, payer_type, category, is_refundable, organization_id
  )
  VALUES(
    v_establishment_id, p_enrollment_id, p_amount, p_reference, p_method, p_notes,
    auth.uid(), COALESCE(v_payer, 'family'), COALESCE(v_category, 'tuition'),
    v_refundable, v_org
  )
  RETURNING id INTO v_payment_id;

  -- Insérer les affectations dans le même ordre canonique que le contrôle SQL
  -- et le déclencheur de validation séquentielle.
  FOR r IN
    SELECT x.value
    FROM jsonb_array_elements(p_allocations) AS x(value)
    LEFT JOIN public.payment_schedules s
      ON s.id = (x.value->>'payment_schedule_id')::uuid
    ORDER BY s.priority_rank NULLS LAST, s.installment_number, s.due_date, s.id
  LOOP
    v_schedule_id := (r->>'payment_schedule_id')::uuid;
    v_amount := (r->>'amount')::numeric;

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Montant d affectation invalide';
    END IF;

    SELECT
      s.payer_type,
      s.organization_id,
      GREATEST(COALESCE(s.amount_due, 0) - COALESCE(s.amount_paid, 0), 0)
    INTO v_alloc_payer, v_alloc_org, v_remaining
    FROM public.payment_schedules s
    WHERE s.id = v_schedule_id
      AND s.enrollment_id = p_enrollment_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Une échéance du paiement est introuvable pour cette inscription';
    END IF;

    IF v_alloc_payer IS DISTINCT FROM v_payer
       OR COALESCE(v_alloc_org, '00000000-0000-0000-0000-000000000000'::uuid)
          <> COALESCE(v_org, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      RAISE EXCEPTION 'Un même paiement ne peut pas mélanger plusieurs payeurs ou organismes';
    END IF;

    IF v_remaining <= 0 OR v_amount > v_remaining THEN
      RAISE EXCEPTION 'Le montant affecté dépasse le solde de l’échéance';
    END IF;

    INSERT INTO public.payment_allocations(payment_id, payment_schedule_id, amount)
    VALUES(v_payment_id, v_schedule_id, v_amount);
  END LOOP;

  RETURN v_payment_id;
END;
$function$;
