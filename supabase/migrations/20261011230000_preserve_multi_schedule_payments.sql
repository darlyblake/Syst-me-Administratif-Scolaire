-- Preserve multi-échéance payments while isolating each payment to one payer/organization.
create or replace function public.create_payment_with_allocations(
  p_enrollment_id uuid,p_amount numeric,p_reference text default null,p_method text default null,p_notes text default null,p_allocations jsonb default '[]'::jsonb
) returns uuid language plpgsql set search_path to 'public','pg_temp' as $$
declare v_payment_id uuid; v_establishment_id uuid; v_allocated numeric:=0; v_schedule_id uuid; v_target uuid;
  v_amount numeric; v_payer text; v_category text; v_refundable boolean; v_org uuid; v_first uuid; v_remaining numeric; v_count integer; v_alloc_payer text; v_alloc_org uuid; r jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select establishment_id into v_establishment_id from public.enrollments where id=p_enrollment_id;
  if v_establishment_id is null then raise exception 'Inscription introuvable'; end if;
  if not private.has_role(v_establishment_id,array['owner','admin','director','accountant']) then raise exception 'Permission insuffisante'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Montant de paiement invalide'; end if;
  if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)=0 then raise exception 'Allocations invalides'; end if;
  select count(*) into v_count from jsonb_array_elements(p_allocations);
  select coalesce(sum((x->>'amount')::numeric),0) into v_allocated from jsonb_array_elements(p_allocations) x;
  if v_allocated<>p_amount then raise exception 'Le total des affectations doit egaler le paiement'; end if;
  select (p_allocations->0->>'payment_schedule_id')::uuid into v_target;
  select s.payer_type,s.category,coalesce(s.is_refundable,false),s.organization_id,greatest(coalesce(s.amount_due,0)-coalesce(s.amount_paid,0),0)
    into v_payer,v_category,v_refundable,v_org,v_remaining from public.payment_schedules s where s.id=v_target and s.enrollment_id=p_enrollment_id;
  if v_category is null then raise exception 'Echeance invalide'; end if;
  if v_remaining<=0 then raise exception 'Cette échéance est déjà soldée'; end if;
  if v_category in ('registration','tuition','scolarite') then
    select s.id into v_first from public.payment_schedules s where s.enrollment_id=p_enrollment_id and s.category in ('registration','tuition','scolarite')
      and s.payer_type=v_payer and coalesce(s.organization_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(v_org,'00000000-0000-0000-0000-000000000000'::uuid)
      and greatest(coalesce(s.amount_due,0)-coalesce(s.amount_paid,0),0)>0
      order by s.priority_rank nulls last,s.installment_number,s.due_date,s.id limit 1;
    if v_first is null then raise exception 'Aucune échéance restante pour ce payeur'; end if;
    if v_target is distinct from v_first then raise exception 'Vous devez d’abord solder l’échéance précédente de ce payeur'; end if;
  end if;
  if exists(select 1 from jsonb_array_elements(p_allocations) x group by (x->>'payment_schedule_id') having count(*)>1) then
    raise exception 'Une échéance ne peut apparaître qu’une fois dans un même paiement';
  end if;
  insert into public.payments(establishment_id,enrollment_id,amount,reference,method,notes,recorded_by,payer_type,category,is_refundable,organization_id)
  values(v_establishment_id,p_enrollment_id,p_amount,p_reference,p_method,p_notes,auth.uid(),coalesce(v_payer,'family'),coalesce(v_category,'tuition'),v_refundable,v_org) returning id into v_payment_id;
  for r in select * from jsonb_array_elements(p_allocations) loop
    v_schedule_id=(r->>'payment_schedule_id')::uuid; v_amount=(r->>'amount')::numeric;
    if v_amount is null or v_amount<=0 then raise exception 'Montant d affectation invalide'; end if;
    select s.payer_type,s.organization_id,greatest(coalesce(s.amount_due,0)-coalesce(s.amount_paid,0),0)
      into v_alloc_payer,v_alloc_org,v_remaining from public.payment_schedules s where s.id=v_schedule_id and s.enrollment_id=p_enrollment_id for update;
    if not found then raise exception 'Une échéance du paiement est introuvable pour cette inscription'; end if;
    if v_alloc_payer is distinct from v_payer or coalesce(v_alloc_org,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(v_org,'00000000-0000-0000-0000-000000000000'::uuid) then
      raise exception 'Un même paiement ne peut pas mélanger plusieurs payeurs ou organismes';
    end if;
    if v_remaining<=0 or v_amount>v_remaining then raise exception 'Le montant affecté dépasse le solde de l’échéance'; end if;
    insert into public.payment_allocations(payment_id,payment_schedule_id,amount) values(v_payment_id,v_schedule_id,v_amount);
  end loop;
  return v_payment_id;
end $$;
revoke all on function public.create_payment_with_allocations(uuid,numeric,text,text,text,jsonb) from anon, public;
grant execute on function public.create_payment_with_allocations(uuid,numeric,text,text,text,jsonb) to authenticated;
