create or replace function public.create_payment_with_allocations(p_enrollment_id uuid, p_amount numeric, p_reference text default null, p_method text default null, p_notes text default null, p_allocations jsonb default '[]'::jsonb)
returns uuid
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare
  v_payment_id uuid; v_establishment_id uuid; v_allocated numeric; r jsonb; v_schedule_id uuid; v_amount numeric;
  v_payer_type text; v_category text; v_refundable boolean;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select establishment_id into v_establishment_id from public.enrollments where id=p_enrollment_id;
  if v_establishment_id is null then raise exception 'Inscription introuvable'; end if;
  if not private.has_role(v_establishment_id,array['owner','admin','director','accountant']) then raise exception 'Permission insuffisante'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Montant de paiement invalide'; end if;
  if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)=0 then raise exception 'Allocations invalides'; end if;
  select coalesce(sum((x->>'amount')::numeric),0) into v_allocated from jsonb_array_elements(p_allocations) x;
  if v_allocated<>p_amount then raise exception 'Le total des affectations doit egaler le paiement'; end if;

  select min(s.payer_type), min(s.category), bool_and(coalesce(s.is_refundable,false)), count(distinct s.payer_type), count(distinct s.category)
    into v_payer_type, v_category, v_refundable, v_allocated, v_amount
  from public.payment_schedules s
  where s.id in (select (x->>'payment_schedule_id')::uuid from jsonb_array_elements(p_allocations) x)
    and s.enrollment_id=p_enrollment_id;
  if v_allocated::int = 0 then raise exception 'Echeance invalide'; end if;
  if v_allocated::int > 1 or v_amount::int > 1 then raise exception 'Un paiement ne peut pas melanger plusieurs responsables ou categories'; end if;

  insert into public.payments(establishment_id,enrollment_id,amount,reference,method,notes,recorded_by,payer_type,category,is_refundable)
  values(v_establishment_id,p_enrollment_id,p_amount,p_reference,p_method,p_notes,auth.uid(),coalesce(v_payer_type,'family'),coalesce(v_category,'tuition'),coalesce(v_refundable,false))
  returning id into v_payment_id;

  for r in select * from jsonb_array_elements(p_allocations) loop
    v_schedule_id=(r->>'payment_schedule_id')::uuid; v_amount=(r->>'amount')::numeric;
    if v_amount<=0 then raise exception 'Montant d affectation invalide'; end if;
    if not exists(select 1 from public.payment_schedules s where s.id=v_schedule_id and s.enrollment_id=p_enrollment_id) then raise exception 'Echeance invalide'; end if;
    insert into public.payment_allocations(payment_id,payment_schedule_id,amount) values(v_payment_id,v_schedule_id,v_amount);
  end loop;
  return v_payment_id;
end;
$$;
revoke all on function public.create_payment_with_allocations(uuid,numeric,text,text,text,jsonb) from public;
grant execute on function public.create_payment_with_allocations(uuid,numeric,text,text,text,jsonb) to authenticated;
