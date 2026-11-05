-- Étendre les promotions aux réinscriptions selon le choix de l'établissement.
alter table public.school_promotions
  add column if not exists applies_to_registration boolean not null default true,
  add column if not exists applies_to_re_registration boolean not null default false;

create or replace function public.apply_school_registration_promotion()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_establishment_id uuid;
  v_academic_year_id uuid;
  v_enrollment_date date;
  v_grade_level_id uuid;
  v_student_id uuid;
  v_is_re_registration boolean := false;
  v_promotion record;
begin
  if new.category <> 'registration' then
    return new;
  end if;

  select e.establishment_id, e.academic_year_id, e.enrollment_date,
         sc.grade_level_id, e.student_id
    into v_establishment_id, v_academic_year_id, v_enrollment_date,
         v_grade_level_id, v_student_id
  from public.enrollments e
  join public.school_classes sc on sc.id = e.class_id
  where e.id = new.enrollment_id;

  if v_establishment_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.enrollments previous
    where previous.student_id = v_student_id
      and previous.id <> new.enrollment_id
      and previous.establishment_id = v_establishment_id
      and previous.status <> 'cancelled'
  ) into v_is_re_registration;

  select p.id, p.name,
    case
      when p.promotion_type = 'fixed_price' then least(new.amount_due, p.promotion_value)
      else round(new.amount_due * (1 - p.promotion_value / 100), 2)
    end as final_amount
  into v_promotion
  from public.school_promotions p
  where p.establishment_id = v_establishment_id
    and p.active = true
    and (case when v_is_re_registration
      then p.applies_to_re_registration
      else p.applies_to_registration
    end)
    and p.valid_from <= coalesce(v_enrollment_date, current_date)
    and p.valid_until >= coalesce(v_enrollment_date, current_date)
    and (p.academic_year_id is null or p.academic_year_id = v_academic_year_id)
    and (cardinality(p.grade_level_ids) = 0 or v_grade_level_id = any(p.grade_level_ids))
  order by final_amount asc, p.created_at desc
  limit 1;

  if found and v_promotion.final_amount < new.amount_due then
    new.original_amount_due := new.amount_due;
    new.discount_amount := new.amount_due - v_promotion.final_amount;
    new.amount_due := v_promotion.final_amount;
    new.promotion_id := v_promotion.id;
    new.promotion_name := v_promotion.name;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';