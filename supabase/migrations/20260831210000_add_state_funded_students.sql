-- State-funded student financing model
create table if not exists public.establishment_finance_settings (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null unique references public.establishments(id) on delete cascade,
  state_students_enabled boolean not null default false,
  state_covers_registration boolean not null default true,
  state_covers_tuition boolean not null default true,
  state_allows_family_options boolean not null default true,
  state_allows_caution boolean not null default false,
  state_caution_default_amount numeric(12,2) not null default 0 check (state_caution_default_amount >= 0),
  state_caution_refundable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enrollments
  add column if not exists funding_source text not null default 'family',
  add column if not exists state_expected_amount numeric(12,2) not null default 0,
  add column if not exists parent_payable_amount numeric(12,2) not null default 0;

alter table public.enrollments drop constraint if exists enrollments_funding_source_check;
alter table public.enrollments add constraint enrollments_funding_source_check check (funding_source in ('family','state','other'));

alter table public.payment_schedules
  add column if not exists payer_type text not null default 'family',
  add column if not exists category text not null default 'tuition',
  add column if not exists is_refundable boolean not null default false;

alter table public.payment_schedules drop constraint if exists payment_schedules_payer_type_check;
alter table public.payment_schedules add constraint payment_schedules_payer_type_check check (payer_type in ('family','state','other'));
alter table public.payment_schedules drop constraint if exists payment_schedules_category_check;
alter table public.payment_schedules add constraint payment_schedules_category_check check (category in ('registration','tuition','option','caution','other'));

alter table public.payments
  add column if not exists payer_type text not null default 'family',
  add column if not exists category text not null default 'tuition',
  add column if not exists is_refundable boolean not null default false;

alter table public.payments drop constraint if exists payments_payer_type_check;
alter table public.payments add constraint payments_payer_type_check check (payer_type in ('family','state','other'));
alter table public.payments drop constraint if exists payments_category_check;
alter table public.payments add constraint payments_category_check check (category in ('registration','tuition','option','caution','other'));

create index if not exists idx_enrollments_funding_source on public.enrollments(establishment_id, funding_source, academic_year_id);
create index if not exists idx_payment_schedules_payer_type on public.payment_schedules(enrollment_id, payer_type, category);
create index if not exists idx_payments_payer_type on public.payments(establishment_id, payer_type, category);

alter table public.establishment_finance_settings enable row level security;
drop policy if exists "School members view finance settings" on public.establishment_finance_settings;
create policy "School members view finance settings" on public.establishment_finance_settings for select to authenticated using (private.has_permission(establishment_id, 'settings.read'));
drop policy if exists "School admins manage finance settings" on public.establishment_finance_settings;
create policy "School admins manage finance settings" on public.establishment_finance_settings for all to authenticated using (private.has_permission(establishment_id, 'settings.manage')) with check (private.has_permission(establishment_id, 'settings.manage'));

create or replace function public.get_state_finance_settings(p_establishment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
declare r public.establishment_finance_settings;
begin
  if not private.has_permission(p_establishment_id, 'settings.read') then raise exception 'Permission refusee'; end if;
  select * into r from public.establishment_finance_settings where establishment_id = p_establishment_id;
  if r.id is null then return jsonb_build_object('establishment_id',p_establishment_id,'state_students_enabled',false,'state_covers_registration',true,'state_covers_tuition',true,'state_allows_family_options',true,'state_allows_caution',false,'state_caution_default_amount',0,'state_caution_refundable',true); end if;
  return to_jsonb(r);
end; $$;
revoke all on function public.get_state_finance_settings(uuid) from public;
grant execute on function public.get_state_finance_settings(uuid) to authenticated;

create or replace function public.upsert_state_finance_settings(
  p_establishment_id uuid,
  p_state_students_enabled boolean,
  p_state_covers_registration boolean,
  p_state_covers_tuition boolean,
  p_state_allows_family_options boolean,
  p_state_allows_caution boolean,
  p_state_caution_default_amount numeric,
  p_state_caution_refundable boolean
) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare r public.establishment_finance_settings;
begin
  if not private.has_permission(p_establishment_id, 'settings.manage') then raise exception 'Permission refusee'; end if;
  insert into public.establishment_finance_settings(establishment_id,state_students_enabled,state_covers_registration,state_covers_tuition,state_allows_family_options,state_allows_caution,state_caution_default_amount,state_caution_refundable,updated_at)
  values(p_establishment_id,p_state_students_enabled,p_state_covers_registration,p_state_covers_tuition,p_state_allows_family_options,p_state_allows_caution,greatest(coalesce(p_state_caution_default_amount,0),0),p_state_caution_refundable,now())
  on conflict (establishment_id) do update set state_students_enabled=excluded.state_students_enabled,state_covers_registration=excluded.state_covers_registration,state_covers_tuition=excluded.state_covers_tuition,state_allows_family_options=excluded.state_allows_family_options,state_allows_caution=excluded.state_allows_caution,state_caution_default_amount=excluded.state_caution_default_amount,state_caution_refundable=excluded.state_caution_refundable,updated_at=now()
  returning * into r;
  return to_jsonb(r);
end; $$;
revoke all on function public.upsert_state_finance_settings(uuid,boolean,boolean,boolean,boolean,boolean,numeric,boolean) from public;
grant execute on function public.upsert_state_finance_settings(uuid,boolean,boolean,boolean,boolean,boolean,numeric,boolean) to authenticated;

create or replace function public.import_state_students(
  p_establishment_id uuid,
  p_academic_year_id uuid,
  p_class_id uuid,
  p_tuition_plan_id uuid,
  p_students jsonb,
  p_option_ids uuid[] default '{}',
  p_caution_amount numeric default 0,
  p_caution_refundable boolean default true
) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  row_data jsonb; v_student_id uuid; v_enrollment_id uuid; v_plan record; v_class record; v_settings record; v_option record;
  v_total_state numeric; v_total_parent numeric; v_count integer := 0; v_failed integer := 0; v_errors jsonb := '[]'::jsonb; v_option_total numeric; v_due numeric; i integer;
begin
  if not private.has_permission(p_establishment_id,'students.manage') or not private.has_permission(p_establishment_id,'enrollments.manage') then raise exception 'Permission refusee'; end if;
  if jsonb_typeof(p_students) <> 'array' or jsonb_array_length(p_students)=0 then raise exception 'Aucun eleve a importer'; end if;
  select * into v_settings from public.establishment_finance_settings where establishment_id=p_establishment_id;
  if coalesce(v_settings.state_students_enabled,false)=false then raise exception 'La prise en charge des eleves de l''Etat n''est pas activee'; end if;
  select * into v_class from public.school_classes where id=p_class_id and establishment_id=p_establishment_id;
  if v_class.id is null then raise exception 'Classe invalide'; end if;
  select * into v_plan from public.tuition_plans where id=p_tuition_plan_id and establishment_id=p_establishment_id and academic_year_id=p_academic_year_id and grade_level_id=v_class.grade_level_id and is_active=true;
  if v_plan.id is null then raise exception 'Forfait tarifaire invalide'; end if;
  if p_caution_amount < 0 then raise exception 'Caution invalide'; end if;
  if p_caution_amount > 0 and not coalesce(v_settings.state_allows_caution,false) then raise exception 'La caution n''est pas autorisee pour les eleves de l''Etat'; end if;

  for row_data in select value from jsonb_array_elements(p_students) loop
    begin
      if nullif(trim(coalesce(row_data->>'first_name','')),'') is null or nullif(trim(coalesce(row_data->>'last_name','')),'') is null then raise exception 'Nom et prenom obligatoires'; end if;
      if exists(select 1 from public.students s where s.establishment_id=p_establishment_id and lower(s.last_name)=lower(trim(row_data->>'last_name')) and lower(s.first_name)=lower(trim(row_data->>'first_name')) and coalesce(s.birth_date::text,'')=coalesce(nullif(trim(row_data->>'birth_date'),''),coalesce(s.birth_date::text,''))) then raise exception 'Eleve deja present'; end if;
      insert into public.students(establishment_id,student_number,last_name,first_name,birth_date,sex,phone,email,active)
      values(p_establishment_id,nullif(trim(row_data->>'student_number'),''),trim(row_data->>'last_name'),trim(row_data->>'first_name'),nullif(trim(row_data->>'birth_date'),'')::date,nullif(trim(row_data->>'sex'),''),nullif(trim(row_data->>'phone'),''),nullif(trim(row_data->>'email'),''),true) returning id into v_student_id;

      insert into public.enrollments(establishment_id,student_id,academic_year_id,class_id,tuition_plan_id,enrollment_date,status,funding_source,state_expected_amount,parent_payable_amount)
      values(p_establishment_id,v_student_id,p_academic_year_id,p_class_id,p_tuition_plan_id,current_date,'active','state',0,0) returning id into v_enrollment_id;

      v_total_state := 0;
      if coalesce(v_settings.state_covers_registration,true) then v_total_state := v_total_state + coalesce(v_plan.registration_fee,0); end if;
      if coalesce(v_settings.state_covers_tuition,true) then v_total_state := v_total_state + coalesce(v_plan.annual_tuition,0); end if;

      if coalesce(v_plan.registration_fee,0) > 0 then
        insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category) values(v_enrollment_id,1,'Frais d''inscription',current_date,v_plan.registration_fee,case when v_settings.state_covers_registration then 'state' else 'family' end,'registration');
      end if;

      if coalesce(v_plan.annual_tuition,0) > 0 then
        if v_plan.payment_mode='monthly' then
          v_due:=round(v_plan.annual_tuition/12,2);
          for i in 1..12 loop insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category) values(v_enrollment_id,i+1,'Mensualite '||i,(current_date+((i-1)||' months')::interval)::date,case when i=12 then v_plan.annual_tuition-v_due*11 else v_due end,case when v_settings.state_covers_tuition then 'state' else 'family' end,'tuition'); end loop;
        elsif v_plan.payment_mode='installments' then
          v_due:=round(v_plan.annual_tuition/greatest(v_plan.installment_count,1),2);
          for i in 1..greatest(v_plan.installment_count,1) loop insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category) values(v_enrollment_id,i+1,'Tranche '||i,current_date+((i-1)*30),case when i=greatest(v_plan.installment_count,1) then v_plan.annual_tuition-v_due*(greatest(v_plan.installment_count,1)-1) else v_due end,case when v_settings.state_covers_tuition then 'state' else 'family' end,'tuition'); end loop;
        else
          insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category) values(v_enrollment_id,2,'Scolarite',current_date,v_plan.annual_tuition,case when v_settings.state_covers_tuition then 'state' else 'family' end,'tuition');
        end if;
      end if;

      v_option_total := 0;
      if coalesce(v_settings.state_allows_family_options,true) and coalesce(array_length(p_option_ids,1),0)>0 then
        for v_option in select * from public.student_options where establishment_id=p_establishment_id and id=any(p_option_ids) and active=true loop
          insert into public.enrollment_options(establishment_id,enrollment_id,option_id,amount) values(p_establishment_id,v_enrollment_id,v_option.id,v_option.default_amount);
          v_option_total := v_option_total + coalesce(v_option.default_amount,0);
          insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category) values(v_enrollment_id,100+(select count(*) from public.enrollment_options where enrollment_id=v_enrollment_id),v_option.name,current_date,v_option.default_amount,'family','option');
        end loop;
      end if;

      if p_caution_amount > 0 then
        insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,payer_type,category,is_refundable) values(v_enrollment_id,999,'Caution',current_date,p_caution_amount,'family','caution',p_caution_refundable);
      end if;

      v_total_parent := v_option_total + coalesce(p_caution_amount,0);
      update public.enrollments set state_expected_amount=v_total_state,parent_payable_amount=v_total_parent where id=v_enrollment_id;
      v_count := v_count + 1;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row',v_count+v_failed,'message',sqlerrm,'first_name',row_data->>'first_name','last_name',row_data->>'last_name'));
    end;
  end loop;
  return jsonb_build_object('imported',v_count,'failed',v_failed,'errors',v_errors);
end; $$;
revoke all on function public.import_state_students(uuid,uuid,uuid,uuid,jsonb,uuid[],numeric,boolean) from public;
grant execute on function public.import_state_students(uuid,uuid,uuid,uuid,jsonb,uuid[],numeric,boolean) to authenticated;

create or replace function public.get_enrollment_financial_summary(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
declare e uuid; result jsonb;
begin
 select establishment_id into e from public.enrollments where id=p_enrollment_id;
 if e is null then raise exception 'Inscription introuvable'; end if;
 if not (private.has_permission(e,'payments.read') or exists(select 1 from public.student_guardians sg join public.enrollments en on en.student_id=sg.student_id where en.id=p_enrollment_id and sg.guardian_user_id=(select auth.uid()))) then raise exception 'Acces refuse'; end if;
 select jsonb_build_object('total_due',coalesce(sum(amount_due),0),'total_paid',coalesce(sum(amount_paid),0),'remaining',coalesce(sum(amount_due-amount_paid),0),'parent_due',coalesce(sum(amount_due-amount_paid) filter (where payer_type='family'),0),'state_expected',coalesce(sum(amount_due) filter (where payer_type='state'),0),'state_paid',coalesce(sum(amount_paid) filter (where payer_type='state'),0),'schedules',coalesce(jsonb_agg(jsonb_build_object('id',id,'number',installment_number,'label',label,'due_date',due_date,'amount_due',amount_due,'amount_paid',amount_paid,'status',status,'payer_type',payer_type,'category',category,'is_refundable',is_refundable) order by installment_number),'[]'::jsonb)) into result from public.payment_schedules where enrollment_id=p_enrollment_id;
 return result;
end; $$;
revoke all on function public.get_enrollment_financial_summary(uuid) from public;
grant execute on function public.get_enrollment_financial_summary(uuid) to authenticated;
