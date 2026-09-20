-- General school fees + targeted registration/re-registration overrides
alter table public.tuition_plans
  add column if not exists re_registration_fee numeric not null default 0;

create table if not exists public.establishment_fee_settings (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  registration_fee numeric not null default 0 check (registration_fee >= 0),
  re_registration_fee numeric not null default 0 check (re_registration_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint establishment_fee_settings_establishment_unique unique (establishment_id)
);

create table if not exists public.establishment_fee_overrides (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  scope_type text not null check (scope_type in ('cycle','level')),
  scope_id uuid not null,
  registration_fee numeric check (registration_fee is null or registration_fee >= 0),
  re_registration_fee numeric check (re_registration_fee is null or re_registration_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint establishment_fee_overrides_unique_scope unique (establishment_id, scope_type, scope_id),
  constraint establishment_fee_overrides_has_value check (registration_fee is not null or re_registration_fee is not null)
);

create index if not exists establishment_fee_overrides_scope_idx
  on public.establishment_fee_overrides (establishment_id, scope_type, scope_id);

alter table public.establishment_fee_settings enable row level security;
alter table public.establishment_fee_overrides enable row level security;

drop policy if exists "School finance admins manage fee settings" on public.establishment_fee_settings;
create policy "School finance admins manage fee settings"
on public.establishment_fee_settings
for all
using (private.has_role(establishment_id, array['owner','admin','director','accountant']))
with check (private.has_role(establishment_id, array['owner','admin','director','accountant']));

drop policy if exists "School members view fee settings" on public.establishment_fee_settings;
create policy "School members view fee settings"
on public.establishment_fee_settings
for select
using (private.is_member(establishment_id));

drop policy if exists "School finance admins manage fee overrides" on public.establishment_fee_overrides;
create policy "School finance admins manage fee overrides"
on public.establishment_fee_overrides
for all
using (private.has_role(establishment_id, array['owner','admin','director','accountant']))
with check (private.has_role(establishment_id, array['owner','admin','director','accountant']));

drop policy if exists "School members view fee overrides" on public.establishment_fee_overrides;
create policy "School members view fee overrides"
on public.establishment_fee_overrides
for select
using (private.is_member(establishment_id));

create or replace function public.get_effective_enrollment_fees(
  p_establishment_id uuid,
  p_grade_level_id uuid
)
returns table (
  general_registration_fee numeric,
  general_re_registration_fee numeric,
  registration_fee numeric,
  re_registration_fee numeric,
  registration_source text,
  re_registration_source text
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      coalesce(s.registration_fee, 0) as general_registration_fee,
      coalesce(s.re_registration_fee, 0) as general_re_registration_fee
    from (select 1) x
    left join public.establishment_fee_settings s
      on s.establishment_id = p_establishment_id
  ),
  level_info as (
    select gl.id as level_id, ec.id as cycle_id
    from public.grade_levels gl
    join public.education_cycles ec on ec.id = gl.cycle_id
    where gl.id = p_grade_level_id
      and ec.establishment_id = p_establishment_id
  ),
  level_override as (
    select o.registration_fee, o.re_registration_fee
    from public.establishment_fee_overrides o
    where o.establishment_id = p_establishment_id
      and o.scope_type = 'level'
      and o.scope_id = p_grade_level_id
    limit 1
  ),
  cycle_override as (
    select o.registration_fee, o.re_registration_fee
    from public.establishment_fee_overrides o
    join level_info li on li.cycle_id = o.scope_id
    where o.establishment_id = p_establishment_id
      and o.scope_type = 'cycle'
    limit 1
  )
  select
    b.general_registration_fee,
    b.general_re_registration_fee,
    coalesce(lo.registration_fee, co.registration_fee, b.general_registration_fee),
    coalesce(lo.re_registration_fee, co.re_registration_fee, b.general_re_registration_fee),
    case
      when lo.registration_fee is not null then 'level'
      when co.registration_fee is not null then 'cycle'
      else 'general'
    end,
    case
      when lo.re_registration_fee is not null then 'level'
      when co.re_registration_fee is not null then 'cycle'
      else 'general'
    end
  from base b
  left join level_override lo on true
  left join cycle_override co on true;
$$;

revoke all on function public.get_effective_enrollment_fees(uuid, uuid) from public;
grant execute on function public.get_effective_enrollment_fees(uuid, uuid) to authenticated;
