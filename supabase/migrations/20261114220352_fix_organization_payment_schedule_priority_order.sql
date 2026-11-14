-- Respecte exactement l'ordre de paiement vérifié par validate_sequential_payment_allocation().
-- Les échéances cœur sont affectées avant les options, puis suivent priority_rank,
-- installment_number, due_date et id comme dans le garde-fou SQL.
create or replace function private.record_organization_annual_payment(
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
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_payment_id uuid;
  v_child_payment_id uuid;
  v_enrollment record;
  v_schedule record;
  v_alloc record;
  v_allocations jsonb;
  v_group_amount numeric(12,2);
  v_remaining_to_allocate numeric(12,2);
  v_total_due numeric(12,2);
  v_total_paid numeric(12,2);
  v_total_remaining numeric(12,2);
  v_first_category text;
  v_first_refundable boolean;
  v_take numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id, 'payments.manage') then
    raise exception 'Vous n''êtes pas autorisé à enregistrer un paiement d''organisation';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant du versement doit être supérieur à zéro'; end if;
  if not exists (
    select 1 from public.sponsoring_organizations o
    where o.id = p_organization_id and o.establishment_id = p_establishment_id
      and o.active = true and o.is_state = false
  ) then raise exception 'Organisation introuvable ou inactive'; end if;
  if not exists (
    select 1 from public.academic_years ay
    where ay.id = p_academic_year_id and ay.establishment_id = p_establishment_id
  ) then raise exception 'Année scolaire invalide pour cet établissement'; end if;

  perform ps.id
  from public.payment_schedules ps
  join public.enrollments e on e.id = ps.enrollment_id
  join public.organization_student_assignments osa
    on osa.enrollment_id = e.id and osa.organization_id = p_organization_id
   and osa.establishment_id = p_establishment_id and osa.academic_year_id = p_academic_year_id
   and osa.status = 'active'
  where e.establishment_id = p_establishment_id and e.academic_year_id = p_academic_year_id
    and ps.organization_id = p_organization_id and ps.payer_type = 'other'
    and ps.amount_due > ps.amount_paid
  for update of ps;

  select coalesce(sum(ps.amount_due), 0), coalesce(sum(ps.amount_paid), 0)
  into v_total_due, v_total_paid
  from public.payment_schedules ps
  join public.enrollments e on e.id = ps.enrollment_id
  join public.organization_student_assignments osa
    on osa.enrollment_id = e.id and osa.organization_id = p_organization_id
   and osa.establishment_id = p_establishment_id and osa.academic_year_id = p_academic_year_id
   and osa.status = 'active'
  where e.establishment_id = p_establishment_id and e.academic_year_id = p_academic_year_id
    and ps.organization_id = p_organization_id and ps.payer_type = 'other';

  v_total_remaining := greatest(v_total_due - v_total_paid, 0);
  if v_total_remaining <= 0 then raise exception 'Cette organisation ne présente aucun reste à payer pour cette année scolaire'; end if;
  if p_amount > v_total_remaining then
    raise exception 'Le versement dépasse le reste global de % FCFA', to_char(v_total_remaining, 'FM999G999G999');
  end if;

  insert into public.organization_payments (
    establishment_id, organization_id, academic_year_id, amount,
    payment_date, method, reference, notes, recorded_by
  ) values (
    p_establishment_id, p_organization_id, p_academic_year_id, p_amount,
    coalesce(p_payment_date, now()), nullif(trim(p_method), ''),
    nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), auth.uid()
  ) returning id into v_payment_id;

  v_remaining_to_allocate := p_amount;
  for v_enrollment in
    select distinct e.id
    from public.enrollments e
    join public.organization_student_assignments osa
      on osa.enrollment_id = e.id and osa.organization_id = p_organization_id
     and osa.establishment_id = p_establishment_id and osa.academic_year_id = p_academic_year_id
     and osa.status = 'active'
    join public.payment_schedules ps on ps.enrollment_id = e.id
      and ps.organization_id = p_organization_id and ps.payer_type = 'other'
      and ps.amount_due > ps.amount_paid
    where e.establishment_id = p_establishment_id and e.academic_year_id = p_academic_year_id
    order by e.id
  loop
    exit when v_remaining_to_allocate <= 0;
    v_allocations := '[]'::jsonb;
    v_group_amount := 0;
    v_first_category := null;
    v_first_refundable := false;

    for v_schedule in
      select ps.id, ps.category, ps.is_refundable,
        greatest(ps.amount_due - ps.amount_paid, 0)::numeric(12,2) as remaining
      from public.payment_schedules ps
      join public.organization_student_assignments osa
        on osa.enrollment_id = ps.enrollment_id and osa.organization_id = p_organization_id
       and osa.establishment_id = p_establishment_id and osa.academic_year_id = p_academic_year_id
       and osa.status = 'active'
      where ps.enrollment_id = v_enrollment.id and ps.organization_id = p_organization_id
        and ps.payer_type = 'other' and ps.amount_due > ps.amount_paid
      order by
        case when ps.category in ('registration', 'tuition', 'scolarite') then 0 else 1 end,
        ps.priority_rank nulls last, ps.installment_number, ps.due_date, ps.id
      for update of ps
    loop
      exit when v_remaining_to_allocate <= 0;
      if v_first_category is null then
        v_first_category := coalesce(v_schedule.category, 'tuition');
        v_first_refundable := coalesce(v_schedule.is_refundable, false);
      end if;
      v_take := least(v_remaining_to_allocate, v_schedule.remaining);
      if v_take > 0 then
        v_allocations := v_allocations || jsonb_build_array(
          jsonb_build_object('payment_schedule_id', v_schedule.id, 'amount', v_take)
        );
        v_group_amount := v_group_amount + v_take;
        v_remaining_to_allocate := v_remaining_to_allocate - v_take;
      end if;
    end loop;

    if v_group_amount > 0 then
      insert into public.payments (
        establishment_id, enrollment_id, amount, payment_date,
        reference, method, notes, recorded_by, payer_type, category,
        is_refundable, organization_id, organization_payment_id
      ) values (
        p_establishment_id, v_enrollment.id, v_group_amount, coalesce(p_payment_date, now()),
        nullif(trim(p_reference), ''), nullif(trim(p_method), ''),
        concat_ws(' · ', 'Versement global organisation', nullif(trim(p_notes), '')),
        auth.uid(), 'other', v_first_category, v_first_refundable,
        p_organization_id, v_payment_id
      ) returning id into v_child_payment_id;

      for v_alloc in
        select (item->>'payment_schedule_id')::uuid as schedule_id,
               (item->>'amount')::numeric(12,2) as amount
        from jsonb_array_elements(v_allocations) item
      loop
        insert into public.payment_allocations(payment_id, payment_schedule_id, amount)
        values (v_child_payment_id, v_alloc.schedule_id, v_alloc.amount);
      end loop;
    end if;
  end loop;

  if v_remaining_to_allocate > 0 then raise exception 'Le versement n''a pas pu être entièrement affecté. Opération annulée'; end if;
  return v_payment_id;
end;
$function$;

revoke all on function private.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) from public, anon;
grant execute on function private.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) to authenticated;
