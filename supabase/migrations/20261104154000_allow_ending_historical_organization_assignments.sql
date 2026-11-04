-- Une prise en charge historique doit pouvoir être arrêtée même si l'inscription n'est plus active.
do $$
declare v_definition text;
declare v_old text;
declare v_new text;
begin
  select pg_get_functiondef('public.manage_organization_student_assignment(uuid,uuid,uuid,text,uuid)'::regprocedure) into v_definition;
  v_old := $old$  select * into v_enrollment from public.enrollments
  where id=p_enrollment_id and establishment_id=p_establishment_id and status='active';
  if v_enrollment.id is null then raise exception 'Inscription active introuvable'; end if;$old$;
  v_new := $new$  select * into v_enrollment from public.enrollments
  where id=p_enrollment_id and establishment_id=p_establishment_id;
  if v_enrollment.id is null then raise exception 'Inscription introuvable'; end if;
  if p_action='assign' and v_enrollment.status<>'active' then
    raise exception 'Seules les inscriptions actives peuvent recevoir une prise en charge';
  end if;$new$;
  if position(v_old in v_definition)>0 then
    v_definition:=replace(v_definition,v_old,v_new);
    execute v_definition;
  end if;
end $$;
