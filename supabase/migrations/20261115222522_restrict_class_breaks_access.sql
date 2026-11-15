revoke all on table public.class_breaks from public, anon;
grant select, insert, update, delete on table public.class_breaks to authenticated, service_role;

revoke all on function private.parent_can_view_class_break(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function private.parent_can_view_class_break(uuid, uuid, uuid, uuid) to authenticated, service_role;
