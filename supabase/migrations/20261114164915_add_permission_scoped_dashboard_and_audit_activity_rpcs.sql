create or replace function public.list_audit_logs(
  p_establishment_id uuid,p_limit integer default 100,p_from timestamptz default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb; v_limit integer:=greatest(1,least(coalesce(p_limit,100),500));
begin
  if not private.has_role(p_establishment_id,array['owner','admin','school_admin']) then
    raise exception 'Accès réservé à l’administrateur de l’établissement';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'actor_id',x.actor_id,'action',x.action,'entity_type',x.entity_type,
    'entity_id',x.entity_id,'metadata',x.metadata,'created_at',x.created_at,
    'actor_name',coalesce(nullif(trim(concat_ws(' ',pa.first_name,pa.last_name)),''),'Compte utilisateur'),
    'target_name',nullif(trim(concat_ws(' ',pt.first_name,pt.last_name)),'')
  ) order by x.created_at desc),'[]'::jsonb)
  into result
  from (
    select a.id,a.actor_id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,
      case
        when coalesce(a.metadata->>'target_user_id',a.metadata->>'user_id',a.metadata->>'target_id') ~* '^[0-9a-f-]{36}$'
        then coalesce(a.metadata->>'target_user_id',a.metadata->>'user_id',a.metadata->>'target_id')::uuid
        else null
      end as target_user_id
    from public.audit_logs a
    where a.establishment_id=p_establishment_id
      and (p_from is null or a.created_at>=p_from)
    order by a.created_at desc
    limit v_limit
  ) x
  left join public.profiles pa on pa.id=x.actor_id
  left join public.profiles pt on pt.id=x.target_user_id;
  return result;
end;
$function$;

revoke all on function public.list_audit_logs(uuid,integer,timestamptz) from public,anon;
grant execute on function public.list_audit_logs(uuid,integer,timestamptz) to authenticated,service_role;

create or replace function public.list_dashboard_activity(
  p_establishment_id uuid,p_since timestamptz default null,p_limit integer default 8
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare result jsonb; v_limit integer:=greatest(1,least(coalesce(p_limit,8),8));
begin
  if not private.has_permission(p_establishment_id,'dashboard.view') then
    raise exception 'Accès au tableau de bord refusé';
  end if;

  with events as (
    select a.id::text as id,a.action,a.entity_type,a.entity_id::text as entity_id,a.created_at,
      coalesce(nullif(trim(concat_ws(' ',pa.first_name,pa.last_name)),''),'Compte utilisateur') as actor_name
    from public.audit_logs a
    left join public.profiles pa on pa.id=a.actor_id
    where a.establishment_id=p_establishment_id
      and private.has_role(p_establishment_id,array['owner','admin','school_admin'])
      and (p_since is null or a.created_at>=p_since)

    union all

    select ('student-'||s.id::text),'Nouvel élève ajouté',
      concat_ws(' ',s.first_name,s.last_name),s.id::text,s.created_at,'Auteur non renseigné'
    from public.students s
    where s.establishment_id=p_establishment_id and private.has_permission(p_establishment_id,'students.read')
      and (p_since is null or s.created_at>=p_since)
      and not exists (select 1 from public.audit_logs a where a.establishment_id=p_establishment_id and a.entity_id::text=s.id::text)

    union all

    select ('enrollment-'||e.id::text),'Inscription enregistrée',
      'Dossier '||lower(coalesce(e.status,'inconnu')),e.id::text,e.created_at,'Auteur non renseigné'
    from public.enrollments e
    where e.establishment_id=p_establishment_id and private.has_permission(p_establishment_id,'inscriptions.read')
      and (p_since is null or e.created_at>=p_since)
      and not exists (select 1 from public.audit_logs a where a.establishment_id=p_establishment_id and a.entity_id::text=e.id::text)

    union all

    select ('payment-'||p.id::text),'Paiement enregistré',
      coalesce(p.amount::text,'0')||' FCFA',p.id::text,p.created_at,
      coalesce(nullif(trim(concat_ws(' ',pr.first_name,pr.last_name)),''),'Auteur non renseigné')
    from public.payments p
    left join public.profiles pr on pr.id=p.recorded_by
    where p.establishment_id=p_establishment_id and private.has_permission(p_establishment_id,'payments.view')
      and (p_since is null or p.created_at>=p_since)
      and not exists (select 1 from public.audit_logs a where a.establishment_id=p_establishment_id and a.entity_id::text=p.id::text)

    union all

    select ('expense-'||ex.id::text),'Dépense enregistrée',
      coalesce(nullif(ex.description,''),ex.amount::text||' FCFA'),ex.id::text,ex.created_at,
      coalesce(nullif(trim(concat_ws(' ',pr.first_name,pr.last_name)),''),'Auteur non renseigné')
    from public.expenses ex
    left join public.profiles pr on pr.id=ex.created_by
    where ex.establishment_id=p_establishment_id and private.has_permission(p_establishment_id,'payments.view')
      and (p_since is null or ex.created_at>=p_since)
      and not exists (select 1 from public.audit_logs a where a.establishment_id=p_establishment_id and a.entity_id::text=ex.id::text)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'action',x.action,'entity_type',x.entity_type,'entity_id',x.entity_id,
    'created_at',x.created_at,'actor_name',x.actor_name
  ) order by x.created_at desc),'[]'::jsonb)
  into result
  from (select * from events order by created_at desc limit v_limit) x;

  return result;
end;
$function$;

revoke all on function public.list_dashboard_activity(uuid,timestamptz,integer) from public,anon;
grant execute on function public.list_dashboard_activity(uuid,timestamptz,integer) to authenticated,service_role;
