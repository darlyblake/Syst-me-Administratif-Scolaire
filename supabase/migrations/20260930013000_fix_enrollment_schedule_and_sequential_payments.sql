-- Corrige la generation des echeances d'inscription et le paiement sequentiel.
-- Les echeances sont generees depuis tuition_plan_installments.
-- Un paiement ne peut cibler que la premiere echeance encore impayee.

create or replace function public.create_enrollment_with_schedule(
  p_establishment_id uuid,
  p_student_id uuid,
  p_academic_year_id uuid,
  p_class_id uuid,
  p_tuition_plan_id uuid,
  p_enrollment_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_enrollment_id uuid;
  v_registration numeric;
  v_expected integer;
  v_created integer;
  r record;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if not private.has_permission(p_establishment_id, 'enrollments.manage') then
    raise exception 'Permission refusee';
  end if;

  if not exists (
    select 1
    from public.academic_years ay
    where ay.id = p_academic_year_id
      and ay.establishment_id = p_establishment_id
      and ay.is_active = true
  ) then
    raise exception 'Annee academique invalide ou inactive';
  end if;

  if not exists (
    select 1 from public.students s
    where s.id = p_student_id and s.establishment_id = p_establishment_id
  ) then
    raise exception 'Eleve introuvable';
  end if;

  if not exists (
    select 1 from public.school_classes c
    where c.id = p_class_id and c.establishment_id = p_establishment_id
  ) then
    raise exception 'Classe invalide';
  end if;

  if not exists (
    select 1
    from public.tuition_plans tp
    where tp.id = p_tuition_plan_id
      and tp.establishment_id = p_establishment_id
      and tp.academic_year_id = p_academic_year_id
      and tp.active = true
  ) then
    raise exception 'Plan tarifaire invalide ou inactif';
  end if;

  if exists (
    select 1
    from public.enrollments e
    where e.student_id = p_student_id
      and e.academic_year_id = p_academic_year_id
      and coalesce(e.status::text, '') not in ('cancelled','rejected')
  ) then
    raise exception 'Une inscription existe deja pour cet eleve et cette annee';
  end if;

  insert into public.enrollments(
    establishment_id,
    student_id,
    academic_year_id,
    class_id,
    tuition_plan_id,
    enrollment_date
  )
  values (
    p_establishment_id,
    p_student_id,
    p_academic_year_id,
    p_class_id,
    p_tuition_plan_id,
    coalesce(p_enrollment_date, current_date)
  )
  returning id into v_enrollment_id;

  select coalesce(tp.registration_fee, 0)
    into v_registration
  from public.tuition_plans tp
  where tp.id = p_tuition_plan_id;

  if v_registration > 0 then
    insert into public.payment_schedules(
      enrollment_id,
      installment_number,
      label,
      due_date,
      amount_due,
      category,
      payer_type,
      priority_rank
    )
    values (
      v_enrollment_id,
      1,
      'Frais d''inscription',
      coalesce(p_enrollment_date, current_date),
      v_registration,
      'registration',
      'family',
      0
    );
  end if;

  select count(*)
    into v_expected
  from public.tuition_plan_installments tpi
  where tpi.tuition_plan_id = p_tuition_plan_id
    and tpi.amount > 0;

  v_created := 0;

  for r in
    select tpi.*
    from public.tuition_plan_installments tpi
    where tpi.tuition_plan_id = p_tuition_plan_id
      and tpi.amount > 0
    order by tpi.installment_number, tpi.due_date, tpi.id
  loop
    insert into public.payment_schedules(
      enrollment_id,
      installment_number,
      label,
      due_date,
      amount_due,
      category,
      payer_type,
      priority_rank
    )
    values (
      v_enrollment_id,
      r.installment_number + case when v_registration > 0 then 1 else 0 end,
      coalesce(
        nullif(trim(r.label), ''),
        to_char(r.due_date, 'TMMonth YYYY')
      ),
      r.due_date,
      r.amount,
      'tuition',
      'family',
      r.installment_number + case when v_registration > 0 then 1 else 0 end
    );

    v_created := v_created + 1;
  end loop;

  if v_created <> v_expected then
    raise exception 'Generation des echeances incomplete: % sur %', v_created, v_expected;
  end if;

  return v_enrollment_id;
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
as $function$
declare
  v_payment_id uuid;
  v_establishment_id uuid;
  v_allocated numeric;
  v_schedule_id uuid;
  v_target_schedule_id uuid;
  v_target_amount_due numeric;
  v_target_amount_paid numeric;
  v_target_category text;
  v_first_unpaid_id uuid;
  r jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select e.establishment_id
    into v_establishment_id
  from public.enrollments e
  where e.id = p_enrollment_id;

  if v_establishment_id is null then
    raise exception 'Inscription introuvable';
  end if;

  if not private.has_role(
    v_establishment_id,
    array['owner','admin','director','accountant']
  ) then
    raise exception 'Permission insuffisante';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant de paiement invalide';
  end if;

  if jsonb_typeof(p_allocations) <> 'array'
     or jsonb_array_length(p_allocations) = 0 then
    raise exception 'Allocations invalides';
  end if;

  select coalesce(sum((x->>'amount')::numeric), 0)
    into v_allocated
  from jsonb_array_elements(p_allocations) x;

  if v_allocated <> p_amount then
    raise exception 'Le total des affectations doit egaler le paiement';
  end if;

  if jsonb_array_length(p_allocations) <> 1 then
    raise exception 'Un paiement doit cibler une seule echeance';
  end if;

  v_target_schedule_id := (p_allocations->0->>'payment_schedule_id')::uuid;

  select
    s.amount_due,
    s.amount_paid,
    s.category
    into
    v_target_amount_due,
    v_target_amount_paid,
    v_target_category
  from public.payment_schedules s
  where s.id = v_target_schedule_id
    and s.enrollment_id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Echeance invalide';
  end if;

  if coalesce(v_target_amount_due, 0) <= coalesce(v_target_amount_paid, 0) then
    raise exception 'Cette echeance est deja payee';
  end if;

  select s.id
    into v_first_unpaid_id
  from public.payment_schedules s
  where s.enrollment_id = p_enrollment_id
    and s.category in ('registration', 'tuition', 'scolarite')
    and greatest(
      coalesce(s.amount_due, 0) - coalesce(s.amount_paid, 0),
      0
    ) > 0
  order by
    s.priority_rank nulls last,
    s.installment_number,
    s.due_date,
    s.id
  limit 1;

  if v_target_category in ('registration', 'tuition', 'scolarite')
     and v_target_schedule_id is distinct from v_first_unpaid_id then
    raise exception 'Vous devez d''abord solder l''echeance precedente';
  end if;

  for r in select * from jsonb_array_elements(p_allocations)
  loop
    v_schedule_id := (r->>'payment_schedule_id')::uuid;

    if (r->>'amount')::numeric <= 0 then
      raise exception 'Montant d affectation invalide';
    end if;

    if v_schedule_id <> v_target_schedule_id then
      raise exception 'Echeance invalide';
    end if;

    if (r->>'amount')::numeric >
       greatest(v_target_amount_due - coalesce(v_target_amount_paid, 0), 0) then
      raise exception 'Le montant depasse le reste a payer';
    end if;
  end loop;

  insert into public.payments(
    establishment_id,
    enrollment_id,
    amount,
    reference,
    method,
    notes,
    recorded_by,
    payer_type,
    category,
    is_refundable
  )
  values(
    v_establishment_id,
    p_enrollment_id,
    p_amount,
    p_reference,
    p_method,
    p_notes,
    auth.uid(),
    'family',
    v_target_category,
    false
  )
  returning id into v_payment_id;

  insert into public.payment_allocations(
    payment_id,
    payment_schedule_id,
    amount
  )
  values(
    v_payment_id,
    v_target_schedule_id,
    p_amount
  );

  return v_payment_id;
end;
$function$;

-- Le plan tarifaire determine deja les dates et libelles.
-- Aucun decalage automatique de mois ne doit etre applique.
create or replace function public.normalize_monthly_tuition_schedule()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  return new;
end;
$function$;
