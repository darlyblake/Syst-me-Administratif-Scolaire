-- Configure le mois de début de facturation mensuelle par niveau.
-- Le mois choisi doit rester dans l'année académique.

create or replace function public.create_tuition_plan_with_billing(
  p_establishment_id uuid,
  p_academic_year_id uuid,
  p_grade_level_id uuid,
  p_name text,
  p_registration_fee numeric,
  p_annual_tuition numeric,
  p_payment_mode text,
  p_schedule jsonb default '[]'::jsonb,
  p_billing_start_date date default null,
  p_billing_end_date date default null,
  p_enrollment_payment_priority text default 'schedule_order'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_plan_id uuid;
  v_year public.academic_years;
  v_est uuid;
  v_count integer;
  v_start date;
  v_end date;
begin
  if not private.has_permission(p_establishment_id,'tuition.manage') then
    raise exception 'Permission refusee';
  end if;

  if p_registration_fee < 0 or p_annual_tuition < 0 then
    raise exception 'Montant invalide';
  end if;

  if nullif(trim(p_name),'') is null then
    raise exception 'Nom du plan obligatoire';
  end if;

  if p_payment_mode not in ('single','monthly','installments') then
    raise exception 'Mode de paiement invalide';
  end if;

  if p_enrollment_payment_priority not in ('schedule_order','last_due_first') then
    raise exception 'Priorite de paiement invalide';
  end if;

  select * into v_year
  from public.academic_years
  where id=p_academic_year_id and establishment_id=p_establishment_id;

  if v_year.id is null then
    raise exception 'Annee academique hors etablissement';
  end if;

  select ec.establishment_id into v_est
  from public.grade_levels gl
  join public.education_cycles ec on ec.id=gl.cycle_id
  where gl.id=p_grade_level_id;

  if v_est is null or v_est<>p_establishment_id then
    raise exception 'Niveau hors etablissement';
  end if;

  if exists(
    select 1 from public.tuition_plans
    where academic_year_id=p_academic_year_id
      and grade_level_id=p_grade_level_id
      and active
  ) then
    raise exception 'Un plan actif existe deja pour ce niveau et cette annee';
  end if;

  if p_payment_mode='single' then
    v_count:=1;
    v_start:=coalesce(p_billing_start_date,v_year.start_date);
    v_end:=coalesce(p_billing_end_date,v_year.end_date);
  elsif p_payment_mode='monthly' then
    v_start:=coalesce(p_billing_start_date,v_year.start_date);
    v_end:=coalesce(p_billing_end_date,v_year.end_date);

    if v_start < v_year.start_date or v_end > v_year.end_date or v_start > v_end then
      raise exception 'Periode de facturation hors annee scolaire';
    end if;

    v_count :=
      (extract(year from age(v_end,v_start))::integer*12)
      + extract(month from age(v_end,v_start))::integer+1;

    if v_count<1 or v_count>12 then
      raise exception 'Nombre de mensualites invalide: %',v_count;
    end if;
  else
    if jsonb_typeof(p_schedule)<>'array' then
      raise exception 'Programme d echeances invalide';
    end if;
    v_count:=jsonb_array_length(p_schedule);
    if v_count<2 or v_count>24 then
      raise exception 'Nombre d echeances invalide';
    end if;
    v_start:=p_billing_start_date;
    v_end:=p_billing_end_date;
  end if;

  insert into public.tuition_plans(
    establishment_id,academic_year_id,grade_level_id,name,registration_fee,
    annual_tuition,payment_mode,installment_count,active,billing_start_date,
    billing_end_date,enrollment_payment_priority
  ) values(
    p_establishment_id,p_academic_year_id,p_grade_level_id,trim(p_name),
    p_registration_fee,p_annual_tuition,p_payment_mode,v_count,true,
    v_start,v_end,p_enrollment_payment_priority
  ) returning id into v_plan_id;

  perform private.rebuild_tuition_plan_installments(
    v_plan_id,p_schedule,v_start,v_end
  );

  return public.get_tuition_plan(v_plan_id);
end;
$function$;

grant execute on function public.create_tuition_plan_with_billing(
  uuid,uuid,uuid,text,numeric,numeric,text,jsonb,date,date,text
) to authenticated;

create or replace function public.localize_monthly_tuition_installment_label()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_mode text;
  v_month_name text;
begin
  select payment_mode into v_mode
  from public.tuition_plans
  where id = new.tuition_plan_id;

  if v_mode = 'monthly' and new.due_date is not null then
    v_month_name := case extract(month from new.due_date)::integer
      when 1 then 'Janvier'
      when 2 then 'Février'
      when 3 then 'Mars'
      when 4 then 'Avril'
      when 5 then 'Mai'
      when 6 then 'Juin'
      when 7 then 'Juillet'
      when 8 then 'Août'
      when 9 then 'Septembre'
      when 10 then 'Octobre'
      when 11 then 'Novembre'
      when 12 then 'Décembre'
    end;

    new.label := v_month_name || ' ' || extract(year from new.due_date)::integer;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_localize_monthly_tuition_installment_label
on public.tuition_plan_installments;

create trigger trg_localize_monthly_tuition_installment_label
before insert or update of due_date, tuition_plan_id
on public.tuition_plan_installments
for each row
execute function public.localize_monthly_tuition_installment_label();

revoke all on function public.localize_monthly_tuition_installment_label() from public;
grant execute on function public.localize_monthly_tuition_installment_label() to authenticated;
