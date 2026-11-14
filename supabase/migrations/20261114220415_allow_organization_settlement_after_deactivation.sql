-- Une organisation désactivée peut encore régler un solde historique déjà constitué.
do $$
declare v_definition text;
begin
  select pg_get_functiondef(
    'private.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz)'::regprocedure
  ) into v_definition;
  v_definition := replace(v_definition, 'and o.active = true', '');
  execute v_definition;
end $$;
