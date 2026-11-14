-- Les montants dus par une organisation ne constituent jamais un solde individuel de l'élève.
-- Les résumés d'inscription exposent uniquement la part réellement due par la famille.
create or replace function public.get_enrollment_financial_summary(p_enrollment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  e uuid;
  result jsonb;
  v_user uuid := auth.uid();
begin
  select establishment_id into e
  from public.enrollments
  where id = p_enrollment_id;

  if e is null then raise exception 'Inscription introuvable'; end if;

  if not private.has_permission(e, 'payments.read') and not exists (
    select 1
    from public.student_guardians sg
    join public.enrollments en on en.student_id = sg.student_id
    where en.id = p_enrollment_id
      and en.establishment_id = e
      and sg.guardian_user_id = v_user
      and sg.active = true
      and sg.can_view_finance = true
  ) then
    raise exception 'Accès refusé';
  end if;

  select jsonb_build_object(
    'total_due', coalesce(sum(ps.amount_due), 0),
    'total_paid', coalesce(sum(ps.amount_paid), 0),
    'remaining', coalesce(sum(greatest(ps.amount_due - ps.amount_paid, 0)), 0),
    'parent_due', coalesce(sum(greatest(ps.amount_due - ps.amount_paid, 0)), 0),
    'state_expected', 0,
    'state_paid', 0,
    'organization_expected', 0,
    'organization_paid', 0,
    'schedules', coalesce(jsonb_agg(jsonb_build_object(
      'id', ps.id,
      'number', ps.installment_number,
      'label', ps.label,
      'due_date', ps.due_date,
      'amount_due', ps.amount_due,
      'amount_paid', ps.amount_paid,
      'status', ps.status,
      'payer_type', ps.payer_type,
      'organization_id', null,
      'category', ps.category,
      'is_refundable', ps.is_refundable
    ) order by ps.installment_number), '[]'::jsonb)
  )
  into result
  from public.payment_schedules ps
  where ps.enrollment_id = p_enrollment_id
    and ps.payer_type = 'family';

  return result;
end;
$function$;

create or replace function public.student_payment_status(p_enrollment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  eid uuid;
  result jsonb;
  v_student_id uuid;
begin
  select e.establishment_id, e.student_id
  into eid, v_student_id
  from public.enrollments e
  where e.id = p_enrollment_id;

  if eid is null then raise exception 'Inscription introuvable'; end if;

  if not private.has_permission(eid, 'payments.view') and not exists (
    select 1
    from public.student_guardians sg
    where sg.student_id = v_student_id
      and sg.establishment_id = eid
      and sg.guardian_user_id = auth.uid()
      and sg.active = true
      and sg.can_view_finance = true
  ) then
    raise exception 'Accès refusé';
  end if;

  select jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'total_due', (
      select coalesce(sum(ps.amount_due), 0)
      from public.payment_schedules ps
      where ps.enrollment_id = p_enrollment_id and ps.payer_type = 'family'
    ),
    'total_paid', (
      select coalesce(sum(ps.amount_paid), 0)
      from public.payment_schedules ps
      where ps.enrollment_id = p_enrollment_id and ps.payer_type = 'family'
    ),
    'remaining', (
      select greatest(coalesce(sum(ps.amount_due), 0) - coalesce(sum(ps.amount_paid), 0), 0)
      from public.payment_schedules ps
      where ps.enrollment_id = p_enrollment_id and ps.payer_type = 'family'
    ),
    'next_due', (
      select min(ps.due_date)
      from public.payment_schedules ps
      where ps.enrollment_id = p_enrollment_id
        and ps.payer_type = 'family'
        and ps.status <> 'paid'
    ),
    'schedules', (
      select coalesce(jsonb_agg(to_jsonb(ps) order by ps.installment_number), '[]'::jsonb)
      from public.payment_schedules ps
      where ps.enrollment_id = p_enrollment_id and ps.payer_type = 'family'
    )
  )
  into result;

  return result;
end;
$function$;

drop policy if exists "Parents view linked payment schedules" on public.payment_schedules;
create policy "Parents view linked payment schedules"
on public.payment_schedules for select to authenticated
using (
  payer_type = 'family'
  and exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id and sg.establishment_id = en.establishment_id
    where en.id = payment_schedules.enrollment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
  )
);

drop policy if exists "Parents view linked payments in active establishments" on public.payments;
create policy "Parents view linked payments in active establishments"
on public.payments for select to authenticated
using (
  payer_type = 'family'
  and organization_payment_id is null
  and exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id and sg.establishment_id = en.establishment_id
    where en.id = payments.enrollment_id
      and payments.establishment_id = en.establishment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
  )
);

drop policy if exists "Parents view linked payment allocations" on public.payment_allocations;
create policy "Parents view linked payment allocations"
on public.payment_allocations for select to authenticated
using (
  exists (
    select 1
    from public.payments p
    join public.enrollments en on en.id = p.enrollment_id
    join public.student_guardians sg
      on sg.student_id = en.student_id and sg.establishment_id = en.establishment_id
    where p.id = payment_allocations.payment_id
      and p.payer_type = 'family'
      and p.organization_payment_id is null
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
  )
);
