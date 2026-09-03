-- Public RLS helpers are called by authenticated policies.
-- Explicit EXECUTE grants prevent policy evaluation from failing.
grant execute on function public.has_establishment_role(uuid, text[], uuid) to authenticated;
grant execute on function public.has_establishment_role(uuid, text[], uuid) to anon;
