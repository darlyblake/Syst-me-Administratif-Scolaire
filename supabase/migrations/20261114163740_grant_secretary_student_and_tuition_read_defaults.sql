create or replace function private.seed_secretary_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if lower(translate(new.name,'àáâäãåçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn')) in ('secretaire','secretary') then
    insert into public.establishment_role_permissions(role_id,permission)
    select new.id, permission
    from unnest(array['students.manage','tuition.view']::text[]) as p(permission)
    where not exists (
      select 1 from public.establishment_role_permissions rp
      where rp.role_id=new.id and rp.permission=p.permission
    );
  end if;
  return new;
end;
$function$;

revoke all on function private.seed_secretary_role_permissions() from public,anon,authenticated;
grant execute on function private.seed_secretary_role_permissions() to service_role;

drop trigger if exists seed_secretary_role_permissions on public.establishment_roles;
create trigger seed_secretary_role_permissions
after insert on public.establishment_roles
for each row execute function private.seed_secretary_role_permissions();

insert into public.establishment_role_permissions(role_id,permission)
select r.id,p.permission
from public.establishment_roles r
cross join unnest(array['students.manage','tuition.view']::text[]) as p(permission)
where lower(translate(r.name,'àáâäãåçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn')) in ('secretaire','secretary')
and not exists (
  select 1 from public.establishment_role_permissions rp
  where rp.role_id=r.id and rp.permission=p.permission
);
