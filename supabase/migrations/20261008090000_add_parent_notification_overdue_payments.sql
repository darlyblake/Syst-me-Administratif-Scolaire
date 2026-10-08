-- Notifications parent : échéances en retard
-- Le système de notifications parent existe déjà pour les inscriptions,
-- paiements, présences, options et événements scolaires.
-- Cette migration ajoute la détection des échéances impayées/partiellement payées
-- et un contrôle quotidien pour les échéances qui deviennent en retard sans
-- qu'une écriture ne soit faite dans payment_schedules.

create or replace function private.notify_parent_on_payment_schedule()
returns trigger
language plpgsql
set search_path to public, private
as $$
declare
  v_student_id uuid;
  v_student_name text;
  v_status text;
  v_title text;
  v_body text;
begin
  v_status := lower(coalesce(new.status::text, ''));

  if v_status <> 'late'
     and not (
       new.due_date < current_date
       and coalesce(new.amount_paid, 0) < coalesce(new.amount_due, 0)
     ) then
    return new;
  end if;

  select e.student_id,
         trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
    into v_student_id, v_student_name
  from public.enrollments e
  join public.students s on s.id = e.student_id
  where e.id = new.enrollment_id
  limit 1;

  if v_student_id is null then
    return new;
  end if;

  v_title := 'Paiement en retard';
  v_body := format(
    '%s a une échéance en retard : %s. Montant restant : %s FCFA.',
    nullif(v_student_name, ''),
    coalesce(new.label, 'Échéance scolaire'),
    to_char(
      greatest(coalesce(new.amount_due, 0) - coalesce(new.amount_paid, 0), 0),
      'FM999G999G999'
    )
  );

  insert into public.notifications(
    establishment_id,
    recipient_user_id,
    type,
    title,
    body,
    entity_type,
    entity_id
  )
  select distinct
    e.establishment_id,
    sg.guardian_user_id,
    'payment_overdue',
    v_title,
    v_body,
    'payment_schedule',
    new.id
  from public.enrollments e
  join public.student_guardians sg
    on sg.student_id = e.student_id
   and sg.establishment_id = e.establishment_id
   and sg.active = true
  where e.id = new.enrollment_id
    and not exists (
      select 1
      from public.notifications n
      where n.recipient_user_id = sg.guardian_user_id
        and n.entity_type = 'payment_schedule'
        and n.entity_id = new.id
        and n.type = 'payment_overdue'
    );

  return new;
end;
$$;

drop trigger if exists trg_parent_notification_payment_schedule
  on public.payment_schedules;

create trigger trg_parent_notification_payment_schedule
after insert or update of status, amount_paid, due_date
on public.payment_schedules
for each row
execute function private.notify_parent_on_payment_schedule();

create or replace function private.notify_parents_for_overdue_schedules()
returns integer
language plpgsql
set search_path to public, private
as $$
declare
  v_count integer := 0;
begin
  insert into public.notifications(
    establishment_id,
    recipient_user_id,
    type,
    title,
    body,
    entity_type,
    entity_id
  )
  select distinct
    e.establishment_id,
    sg.guardian_user_id,
    'payment_overdue',
    'Paiement en retard',
    format(
      '%s a une échéance en retard : %s. Montant restant : %s FCFA.',
      trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')),
      coalesce(ps.label, 'Échéance scolaire'),
      to_char(
        greatest(coalesce(ps.amount_due, 0) - coalesce(ps.amount_paid, 0), 0),
        'FM999G999G999'
      )
    ),
    'payment_schedule',
    ps.id
  from public.payment_schedules ps
  join public.enrollments e on e.id = ps.enrollment_id
  join public.students s on s.id = e.student_id
  join public.student_guardians sg
    on sg.student_id = e.student_id
   and sg.establishment_id = e.establishment_id
   and sg.active = true
  where ps.due_date < current_date
    and coalesce(ps.amount_paid, 0) < coalesce(ps.amount_due, 0)
    and lower(ps.status::text) <> 'paid'
    and not exists (
      select 1
      from public.notifications n
      where n.recipient_user_id = sg.guardian_user_id
        and n.entity_type = 'payment_schedule'
        and n.entity_id = ps.id
        and n.type = 'payment_overdue'
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'parent-overdue-payment-notifications';

select cron.schedule(
  'parent-overdue-payment-notifications',
  '15 6 * * *',
  $$select private.notify_parents_for_overdue_schedules();$$
);

select private.notify_parents_for_overdue_schedules();
