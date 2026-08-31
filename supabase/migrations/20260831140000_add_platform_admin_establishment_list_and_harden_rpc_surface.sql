create or replace function public.platform_admin_establishments()
returns table(
  id uuid,
  name text,
  code text,
  status public.establishment_status,
  created_at timestamptz,
  subscription_status public.subscription_status,
  subscription_ends_at date,
  users_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  return query
  select
    e.id,
    e.name,
    e.code,
    e.status,
    e.created_at,
    s.status,
    s.ends_at,
    (select count(*) from public.establishment_members m where m.establishment_id = e.id)::bigint
  from public.establishments e
  left join lateral (
    select es.status, es.ends_at
    from public.establishment_subscriptions es
    where es.establishment_id = e.id
    order by es.updated_at desc nulls last, es.created_at desc
    limit 1
  ) s on true
  order by e.created_at desc;
end;
$$;

revoke execute on function public.platform_admin_establishments() from public, anon;
grant execute on function public.platform_admin_establishments() to authenticated, service_role;

revoke execute on function public.platform_admin_dashboard_summary() from public, anon;
revoke execute on function public.platform_admin_expiring_subscriptions() from public, anon;
revoke execute on function public.platform_admin_delete_establishment(uuid) from public, anon;
revoke execute on function public.platform_admin_establishment_overview(uuid) from public, anon;
revoke execute on function public.platform_admin_set_subscription(uuid,text,date,date,public.subscription_status,integer,integer,integer,integer,text) from public, anon;
revoke execute on function public.platform_admin_update_establishment(uuid,text) from public, anon;
revoke execute on function public.set_establishment_status(uuid,public.establishment_status) from public, anon;
revoke execute on function public.platform_admin_support_requests() from public, anon;
revoke execute on function public.platform_admin_update_support_status(uuid,text) from public, anon;
revoke execute on function public.platform_admin_set_member_active(uuid,boolean) from public, anon;
revoke execute on function public.get_establishment_members(uuid) from public, anon;
