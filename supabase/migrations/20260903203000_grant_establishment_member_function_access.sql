-- RLS policies use this SECURITY DEFINER helper from authenticated requests.
-- Keep EXECUTE explicit so policy evaluation cannot fail with permission denied.
grant execute on function public.is_establishment_member(uuid, uuid) to authenticated;
grant execute on function public.is_establishment_member(uuid, uuid) to anon;
