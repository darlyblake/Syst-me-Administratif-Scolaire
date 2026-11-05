-- Promotions scolaires applicables aux frais d'inscription
create table if not exists public.school_promotions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  promotion_type text not null check (promotion_type in ('fixed_price', 'percentage')),
  promotion_value numeric(12,2) not null check (promotion_value > 0),
  grade_level_ids uuid[] not null default '{}'::uuid[],
  academic_year_id uuid references public.academic_years(id) on delete set null,
  valid_from date not null,
  valid_until date not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_promotions_percentage_check check (promotion_type <> 'percentage' or promotion_value <= 100),
  constraint school_promotions_dates_check check (valid_until >= valid_from)
);

create index if not exists school_promotions_establishment_active_dates_idx
  on public.school_promotions(establishment_id, active, valid_from, valid_until);

alter table public.payment_schedules
  add column if not exists promotion_id uuid references public.school_promotions(id) on delete set null,
  add column if not exists promotion_name text,
  add column if not exists original_amount_due numeric(12,2),
  add column if not exists discount_amount numeric(12,2) not null default 0;

alter table public.school_promotions enable row level security;
drop policy if exists school_promotions_read on public.school_promotions;
create policy school_promotions_read on public.school_promotions for select to authenticated
  using (private.has_permission(establishment_id, 'settings.read') or private.has_permission(establishment_id, 'students.read') or private.has_permission(establishment_id, 'enrollments.manage'));
drop policy if exists school_promotions_manage on public.school_promotions;
create policy school_promotions_manage on public.school_promotions for all to authenticated
  using (private.has_permission(establishment_id, 'settings.manage'))
  with check (private.has_permission(establishment_id, 'settings.manage'));
grant select, insert, update, delete on public.school_promotions to authenticated;

create or replace function public.apply_school_registration_promotion()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_establishment_id uuid; v_academic_year_id uuid; v_enrollment_date date; v_grade_level_id uuid; v_promotion record;
begin
  if new.category <> 'registration' then return new; end if;
  select e.establishment_id, e.academic_year_id, e.enrollment_date, sc.grade_level_id
    into v_establishment_id, v_academic_year_id, v_enrollment_date, v_grade_level_id
  from public.enrollments e join public.school_classes sc on sc.id = e.class_id
  where e.id = new.enrollment_id;
  if v_establishment_id is null then return new; end if;
  -- Les promotions d'inscription ne s'appliquent pas aux réinscriptions.
  if exists (
    select 1 from public.enrollments previous
    where previous.student_id = (select current_enrollment.student_id from public.enrollments current_enrollment where current_enrollment.id = new.enrollment_id)
      and previous.id <> new.enrollment_id and previous.establishment_id = v_establishment_id and previous.status <> 'cancelled'
  ) then return new; end if;
  select p.id, p.name,
    case when p.promotion_type = 'fixed_price' then least(new.amount_due, p.promotion_value)
         else round(new.amount_due * (1 - p.promotion_value / 100), 2) end as final_amount
  into v_promotion
  from public.school_promotions p
  where p.establishment_id = v_establishment_id and p.active = true
    and p.valid_from <= coalesce(v_enrollment_date, current_date)
    and p.valid_until >= coalesce(v_enrollment_date, current_date)
    and (p.academic_year_id is null or p.academic_year_id = v_academic_year_id)
    and (cardinality(p.grade_level_ids) = 0 or v_grade_level_id = any(p.grade_level_ids))
  order by final_amount asc, p.created_at desc limit 1;
  if found and v_promotion.final_amount < new.amount_due then
    new.original_amount_due := new.amount_due;
    new.discount_amount := new.amount_due - v_promotion.final_amount;
    new.amount_due := v_promotion.final_amount;
    new.promotion_id := v_promotion.id;
    new.promotion_name := v_promotion.name;
  end if;
  return new;
end; $$;

drop trigger if exists trg_apply_school_registration_promotion on public.payment_schedules;
create trigger trg_apply_school_registration_promotion before insert on public.payment_schedules
  for each row execute function public.apply_school_registration_promotion();
