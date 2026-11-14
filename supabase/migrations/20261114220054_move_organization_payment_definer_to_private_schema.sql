-- Keep the public RPC as an invoker wrapper. The privileged implementation
-- lives in the non-exposed private schema and performs its own permission checks.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz)'::regprocedure
  ) into v_definition;

  v_definition := replace(
    v_definition,
    'FUNCTION public.record_organization_annual_payment',
    'FUNCTION private.record_organization_annual_payment'
  );
  execute v_definition;
end $$;

revoke all on function private.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) from public, anon;
grant execute on function private.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) to authenticated;

create or replace function public.record_organization_annual_payment(
  p_establishment_id uuid,
  p_organization_id uuid,
  p_academic_year_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_payment_date timestamptz default now()
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.record_organization_annual_payment(
    p_establishment_id, p_organization_id, p_academic_year_id,
    p_amount, p_method, p_reference, p_notes, p_payment_date
  );
$function$;

revoke all on function public.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) from public, anon;
grant execute on function public.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) to authenticated;
