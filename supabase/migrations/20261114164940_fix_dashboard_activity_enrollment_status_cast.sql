CREATE OR REPLACE FUNCTION public.list_dashboard_activity(p_establishment_id uuid, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      'Dossier '||lower(coalesce(e.status::text,'en cours')),e.id::text,e.created_at,'Auteur non renseigné'
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