-- Close SECURITY DEFINER RPC paths that previously relied on membership alone.

create or replace function private.can_correct_attendance(
  p_establishment_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select private.has_permission(p_establishment_id, 'attendance.correct', p_user_id);
$function$;
revoke all on function private.can_correct_attendance(uuid, uuid) from public, anon;
grant execute on function private.can_correct_attendance(uuid, uuid) to authenticated, service_role;

create or replace function public.can_manage_establishment_levels(p_establishment_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select private.has_permission(p_establishment_id, 'classes.manage', auth.uid());
$function$;
revoke all on function public.can_manage_establishment_levels(uuid) from public, anon;
grant execute on function public.can_manage_establishment_levels(uuid) to authenticated, service_role;

create or replace function public.create_notification(
  p_establishment_id uuid, p_recipient_user_id uuid, p_type text, p_title text,
  p_body text default null, p_entity_type text default null, p_entity_id uuid default null
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare nid uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not private.can_view_notification(p_establishment_id, p_type, p_entity_type, p_entity_id, auth.uid()) then
    raise exception 'Permission refusee pour emettre cette notification';
  end if;
  if not private.can_view_notification(p_establishment_id, p_type, p_entity_type, p_entity_id, p_recipient_user_id) then
    raise exception 'Destinataire non autorise pour cette notification';
  end if;
  insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
  values(p_establishment_id,p_recipient_user_id,p_type,p_title,p_body,p_entity_type,p_entity_id)
  returning id into nid;
  return nid;
end;
$function$;
revoke all on function public.create_notification(uuid, uuid, text, text, text, text, uuid) from public, anon;
grant execute on function public.create_notification(uuid, uuid, text, text, text, text, uuid) to authenticated, service_role;

create or replace function public.create_staff(
  p_establishment_id uuid, p_first_name text, p_last_name text, p_position text,
  p_employee_number text default null, p_phone text default null, p_email text default null,
  p_hire_date date default null, p_profile_id uuid default null, p_active boolean default true
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_id uuid;
begin
  if p_establishment_id is null or not private.has_permission(p_establishment_id, 'staff.manage') then
    raise exception 'permission_denied';
  end if;
  if nullif(trim(p_first_name),'') is null or nullif(trim(p_last_name),'') is null or nullif(trim(p_position),'') is null then
    raise exception 'required_fields_missing';
  end if;
  insert into public.staff_members(establishment_id,profile_id,employee_number,first_name,last_name,position,phone,email,hire_date,active)
  values(p_establishment_id,p_profile_id,nullif(trim(p_employee_number),''),trim(p_first_name),trim(p_last_name),trim(p_position),
    nullif(trim(p_phone),''),nullif(trim(p_email),''),p_hire_date,coalesce(p_active,true))
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.update_staff(
  p_staff_id uuid, p_first_name text default null, p_last_name text default null,
  p_position text default null, p_employee_number text default null, p_phone text default null,
  p_email text default null, p_hire_date date default null, p_active boolean default null
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_id uuid; v_est uuid;
begin
  select id,establishment_id into v_id,v_est from public.staff_members where id=p_staff_id;
  if v_id is null then raise exception 'staff_not_found'; end if;
  if not private.has_permission(v_est,'staff.manage') then raise exception 'permission_denied'; end if;
  update public.staff_members
  set first_name=coalesce(nullif(trim(p_first_name),''),first_name),
      last_name=coalesce(nullif(trim(p_last_name),''),last_name),
      position=coalesce(nullif(trim(p_position),''),position),
      employee_number=case when p_employee_number is null then employee_number else nullif(trim(p_employee_number),'') end,
      phone=case when p_phone is null then phone else nullif(trim(p_phone),'') end,
      email=case when p_email is null then email else nullif(trim(p_email),'') end,
      hire_date=coalesce(p_hire_date,hire_date),
      active=coalesce(p_active,active),updated_at=now()
  where id=p_staff_id returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.deactivate_staff(p_staff_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_id uuid; v_est uuid;
begin
  select id,establishment_id into v_id,v_est from public.staff_members where id=p_staff_id;
  if v_id is null then raise exception 'staff_not_found'; end if;
  if not private.has_permission(v_est,'staff.manage') then raise exception 'permission_denied'; end if;
  update public.staff_members set active=false,updated_at=now() where id=p_staff_id;
  return v_id;
end;
$function$;

create or replace function public.list_staff_paginated(
  p_establishment_id uuid, p_page integer default 1, p_page_size integer default 20,
  p_search text default null, p_active boolean default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_offset integer; v_total bigint; v_items jsonb;
begin
  if p_establishment_id is null then raise exception 'establishment_id_required'; end if;
  if not private.has_permission(p_establishment_id,'staff.view') then raise exception 'permission_denied'; end if;
  if greatest(p_page,1) <> p_page or p_page_size < 1 or p_page_size > 100 then raise exception 'invalid_pagination'; end if;
  v_offset := (p_page - 1) * p_page_size;

  select count(*) into v_total
  from public.staff_members s
  where s.establishment_id=p_establishment_id
    and (p_active is null or s.active=p_active)
    and (p_search is null or trim(p_search)='' or
      concat_ws(' ',s.first_name,s.last_name,s.employee_number,s.position,s.email,s.phone) ilike '%'||trim(p_search)||'%');

  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_name,x.first_name),'[]'::jsonb)
  into v_items
  from (
    select s.id,s.establishment_id,s.profile_id,s.employee_number,s.first_name,s.last_name,s.position,
      s.phone,s.email,s.hire_date,s.active,s.created_at,s.updated_at,
      case when s.profile_id is null or em.id is null then null else em.user_id end as account_id,
      case when s.profile_id is null or em.id is null then null when em.active then 'active' else 'inactive' end as account_status,
      em.role_id,case when s.active=false then 'inactive' else 'active' end as status
    from public.staff_members s
    left join lateral (
      select em.id,em.user_id,em.role_id,em.active
      from public.establishment_members em
      where em.establishment_id=s.establishment_id and em.user_id=s.profile_id
      order by em.active desc,em.created_at desc limit 1
    ) em on true
    where s.establishment_id=p_establishment_id
      and (p_active is null or s.active=p_active)
      and (p_search is null or trim(p_search)='' or
        concat_ws(' ',s.first_name,s.last_name,s.employee_number,s.position,s.email,s.phone) ilike '%'||trim(p_search)||'%')
    order by s.last_name,s.first_name,s.id
    limit p_page_size offset v_offset
  ) x;

  return jsonb_build_object(
    'items',v_items,'page',p_page,'page_size',p_page_size,'total',v_total,
    'total_pages',case when v_total=0 then 0 else ceil(v_total::numeric/p_page_size)::integer end
  );
end;
$function$;

create or replace function public.create_payroll_advance(
  p_establishment_id uuid, p_staff_type text, p_staff_id uuid,
  p_target_period_id uuid default null, p_target_period_start date default null,
  p_amount numeric default 0, p_advance_date date default current_date,
  p_method text default 'cash', p_reference text default null, p_notes text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare
  v_id uuid := gen_random_uuid();
  v_period_id uuid := p_target_period_id;
  v_target_start date := p_target_period_start;
  v_target_end date;
  v_staff_exists boolean;
  v_year record;
begin
  if not private.has_permission(p_establishment_id,'staff.manage') then raise exception 'Permission refusee'; end if;
  if p_amount <= 0 then raise exception 'Le montant de l''avance doit être positif.'; end if;
  if p_staff_type not in ('staff','teacher') then raise exception 'Type de personnel invalide.'; end if;

  if p_target_period_id is not null then
    select starts_on,ends_on into v_target_start,v_target_end
    from public.payroll_periods where id=p_target_period_id and establishment_id=p_establishment_id;
    if v_target_start is null then raise exception 'La période de salaire sélectionnée est introuvable.'; end if;
  elsif v_target_start is not null then
    v_target_end := (date_trunc('month',v_target_start::timestamp)+interval '1 month - 1 day')::date;
    v_target_start := date_trunc('month',v_target_start::timestamp)::date;
    select id into v_period_id from public.payroll_periods
    where establishment_id=p_establishment_id and starts_on=v_target_start and ends_on=v_target_end limit 1;
  else
    raise exception 'Le mois de récupération de l''avance est obligatoire.';
  end if;

  select exists(select 1 from public.v_payroll_staff
    where establishment_id=p_establishment_id and staff_type=p_staff_type and staff_id=p_staff_id)
  into v_staff_exists;
  if not v_staff_exists then raise exception 'Le membre du personnel sélectionné est introuvable.'; end if;

  select ay.id,ay.start_date,ay.end_date into v_year
  from public.academic_years ay
  where ay.establishment_id=p_establishment_id and ay.start_date<=v_target_end and ay.end_date>=v_target_start
  order by ay.start_date desc limit 1;
  if v_year.id is null then raise exception 'Le mois choisi ne correspond à aucune année académique.'; end if;
  if not private.payroll_month_is_configured(p_establishment_id,v_target_start,v_target_end) then
    raise exception 'Ce mois n''est pas configuré comme mois payable pour l''année académique.';
  end if;

  insert into public.payroll_advances(
    id,establishment_id,staff_type,staff_id,target_period_id,target_period_start,amount,advance_date,
    payment_method,reference,notes,created_by
  ) values (
    v_id,p_establishment_id,p_staff_type,p_staff_id,v_period_id,v_target_start,p_amount,p_advance_date,
    p_method,p_reference,p_notes,auth.uid()
  );
  return v_id;
end;
$function$;

create or replace function public.generate_payroll_period(
  p_establishment_id uuid,p_starts_on date,p_ends_on date
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
begin
  if not private.has_permission(p_establishment_id,'staff.manage') then raise exception 'Permission refusee'; end if;
  if not private.payroll_month_is_configured(p_establishment_id,p_starts_on,p_ends_on) then
    raise exception 'Ce mois de paie n''est pas pris en charge pour l''année académique sélectionnée.';
  end if;
  return private.generate_payroll_period(p_establishment_id,p_starts_on,p_ends_on);
end;
$function$;

create or replace function public.update_tuition_plan(
  p_tuition_plan_id uuid,p_name text,p_registration_fee numeric,p_annual_tuition numeric,
  p_payment_mode text,p_installment_count integer,p_active boolean default true
)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_est uuid; v_year public.academic_years; v_count integer;
begin
  select establishment_id into v_est from public.tuition_plans where id=p_tuition_plan_id;
  if v_est is null or not private.has_permission(v_est,'tuition.manage') then raise exception 'Permission refusee'; end if;

  select ay.* into v_year from public.academic_years ay
  join public.tuition_plans tp on tp.academic_year_id=ay.id where tp.id=p_tuition_plan_id;

  if p_registration_fee<0 or p_annual_tuition<0 then raise exception 'Montant invalide'; end if;
  if p_payment_mode not in ('single','monthly','installments') then raise exception 'Mode de paiement invalide'; end if;

  update public.tuition_plans
  set name=trim(p_name),registration_fee=p_registration_fee,annual_tuition=p_annual_tuition,
      payment_mode=p_payment_mode,
      installment_count=case
        when p_payment_mode='single' then 1
        when p_payment_mode='monthly' then
          (extract(year from age(v_year.end_date,v_year.start_date))::integer*12)
          +extract(month from age(v_year.end_date,v_year.start_date))::integer+1
        else p_installment_count end,
      active=p_active,updated_at=now()
  where id=p_tuition_plan_id;

  if p_payment_mode in ('single','monthly') then
    perform private.rebuild_tuition_plan_installments(
      p_tuition_plan_id,'[]'::jsonb,v_year.start_date,v_year.end_date
    );
  else
    if (select count(*) from public.tuition_plan_installments where tuition_plan_id=p_tuition_plan_id) <> p_installment_count
       or round(coalesce((select sum(amount) from public.tuition_plan_installments where tuition_plan_id=p_tuition_plan_id),0),2)
          <> round(p_annual_tuition,2) then
      raise exception 'Pour modifier les tranches, utiliser update_tuition_plan_server_validated avec le programme des tranches';
    end if;
  end if;
  return true;
end;
$function$;

create or replace function public.upsert_state_finance_settings(
  p_establishment_id uuid,p_state_students_enabled boolean,p_state_covers_registration boolean,
  p_state_covers_tuition boolean,p_state_allows_family_options boolean,p_state_allows_caution boolean,
  p_state_caution_default_amount numeric,p_state_caution_refundable boolean
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare r public.establishment_finance_settings;
begin
  if not private.has_permission(p_establishment_id,'payments.manage') then raise exception 'Permission refusee'; end if;
  insert into public.establishment_finance_settings(
    establishment_id,state_students_enabled,state_covers_registration,state_covers_tuition,
    state_allows_family_options,state_allows_caution,state_caution_default_amount,state_caution_refundable,updated_at
  ) values (
    p_establishment_id,p_state_students_enabled,p_state_covers_registration,p_state_covers_tuition,
    p_state_allows_family_options,p_state_allows_caution,greatest(coalesce(p_state_caution_default_amount,0),0),
    p_state_caution_refundable,now()
  )
  on conflict (establishment_id) do update set
    state_students_enabled=excluded.state_students_enabled,
    state_covers_registration=excluded.state_covers_registration,
    state_covers_tuition=excluded.state_covers_tuition,
    state_allows_family_options=excluded.state_allows_family_options,
    state_allows_caution=excluded.state_allows_caution,
    state_caution_default_amount=excluded.state_caution_default_amount,
    state_caution_refundable=excluded.state_caution_refundable,updated_at=now()
  returning * into r;
  return to_jsonb(r);
end;
$function$;

create or replace function public.teacher_notifications(p_limit integer default 30)
returns table(
  id uuid,establishment_id uuid,type text,title text,body text,entity_type text,
  entity_id uuid,read_at timestamptz,created_at timestamptz
)
language sql stable security definer set search_path = ''
as $function$
  select n.id,n.establishment_id,n.type,n.title,n.body,n.entity_type,n.entity_id,n.read_at,n.created_at
  from public.notifications n
  where n.recipient_user_id=auth.uid()
    and private.can_view_notification(n.establishment_id,n.type,n.entity_type,n.entity_id,auth.uid())
    and exists (
      select 1 from public.teacher_establishments te
      join public.teachers t on t.id=te.teacher_id
      where t.profile_id=auth.uid() and t.active=true
        and te.establishment_id=n.establishment_id and te.status='active'
    )
  order by n.created_at desc limit greatest(1,least(coalesce(p_limit,30),100));
$function$;

create or replace function public.teacher_mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
begin
  update public.notifications n set read_at=coalesce(n.read_at,now())
  where n.id=p_notification_id and n.recipient_user_id=auth.uid()
    and private.can_view_notification(n.establishment_id,n.type,n.entity_type,n.entity_id,auth.uid())
    and exists (
      select 1 from public.teacher_establishments te
      join public.teachers t on t.id=te.teacher_id
      where t.profile_id=auth.uid() and t.active=true
        and te.establishment_id=n.establishment_id and te.status='active'
    );
  return found;
end;
$function$;

create or replace function public.teacher_mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = ''
as $function$
declare changed integer;
begin
  update public.notifications n set read_at=now()
  where n.recipient_user_id=auth.uid() and n.read_at is null
    and private.can_view_notification(n.establishment_id,n.type,n.entity_type,n.entity_id,auth.uid())
    and exists (
      select 1 from public.teacher_establishments te
      join public.teachers t on t.id=te.teacher_id
      where t.profile_id=auth.uid() and t.active=true
        and te.establishment_id=n.establishment_id and te.status='active'
    );
  get diagnostics changed=row_count;
  return changed;
end;
$function$;

-- Remaining academic catalogue reads also require a configured module permission.
drop policy if exists years_member_select on public.academic_years;
create policy years_member_select on public.academic_years for select to authenticated
using (
  private.has_permission(establishment_id,'dashboard.view')
  or private.has_permission(establishment_id,'classes.view')
  or private.has_permission(establishment_id,'inscriptions.read')
  or private.has_permission(establishment_id,'payments.view')
);
drop policy if exists cycles_member_select on public.education_cycles;
create policy cycles_member_select on public.education_cycles for select to authenticated
using (
  private.has_permission(establishment_id,'classes.view')
  or private.has_permission(establishment_id,'inscriptions.read')
);
drop policy if exists enrollment_options_member on public.enrollment_options;
create policy enrollment_options_member on public.enrollment_options for select to authenticated
using (
  private.has_permission(establishment_id,'inscriptions.read')
  or private.has_permission(establishment_id,'payments.view')
);
drop policy if exists levels_member_select on public.grade_levels;
create policy levels_member_select on public.grade_levels for select to authenticated
using (exists (
  select 1 from public.education_cycles c
  where c.id=grade_levels.cycle_id
    and (private.has_permission(c.establishment_id,'classes.view')
      or private.has_permission(c.establishment_id,'inscriptions.read'))
));
