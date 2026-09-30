-- Corrige l'enregistrement automatique des mouvements financiers.
-- account_id est obligatoire dans accounting_transactions.
CREATE OR REPLACE FUNCTION public.record_financial_movement(
  p_establishment_id uuid,
  p_direction text,
  p_amount numeric,
  p_date timestamptz,
  p_description text,
  p_reference text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
  v_account_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;

  IF p_direction NOT IN ('in','out','entree','sortie') THEN
    RAISE EXCEPTION 'Direction invalide';
  END IF;

  IF p_source_type IS NOT NULL AND p_source_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.accounting_transactions
    WHERE establishment_id = p_establishment_id
      AND source_type = p_source_type
      AND source_id = p_source_id
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  SELECT id INTO v_account_id
  FROM public.accounting_accounts
  WHERE establishment_id = p_establishment_id
    AND code = '571'
    AND active = true
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO public.accounting_accounts(
      establishment_id, code, name, account_type, active
    )
    VALUES (
      p_establishment_id, '571', 'Caisse générale', 'asset', true
    )
    ON CONFLICT (establishment_id, code) DO NOTHING;

    SELECT id INTO v_account_id
    FROM public.accounting_accounts
    WHERE establishment_id = p_establishment_id
      AND code = '571'
      AND active = true
    LIMIT 1;
  END IF;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte financier disponible pour enregistrer cette opération';
  END IF;

  INSERT INTO public.accounting_transactions(
    establishment_id, account_id, transaction_date, description, amount,
    direction, reference, created_by, source_type, source_id
  )
  VALUES (
    p_establishment_id, v_account_id, coalesce(p_date, now()), p_description,
    p_amount, CASE WHEN p_direction IN ('in','entree') THEN 'in' ELSE 'out' END,
    p_reference, coalesce(p_created_by, auth.uid()), p_source_type, p_source_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
