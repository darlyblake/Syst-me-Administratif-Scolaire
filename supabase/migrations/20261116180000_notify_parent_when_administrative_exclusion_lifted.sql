-- Informer les responsables légaux lorsqu'une exclusion administrative est levée.
CREATE OR REPLACE FUNCTION private.can_view_notification(
 p_establishment_id uuid,p_type text,p_entity_type text,p_entity_id uuid,p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
declare v_account_type public.account_type;
begin
 if p_user_id is null or p_establishment_id is null or p_type is null then return false; end if;
 if p_type in ('course_exclusion_reported','course_exclusion_approved') and p_entity_type='course_exclusion' then
  select account_type into v_account_type from public.profiles where id=p_user_id;
  if v_account_type='parent' then
   return p_type='course_exclusion_approved' and exists(select 1 from public.course_exclusions ce
    join public.student_guardians sg on sg.student_id=ce.student_id and sg.establishment_id=ce.establishment_id
    where ce.id=p_entity_id and ce.establishment_id=p_establishment_id and ce.status='approved'
     and sg.guardian_user_id=p_user_id and sg.active=true and sg.can_view_academic=true);
  end if;
  return private.has_permission(p_establishment_id,'attendance.manage',p_user_id)
   and exists(select 1 from public.course_exclusions ce where ce.id=p_entity_id and ce.establishment_id=p_establishment_id);
 end if;
 if p_type in ('administrative_exclusion_published','administrative_exclusion_lifted') and p_entity_type='administrative_exclusion' then
  select account_type into v_account_type from public.profiles where id=p_user_id;
  if v_account_type='parent' then
   return exists(select 1 from public.administrative_exclusions ae join public.student_guardians sg
    on sg.student_id=ae.student_id and sg.establishment_id=ae.establishment_id
    where ae.id=p_entity_id and ae.establishment_id=p_establishment_id
     and sg.guardian_user_id=p_user_id and sg.active=true and sg.can_view_academic=true);
  end if;
  return private.has_permission(p_establishment_id,'attendance.manage',p_user_id)
   and exists(select 1 from public.administrative_exclusions ae where ae.id=p_entity_id and ae.establishment_id=p_establishment_id);
 end if;
 return private.can_view_notification_base(p_establishment_id,p_type,p_entity_type,p_entity_id,p_user_id);
end; $function$;

CREATE OR REPLACE FUNCTION public.admin_lift_administrative_exclusion(p_exclusion_id uuid,p_lift_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $function$
declare v_row public.administrative_exclusions%rowtype; v_student_name text;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 select * into v_row from public.administrative_exclusions where id=p_exclusion_id for update;
 if not found then raise exception 'Décision introuvable'; end if;
 if not private.has_role(v_row.establishment_id,array['owner','admin','director','supervisor']::text[]) then
  raise exception 'Action réservée à l’administration'; end if;
 if v_row.status<>'active' then raise exception 'Cette décision n’est plus active'; end if;
 update public.administrative_exclusions set status='lifted',lifted_by=auth.uid(),lifted_at=now(),
  lift_reason=nullif(trim(p_lift_reason),'') where id=p_exclusion_id;
 select concat_ws(' ',first_name,last_name) into v_student_name from public.students where id=v_row.student_id;
 insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
 select v_row.establishment_id,sg.guardian_user_id,'administrative_exclusion_lifted','Levée de l’exclusion administrative',
  'La décision d’exclusion administrative concernant '||coalesce(v_student_name,'votre enfant')||' a été levée par l’administration.',
  'administrative_exclusion',v_row.id
 from public.student_guardians sg where sg.student_id=v_row.student_id and sg.establishment_id=v_row.establishment_id
  and sg.active=true and sg.can_view_academic=true;
 return true;
end; $function$;
REVOKE ALL ON FUNCTION public.admin_lift_administrative_exclusion(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_lift_administrative_exclusion(uuid,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
