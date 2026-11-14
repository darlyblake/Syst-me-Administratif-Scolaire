-- A per-member revocation must always win over broader grants.
-- Exact/category grants still allow access when no matching revocation exists.
-- Platform admins and establishment administrators retain their existing full-access rules.

create or replace function private.has_permission(
  p_establishment_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when p_establishment_id is null or p_permission is null or p_user_id is null then false
    when private.is_platform_admin(p_user_id) then true
    when exists (
      select 1
      from public.profiles pr
      where pr.id = p_user_id
        and pr.account_type = 'teacher'
    ) then false
    else exists (
      select 1
      from public.establishment_members m
      where m.establishment_id = p_establishment_id
        and m.user_id = p_user_id
        and m.active = true
        and case
          when m.role in ('owner', 'admin', 'school_admin') then true
          -- Explicit member revocations are evaluated before any grant,
          -- including role defaults and broad category grants.
          when exists (
            select 1
            from public.establishment_member_permissions mp
            where mp.establishment_member_id = m.id
              and mp.effect = 'revoke'
              and mp.permission in (
                '*',
                p_permission,
                private.permission_category(p_permission)
              )
          ) then false
          when exists (
            select 1
            from public.establishment_member_permissions mp
            where mp.establishment_member_id = m.id
              and mp.effect = 'grant'
              and mp.permission in (
                p_permission,
                private.permission_category(p_permission),
                private.permission_implied_manage(p_permission)
              )
          ) then true
          else exists (
            select 1
            from public.establishment_role_permissions rp
            where rp.role_id = m.role_id
              and rp.permission in (
                p_permission,
                private.permission_category(p_permission),
                private.permission_implied_manage(p_permission)
              )
          )
        end
    )
  end;
$function$;

revoke all on function private.has_permission(uuid, text, uuid) from public, anon;
grant execute on function private.has_permission(uuid, text, uuid) to authenticated, service_role;
