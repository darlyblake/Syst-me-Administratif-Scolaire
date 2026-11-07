create or replace function public.log_dashboard_business_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  if tg_table_name = 'students' then
    v_action := 'Nouvel élève ajouté';
    v_entity_type := 'Élève';
    v_metadata := jsonb_build_object('student_name', concat_ws(' ', to_jsonb(new)->>'first_name', to_jsonb(new)->>'last_name'), 'student_number', to_jsonb(new)->>'student_number');
  elsif tg_table_name = 'enrollments' then
    v_action := 'Inscription enregistrée';
    v_entity_type := 'Inscription';
    v_metadata := jsonb_build_object('status', to_jsonb(new)->>'status', 'student_id', to_jsonb(new)->>'student_id');
  elsif tg_table_name = 'payments' then
    v_action := 'Paiement enregistré';
    v_entity_type := 'Paiement';
    v_metadata := jsonb_build_object('amount', to_jsonb(new)->>'amount', 'enrollment_id', to_jsonb(new)->>'enrollment_id');
  elsif tg_table_name = 'expenses' then
    v_action := 'Dépense enregistrée';
    v_entity_type := 'Dépense';
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
$$;

drop trigger if exists trg_dashboard_activity_students on public.students;
create trigger trg_dashboard_activity_students after insert on public.students
for each row execute function public.log_dashboard_business_activity();

drop trigger if exists trg_dashboard_activity_enrollments on public.enrollments;
create trigger trg_dashboard_activity_enrollments after insert on public.enrollments
for each row execute function public.log_dashboard_business_activity();

drop trigger if exists trg_dashboard_activity_payments on public.payments;
create trigger trg_dashboard_activity_payments after insert on public.payments
for each row execute function public.log_dashboard_business_activity();

drop trigger if exists trg_dashboard_activity_expenses on public.expenses;
create trigger trg_dashboard_activity_expenses after insert on public.expenses
for each row execute function public.log_dashboard_business_activity();

revoke all on function public.log_dashboard_business_activity() from public, anon, authenticated;
