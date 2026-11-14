-- Les fonctions de déclencheur ne sont pas des points d'entrée RPC.
revoke all on function public.trg_organization_payment_to_financial_movement() from public, anon, authenticated;
revoke all on function public.log_organization_payment_activity() from public, anon, authenticated;
