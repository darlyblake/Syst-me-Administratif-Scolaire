-- Un organisme désactivé ne peut plus recevoir de nouveaux élèves,
-- mais ses anciennes prises en charge doivent pouvoir être arrêtées proprement.
do $$
declare v_definition text;
declare v_old text;
declare v_new text;
begin
  select pg_get_functiondef('public.manage_organization_student_assignment(uuid,uuid,uuid,text,uuid)'::regprocedure) into v_definition;
  v_old := $old$  select * into v_org from public.sponsoring_organizations
  where id=p_organization_id and establishment_id=p_establishment_id and active;
  if v_org.id is null then raise exception 'Organisme invalide ou inactif'; end if;$old$;
  v_new := $new$  select * into v_org from public.sponsoring_organizations
  where id=p_organization_id and establishment_id=p_establishment_id;
  if v_org.id is null then raise exception 'Organisme invalide'; end if;
  if p_action='assign' and not v_org.active then raise exception 'Organisme inactif : impossible d’ajouter ou renouveler un élève'; end if;$new$;
  if position(v_old in v_definition)>0 then
    v_definition:=replace(v_definition,v_old,v_new);
    execute v_definition;
  end if;
end $$;
