-- Security hardening for parent and platform-admin RPC surfaces.
-- These functions are intended for authenticated callers only. PostgreSQL grants
-- EXECUTE on newly-created functions to PUBLIC by default, so revoking only from
-- anon is insufficient: PUBLIC must be revoked explicitly, then authenticated
-- access granted back.

revoke execute on function public.my_children() from anon;
revoke execute on function public.my_establishments() from anon;
revoke execute on function public.my_school_memberships() from anon;
revoke execute on function public.parent_child_academic_summary(uuid) from anon;

revoke execute on function public.platform_admin_can_manage(uuid) from public;
revoke execute on function public.platform_admin_has_permission(text) from public;
revoke execute on function public.platform_admin_is_root() from public;
revoke execute on function public.platform_admin_list() from public;
revoke execute on function public.platform_admin_parents() from public;
revoke execute on function public.platform_admin_set_active(uuid, boolean) from public;
revoke execute on function public.platform_admin_set_parent_active(uuid, uuid, boolean) from public;
revoke execute on function public.platform_admin_update_permissions(uuid, text[]) from public;

grant execute on function public.platform_admin_can_manage(uuid) to authenticated;
grant execute on function public.platform_admin_has_permission(text) to authenticated;
grant execute on function public.platform_admin_is_root() to authenticated;
grant execute on function public.platform_admin_list() to authenticated;
grant execute on function public.platform_admin_parents() to authenticated;
grant execute on function public.platform_admin_set_active(uuid, boolean) to authenticated;
grant execute on function public.platform_admin_set_parent_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.platform_admin_update_permissions(uuid, text[]) to authenticated;
