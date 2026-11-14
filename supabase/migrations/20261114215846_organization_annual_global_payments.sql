-- Registre annuel des versements globaux des organisations.
alter table public.payments
  add column if not exists organization_payment_id uuid;

create table if not exists public.organization_payments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  organization_id uuid not null references public.sponsoring_organizations(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  method text,
  reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_payments_organization_payment_unique unique (id, organization_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_organization_payment_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_organization_payment_id_fkey
      foreign key (organization_payment_id)
      references public.organization_payments(id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_organization_payments_org_year_date
  on public.organization_payments (organization_id, academic_year_id, payment_date desc);
create index if not exists idx_payments_organization_payment_id
  on public.payments (organization_payment_id)
  where organization_payment_id is not null;

alter table public.organization_payments enable row level security;
drop policy if exists organization_payments_finance_read on public.organization_payments;
create policy organization_payments_finance_read
  on public.organization_payments for select to authenticated
  using (private.has_permission(establishment_id, 'payments.view'));

grant select on public.organization_payments to authenticated;
grant all on public.organization_payments to service_role;

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
        case when ps.category = 'registration' then 0
             when ps.category in ('tuition', 'scolarite') then 1 else 2 end,
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

  if v_remaining_to_allocate > 0 then
    raise exception 'Le versement n''a pas pu être entièrement affecté. Opération annulée';
  end if;
  return v_payment_id;
end;
$function$;

revoke all on function public.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) from public, anon;
grant execute on function public.record_organization_annual_payment(uuid,uuid,uuid,numeric,text,text,text,timestamptz) to authenticated;

create or replace function public.trg_payment_to_financial_movement()
returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.organization_payment_id is not null then return new; end if;
  perform public.record_financial_movement(
    new.establishment_id, 'in', new.amount, new.payment_date,
    coalesce(nullif(new.notes,''), 'Paiement élève - ' || coalesce(new.category,'scolarité')),
    new.reference, 'student_payment', new.id, new.recorded_by
  );
  return new;
end;
$function$;

create or replace function public.trg_organization_payment_to_financial_movement()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  perform public.record_financial_movement(
    new.establishment_id, 'in', new.amount, new.payment_date,
    coalesce(nullif(new.notes, ''), 'Versement global organisation'),
    new.reference, 'organization_payment', new.id, new.recorded_by
  );
  return new;
end;
$function$;

drop trigger if exists trg_organization_payment_financial_movement on public.organization_payments;
create trigger trg_organization_payment_financial_movement
after insert on public.organization_payments
for each row execute function public.trg_organization_payment_to_financial_movement();

create or replace function private.notify_parent_on_payment()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_student_id uuid; v_student_name text;
begin
  if new.organization_payment_id is not null then return new; end if;
  select e.student_id, trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
  into v_student_id, v_student_name
  from public.enrollments e join public.students s on s.id = e.student_id
  where e.id = new.enrollment_id and e.establishment_id = new.establishment_id
  limit 1;
  if v_student_id is not null then
    insert into public.notifications (
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    select distinct new.establishment_id, sg.guardian_user_id, 'payment_received',
      'Paiement enregistré',
      format('Un paiement de %s FCFA a été enregistré pour %s.',
        to_char(new.amount, 'FM999G999G999'), nullif(v_student_name, '')),
      'payment', new.id
    from public.student_guardians sg
    where sg.student_id = v_student_id and sg.establishment_id = new.establishment_id
      and sg.active = true and sg.can_view_finance = true and sg.guardian_user_id is not null;
  end if;
  return new;
end;
$function$;

create or replace function public.log_dashboard_business_activity()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_establishment_id uuid;
  v_entity_id uuid;
  v_actor_id uuid;
  v_action text;
  v_entity_type text;
  v_metadata jsonb := '{}'::jsonb;
begin
  v_establishment_id := (to_jsonb(new)->>'establishment_id')::uuid;
  v_entity_id := (to_jsonb(new)->>'id')::uuid;
  v_actor_id := auth.uid();
  if tg_table_name = 'payments' and nullif(to_jsonb(new)->>'organization_payment_id', '') is not null then
    return new;
  elsif tg_table_name = 'students' then
    v_action := 'Nouvel élève ajouté'; v_entity_type := 'Élève';
    v_metadata := jsonb_build_object('student_name', concat_ws(' ', to_jsonb(new)->>'first_name', to_jsonb(new)->>'last_name'), 'student_number', to_jsonb(new)->>'student_number');
  elsif tg_table_name = 'enrollments' then
    v_action := 'Inscription enregistrée'; v_entity_type := 'Inscription';
    v_metadata := jsonb_build_object('status', to_jsonb(new)->>'status', 'student_id', to_jsonb(new)->>'student_id');
  elsif tg_table_name = 'payments' then
    v_action := 'Paiement enregistré'; v_entity_type := 'Paiement';
    v_metadata := jsonb_build_object('amount', to_jsonb(new)->>'amount', 'enrollment_id', to_jsonb(new)->>'enrollment_id');
  elsif tg_table_name = 'expenses' then
    v_action := 'Dépense enregistrée'; v_entity_type := 'Dépense';
    v_metadata := jsonb_build_object('description', to_jsonb(new)->>'description', 'amount', to_jsonb(new)->>'amount');
  else
    return new;
  end if;
  if v_establishment_id is not null and v_entity_id is not null then
    insert into public.audit_logs (establishment_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_establishment_id, v_actor_id, v_action, v_entity_type, v_entity_id, v_metadata);
  end if;
  return new;
end;
$function$;

create or replace function public.log_organization_payment_activity()
returns trigger language plpgsql security definer set search_path = 'public'
as $function$
begin
  insert into public.audit_logs (
    establishment_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    new.establishment_id, new.recorded_by,
    'Versement global d''organisation enregistré', 'Paiement organisation', new.id,
    jsonb_build_object('organization_id', new.organization_id,
      'academic_year_id', new.academic_year_id, 'amount', new.amount, 'reference', new.reference)
  );
  return new;
end;
$function$;

drop trigger if exists trg_organization_payment_activity on public.organization_payments;
create trigger trg_organization_payment_activity
after insert on public.organization_payments
for each row execute function public.log_organization_payment_activity();
