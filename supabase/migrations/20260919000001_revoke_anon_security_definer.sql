-- Fix: Revoke execute on SECURITY DEFINER functions from anon to prevent unauthenticated access
revoke execute on function public.is_establishment_member(uuid, uuid) from anon;
revoke execute on function public.has_establishment_role(uuid, text[], uuid) from anon;
