-- Règle de facturation des élèves inscrits en cours d'année
-- + verrouillage de l'encaissement dans l'ordre des échéances.

alter table public.tuition_plans
  add column if not exists late_enrollment_billing_policy text not null default 'full_year';

alter table public.tuition_plans
  drop constraint if exists tuition_plans_late_enrollment_billing_policy_check;

alter table public.tuition_plans
  add constraint tuition_plans_late_enrollment_billing_policy_check
  check (late_enrollment_billing_policy in ('full_year','from_enrollment'));

create or replace function public.set_tuition_plan_late_enrollment_policy(
  p_tuition_plan_id uuid,
  p_policy text
)
returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_establishment_id uuid;
begin
  if p_policy not in ('full_year','from_enrollment') then
    raise exception 'Politique de facturation invalide';
  end if;

  select establishment_id into v_establishment_id
  from public.tuition_plans
  where id=p_tuition_plan_id;

  if v_establishment_id is null then
    raise exception 'Plan tarifaire introuvable';
  end if;

  if not private.has_permission(v_establishment_id,'tuition.manage') then
    raise exception 'Permission refusee';
  end if;

  update public.tuition_plans
  set late_enrollment_billing_policy=p_policy, updated_at=now()
  where id=p_tuition_plan_id;
end;
$function$;

grant execute on function public.set_tuition_plan_late_enrollment_policy(uuid,text) to authenticated;

create or replace function public.generate_payment_schedule()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  p record;
  i record;
  c integer;
  t numeric(12,2);
  v_priority integer;
  v_offset integer;
  v_month_start date;
begin
  select * into p from public.tuition_plans where id=new.tuition_plan_id;
  if p.id is null then raise exception 'Plan tarifaire introuvable'; end if;

  v_offset:=case when coalesce(p.registration_fee,0)>0 then 1 else 0 end;
  v_month_start:=date_trunc('month',coalesce(new.enrollment_date,current_date))::date;

  select count(*),coalesce(sum(amount),0)
  into c,t
  from public.tuition_plan_installments
  where tuition_plan_id=p.id;

  if c<>p.installment_count then
    raise exception 'Le plan tarifaire attend % echeances mais % sont configurees',p.installment_count,c;
  end if;
  if round(t,2)<>round(p.annual_tuition,2) then
    raise exception 'Le total des echeances doit egaler la scolarite annuelle';
  end if;

  for i in
    select * from public.tuition_plan_installments
    where tuition_plan_id=p.id
      and (
        coalesce(p.late_enrollment_billing_policy,'full_year')='full_year'
        or due_date >= v_month_start
      )
    order by installment_number
  loop
    if p.enrollment_payment_priority='last_due_first' then
      select count(*) into v_priority
      from public.tuition_plan_installments x
      where x.tuition_plan_id=p.id
        and x.due_date>i.due_date
        and (
          coalesce(p.late_enrollment_billing_policy,'full_year')='full_year'
          or x.due_date >= v_month_start
        );
      v_priority:=v_priority+1;
    else
      v_priority:=i.installment_number;
    end if;

    insert into public.payment_schedules(
      enrollment_id,installment_number,label,due_date,amount_due,
      category,payer_type,priority_rank
    )
    values(
      new.id,i.installment_number+v_offset,
      coalesce(i.label,'Echeance '||i.installment_number),
      i.due_date,i.amount,'tuition','family',v_priority
    );
  end loop;

  return new;
end;
$function$;

create or replace function public.create_payment_with_allocations(
  p_enrollment_id uuid,
  p_amount numeric,
  p_reference text default null,
  p_method text default null,
  p_notes text default null,
  p_allocations jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_payment_id uuid;
  v_establishment_id uuid;
  v_allocated numeric;
  r jsonb;
  v_schedule_id uuid;
  v_target_schedule_id uuid;
  v_amount numeric;
  v_payer_type text;
  v_category text;
  v_refundable boolean;
  v_first_unpaid_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select establishment_id into v_establishment_id from public.enrollments where id=p_enrollment_id;
  if v_establishment_id is null then raise exception 'Inscription introuvable'; end if;
  if not private.has_role(v_establishment_id,array['owner','admin','director','accountant']) then raise exception 'Permission insuffisante'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Montant de paiement invalide'; end if;
  if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)=0 then raise exception 'Allocations invalides'; end if;

  select coalesce(sum((x->>'amount')::numeric),0) into v_allocated
  from jsonb_array_elements(p_allocations) x;
  if v_allocated<>p_amount then raise exception 'Le total des affectations doit egaler le paiement'; end if;

  select (p_allocations->0->>'payment_schedule_id')::uuid into v_target_schedule_id;

  select min(s.payer_type), min(s.category), bool_and(coalesce(s.is_refundable,false)),
         count(distinct s.payer_type), count(distinct s.category)
    into v_payer_type, v_category, v_refundable, v_allocated, v_amount
  from public.payment_schedules s
  where s.id in (select (x->>'payment_schedule_id')::uuid from jsonb_array_elements(p_allocations) x)
    and s.enrollment_id=p_enrollment_id;

  if v_allocated::int = 0 then raise exception 'Echeance invalide'; end if;
  if v_allocated::int > 1 or v_amount::int > 1 then raise exception 'Un paiement ne peut pas melanger plusieurs responsables ou categories'; end if;

  select s.id into v_first_unpaid_id
  from public.payment_schedules s
  where s.enrollment_id=p_enrollment_id
    and s.category in ('registration','tuition')
    and greatest(coalesce(s.amount_due,0)-coalesce(s.amount_paid,0),0)>0
  order by s.priority_rank nulls last, s.due_date, s.installment_number
  limit 1;

  if v_category in ('registration','tuition')
     and v_target_schedule_id is distinct from v_first_unpaid_id then
    raise exception 'Vous devez d''abord solder l''echeance precedente';
  end if;

  for r in select * from jsonb_array_elements(p_allocations) loop
    v_schedule_id=(r->>'payment_schedule_id')::uuid;
    v_amount=(r->>'amount')::numeric;
    if v_amount<=0 then raise exception 'Montant d affectation invalide'; end if;
    if not exists(select 1 from public.payment_schedules s where s.id=v_schedule_id and s.enrollment_id=p_enrollment_id) then
      raise exception 'Echeance invalide';
    end if;
    if v_amount > (select greatest(amount_due-coalesce(amount_paid,0),0) from public.payment_schedules where id=v_schedule_id) then
      raise exception 'Le montant depasse le reste a payer';
    end if;
  end loop;

  insert into public.payments(
    establishment_id,enrollment_id,amount,reference,method,notes,recorded_by,
    payer_type,category,is_refundable
  )
  values(
    v_establishment_id,p_enrollment_id,p_amount,p_reference,p_method,p_notes,auth.uid(),
    coalesce(v_payer_type,'family'),coalesce(v_category,'tuition'),coalesce(v_refundable,false)
  )
  returning id into v_payment_id;

  for r in select * from jsonb_array_elements(p_allocations) loop
    v_schedule_id=(r->>'payment_schedule_id')::uuid;
    v_amount=(r->>'amount')::numeric;
    insert into public.payment_allocations(payment_id,payment_schedule_id,amount)
    values(v_payment_id,v_schedule_id,v_amount);
  end loop;

  return v_payment_id;
end;
$function$;
