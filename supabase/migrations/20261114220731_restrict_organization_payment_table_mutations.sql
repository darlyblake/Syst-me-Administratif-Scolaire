-- Les versements globaux sont créés exclusivement par le RPC sécurisé.
-- Les utilisateurs authentifiés disposent uniquement de la lecture, soumise à RLS.
revoke all on table public.organization_payments from public, anon, authenticated;
grant select on table public.organization_payments to authenticated;
grant all on table public.organization_payments to service_role;
