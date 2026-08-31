create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_by uuid null references public.platform_admins(user_id) on delete restrict,
  permissions text[] not null default '{}',
  active boolean not null default true,
  is_root boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_admin_permissions_allowed check (permissions <@ array['dashboard.view','establishments.view','establishments.manage','subscriptions.manage','users.view','admins.manage','support.manage','settings.manage']::text[])
);

alter table public.platform_admins enable row level security;
create index if not exists platform_admins_created_by_idx on public.platform_admins(created_by);
create index if not exists platform_admins_active_idx on public.platform_admins(active);

insert into public.platform_admins (user_id,created_by,permissions,active,is_root,created_at,updated_at)
select p.id,null,array['dashboard.view','establishments.view','establishments.manage','subscriptions.manage','users.view','admins.manage','support.manage','settings.manage']::text[],true,true,p.created_at,now()
from public.profiles p
where p.account_type='platform_admin' and p.id=(select p2.id from public.profiles p2 where p2.account_type='platform_admin' order by p2.created_at asc,p2.id asc limit 1)
on conflict (user_id) do update set is_root=true,created_by=null;

insert into public.platform_admins (user_id,created_by,permissions,active,is_root,created_at,updated_at)
select p.id,r.user_id,r.permissions,true,false,p.created_at,now()
from public.profiles p cross join lateral (select user_id,permissions from public.platform_admins where is_root order by created_at asc limit 1) r
where p.account_type='platform_admin' and not exists(select 1 from public.platform_admins pa where pa.user_id=p.id);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.platform_admins pa where pa.user_id=auth.uid() and pa.active)
$$;

create or replace function public.platform_admin_is_root()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.platform_admins where user_id=auth.uid() and active and is_root)
$$;

create or replace function public.platform_admin_has_permission(p_permission text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.platform_admins pa where pa.user_id=auth.uid() and pa.active and (pa.is_root or p_permission=any(pa.permissions)))
$$;

create or replace function public.platform_admin_can_manage(p_target uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_current uuid:=auth.uid(); v_root boolean; begin
  if v_current is null then return false; end if;
  select is_root into v_root from public.platform_admins where user_id=v_current and active;
  if not found then return false; end if;
  if v_root then return exists(select 1 from public.platform_admins where user_id=p_target); end if;
  if not public.platform_admin_has_permission('admins.manage') then return false; end if;
  return exists(with recursive chain as (select pa.user_id,pa.created_by from public.platform_admins pa where pa.user_id=p_target union all select pa.user_id,pa.created_by from public.platform_admins pa join chain c on pa.user_id=c.created_by) select 1 from chain where user_id=v_current);
end; $$;

create or replace function public.platform_admin_list()
returns table(user_id uuid,email text,first_name text,last_name text,active boolean,is_root boolean,created_by uuid,created_by_name text,permissions text[],created_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.platform_admin_has_permission('admins.manage') then raise exception 'platform_admin_required'; end if;
  return query select pa.user_id,u.email::text,p.first_name,p.last_name,pa.active,pa.is_root,pa.created_by,concat_ws(' ',cp.first_name,cp.last_name),pa.permissions,pa.created_at from public.platform_admins pa join auth.users u on u.id=pa.user_id left join public.profiles p on p.id=pa.user_id left join public.profiles cp on cp.id=pa.created_by order by pa.is_root desc,pa.created_at asc;
end; $$;

create or replace function public.platform_admin_set_active(p_user_id uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.platform_admin_can_manage(p_user_id) then raise exception 'permission_denied'; end if;
  if exists(select 1 from public.platform_admins where user_id=p_user_id and is_root) then raise exception 'root_admin_protected'; end if;
  update public.platform_admins set active=p_active,updated_at=now() where user_id=p_user_id; return true;
end; $$;

create or replace function public.platform_admin_update_permissions(p_user_id uuid,p_permissions text[])
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_is_root boolean; v_caller_permissions text[]; begin
  if not public.platform_admin_can_manage(p_user_id) then raise exception 'permission_denied'; end if;
  select is_root into v_is_root from public.platform_admins where user_id=p_user_id;
  if v_is_root then raise exception 'root_admin_protected'; end if;
  select permissions into v_caller_permissions from public.platform_admins where user_id=auth.uid() and active;
  if not public.platform_admin_is_root() and not(coalesce(p_permissions,'{}') <@ coalesce(v_caller_permissions,'{}')) then raise exception 'permissions_exceed_creator'; end if;
  update public.platform_admins set permissions=coalesce(p_permissions,'{}'),updated_at=now() where user_id=p_user_id; return true;
end; $$;

grant execute on function public.platform_admin_is_root() to authenticated;
grant execute on function public.platform_admin_has_permission(text) to authenticated;
grant execute on function public.platform_admin_can_manage(uuid) to authenticated;
grant execute on function public.platform_admin_list() to authenticated;
grant execute on function public.platform_admin_set_active(uuid,boolean) to authenticated;
grant execute on function public.platform_admin_update_permissions(uuid,text[]) to authenticated;
