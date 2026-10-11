-- Organismes financeurs, familles, réductions et échéances ventilées par payeur.
-- Les échéances et paiements existants sont conservés; la prise en charge de l'État reste inchangée.

create table if not exists public.sponsoring_organizations (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  organization_type text not null default 'other' check (organization_type in ('ngo','association','company','institution','other')),
  reference text, contact_name text, phone text, email text, notes text,
  is_state boolean not null default false, active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists sponsoring_organizations_establishment_active_idx on public.sponsoring_organizations(establishment_id,active,name);

create table if not exists public.organization_coverage_rules (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  organization_id uuid not null references public.sponsoring_organizations(id) on delete cascade,
  category text not null check (category in ('registration','tuition','option','caution','other')),
  coverage_percent numeric(5,2) not null check (coverage_percent between 0 and 100),
  grade_level_id uuid, academic_year_id uuid,
  active boolean not null default true, valid_from date, valid_until date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint organization_coverage_dates_check check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index if not exists organization_coverage_lookup_idx on public.organization_coverage_rules(establishment_id,organization_id,category,active);

create table if not exists public.school_families (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  family_code text not null unique default ('FAM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  display_name text, notes text, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists school_families_establishment_idx on public.school_families(establishment_id,created_at desc);

create table if not exists public.student_family_members (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  family_id uuid not null references public.school_families(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship text not null default 'autre' check (relationship in ('frere','soeur','autre')),
  active boolean not null default true, verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint student_family_member_unique unique(family_id,student_id)
);
create unique index if not exists student_one_active_family_idx on public.student_family_members(student_id) where active=true;
create index if not exists student_family_members_family_idx on public.student_family_members(establishment_id,family_id,active);

create table if not exists public.family_discount_rules (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null check (length(trim(name))>0),
  min_children integer not null check (min_children>=2), max_children integer,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value>0),
  applies_to_categories text[] not null default array['tuition']::text[],
  academic_year_id uuid, active boolean not null default true, stackable boolean not null default false,
  valid_from date, valid_until date, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint family_discount_range_check check (max_children is null or max_children>=min_children),
  constraint family_discount_percentage_check check (discount_type<>'percentage' or discount_value<=100),
  constraint family_discount_dates_check check (valid_until is null or valid_from is null or valid_until>=valid_from),
  constraint family_discount_categories_check check (cardinality(applies_to_categories)>0 and applies_to_categories <@ array['registration','tuition','option','caution','other']::text[])
);
create index if not exists family_discount_rules_lookup_idx on public.family_discount_rules(establishment_id,active,min_children desc);

alter table public.enrollments add column if not exists organization_expected_amount numeric(12,2) not null default 0;
alter table public.payment_schedules add column if not exists organization_id uuid references public.sponsoring_organizations(id) on delete set null;
alter table public.payments add column if not exists organization_id uuid references public.sponsoring_organizations(id) on delete set null;
alter table public.payment_schedules drop constraint if exists payment_schedules_enrollment_id_installment_number_key;
create unique index if not exists payment_schedules_payer_installment_unique_idx on public.payment_schedules(enrollment_id,installment_number,payer_type,coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.enrollment_discount_snapshots (
  id uuid primary key default gen_random_uuid(), establishment_id uuid not null references public.establishments(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  schedule_id uuid references public.payment_schedules(id) on delete set null,
  family_id uuid references public.school_families(id) on delete set null,
  rule_id uuid references public.family_discount_rules(id) on delete set null,
  rule_name text not null, category text not null, discount_type text not null, discount_value numeric(12,2) not null,
  original_amount numeric(12,2) not null, discount_amount numeric(12,2) not null, created_at timestamptz not null default now()
);
create index if not exists enrollment_discount_snapshots_enrollment_idx on public.enrollment_discount_snapshots(enrollment_id,created_at);

create table if not exists public.organization_coverage_snapshots (
  id uuid primary key default gen_random_uuid(), establishment_id uuid not null references public.establishments(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  schedule_id uuid references public.payment_schedules(id) on delete set null,
  organization_id uuid references public.sponsoring_organizations(id) on delete set null,
  category text not null, coverage_percent numeric(5,2) not null, net_amount numeric(12,2) not null,
  organization_amount numeric(12,2) not null, family_amount numeric(12,2) not null, created_at timestamptz not null default now()
);
create index if not exists organization_coverage_snapshots_enrollment_idx on public.organization_coverage_snapshots(enrollment_id,created_at);

alter table public.sponsoring_organizations enable row level security;
alter table public.organization_coverage_rules enable row level security;
alter table public.school_families enable row level security;
alter table public.student_family_members enable row level security;
alter table public.family_discount_rules enable row level security;
alter table public.enrollment_discount_snapshots enable row level security;
alter table public.organization_coverage_snapshots enable row level security;

drop policy if exists sponsoring_org_read on public.sponsoring_organizations;
create policy sponsoring_org_read on public.sponsoring_organizations for select to authenticated using (private.has_permission(establishment_id,'settings.read') or private.has_permission(establishment_id,'students.read'));
drop policy if exists sponsoring_org_manage on public.sponsoring_organizations;
create policy sponsoring_org_manage on public.sponsoring_organizations for all to authenticated using (private.has_permission(establishment_id,'settings.manage')) with check (private.has_permission(establishment_id,'settings.manage'));
drop policy if exists organization_coverage_rules_read on public.organization_coverage_rules;
create policy organization_coverage_rules_read on public.organization_coverage_rules for select to authenticated using (private.has_permission(establishment_id,'settings.read') or private.has_permission(establishment_id,'students.read'));
drop policy if exists organization_coverage_rules_manage on public.organization_coverage_rules;
create policy organization_coverage_rules_manage on public.organization_coverage_rules for all to authenticated using (private.has_permission(establishment_id,'settings.manage')) with check (private.has_permission(establishment_id,'settings.manage'));
drop policy if exists school_families_read on public.school_families;
create policy school_families_read on public.school_families for select to authenticated using (private.has_permission(establishment_id,'students.read') or private.has_permission(establishment_id,'payments.read'));
drop policy if exists school_families_manage on public.school_families;
create policy school_families_manage on public.school_families for all to authenticated using (private.has_permission(establishment_id,'students.manage')) with check (private.has_permission(establishment_id,'students.manage'));
drop policy if exists student_family_members_read on public.student_family_members;
create policy student_family_members_read on public.student_family_members for select to authenticated using (private.has_permission(establishment_id,'students.read') or private.has_permission(establishment_id,'payments.read'));
drop policy if exists student_family_members_manage on public.student_family_members;
create policy student_family_members_manage on public.student_family_members for all to authenticated using (private.has_permission(establishment_id,'students.manage')) with check (private.has_permission(establishment_id,'students.manage'));
drop policy if exists family_discount_rules_read on public.family_discount_rules;
create policy family_discount_rules_read on public.family_discount_rules for select to authenticated using (private.has_permission(establishment_id,'settings.read') or private.has_permission(establishment_id,'students.read'));
drop policy if exists family_discount_rules_manage on public.family_discount_rules;
create policy family_discount_rules_manage on public.family_discount_rules for all to authenticated using (private.has_permission(establishment_id,'settings.manage')) with check (private.has_permission(establishment_id,'settings.manage'));
drop policy if exists enrollment_discount_snapshots_read on public.enrollment_discount_snapshots;
create policy enrollment_discount_snapshots_read on public.enrollment_discount_snapshots for select to authenticated using (private.has_permission(establishment_id,'payments.read') or private.has_permission(establishment_id,'students.read'));
drop policy if exists enrollment_discount_snapshots_manage on public.enrollment_discount_snapshots;
create policy enrollment_discount_snapshots_manage on public.enrollment_discount_snapshots for all to authenticated using (private.has_permission(establishment_id,'enrollments.manage')) with check (private.has_permission(establishment_id,'enrollments.manage'));
drop policy if exists organization_coverage_snapshots_read on public.organization_coverage_snapshots;
create policy organization_coverage_snapshots_read on public.organization_coverage_snapshots for select to authenticated using (private.has_permission(establishment_id,'payments.read') or private.has_permission(establishment_id,'students.read'));
drop policy if exists organization_coverage_snapshots_manage on public.organization_coverage_snapshots;
create policy organization_coverage_snapshots_manage on public.organization_coverage_snapshots for all to authenticated using (private.has_permission(establishment_id,'enrollments.manage')) with check (private.has_permission(establishment_id,'enrollments.manage'));
grant select,insert,update,delete on public.sponsoring_organizations,public.organization_coverage_rules,public.school_families,public.student_family_members,public.family_discount_rules,public.enrollment_discount_snapshots,public.organization_coverage_snapshots to authenticated;

create or replace function public.search_family_sibling_candidates(p_establishment_id uuid,p_search text)
returns table(student_id uuid,first_name text,last_name text,student_number text,birth_date date,class_name text,family_code text)
language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
begin
  if not private.has_permission(p_establishment_id,'students.read') then raise exception 'Permission refusée'; end if;
  if length(trim(coalesce(p_search,'')))<2 then return; end if;
  return query
  select s.id,s.first_name,s.last_name,s.student_number,s.birth_date,sc.name,sf.family_code
  from public.students s
  left join lateral (select c.name from public.enrollments e join public.school_classes c on c.id=e.class_id
    where e.student_id=s.id and e.establishment_id=s.establishment_id and e.status='active' order by e.created_at desc limit 1) sc on true
  left join public.student_family_members sfm on sfm.student_id=s.id and sfm.establishment_id=s.establishment_id and sfm.active=true
  left join public.school_families sf on sf.id=sfm.family_id
  where s.establishment_id=p_establishment_id and s.active=true and s.merged_into_student_id is null
    and (s.first_name ilike '%'||trim(p_search)||'%' or s.last_name ilike '%'||trim(p_search)||'%' or coalesce(s.student_number,'') ilike '%'||trim(p_search)||'%')
  order by s.last_name,s.first_name limit 20;
end $$;
revoke all on function public.search_family_sibling_candidates(uuid,text) from public;
grant execute on function public.search_family_sibling_candidates(uuid,text) to authenticated;

create or replace function public.create_student_enrollment_with_family_funding(
  p_establishment_id uuid,p_academic_year_id uuid,p_class_id uuid,p_tuition_plan_id uuid,p_enrollment_date date,
  p_student_id uuid,p_first_name text,p_last_name text,p_student_number text,p_birth_date date,p_sex text,p_phone text,p_email text,
  p_option_ids uuid[],p_paid_installment_ids uuid[],p_pay_options boolean,p_funding_source text,p_waive_registration boolean,p_waive_tuition boolean,
  p_related_student_id uuid default null,p_sibling_relationship text default 'autre',p_organization_id uuid default null
) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_result jsonb; v_new_student_id uuid; v_enrollment_id uuid; v_family_id uuid; v_related_family_id uuid;
  v_children_count integer:=0; v_rule public.family_discount_rules%rowtype; v_schedule record;
  v_original numeric(12,2); v_discount numeric(12,2); v_net numeric(12,2); v_covered numeric(12,2); v_family_share numeric(12,2);
  v_coverage_rule public.organization_coverage_rules%rowtype; v_grade_level_id uuid;
begin
  if not private.has_permission(p_establishment_id,'enrollments.manage') then raise exception 'Permission refusée'; end if;
  if (p_related_student_id is not null or p_organization_id is not null) and (coalesce(array_length(p_paid_installment_ids,1),0)>0 or coalesce(p_pay_options,false)) then
    raise exception 'Pour appliquer une réduction familiale ou une prise en charge partielle, enregistrez d’abord l’inscription. Les paiements pourront être saisis ensuite dans Finance.';
  end if;
  if p_organization_id is not null and not exists(select 1 from public.sponsoring_organizations o where o.id=p_organization_id and o.establishment_id=p_establishment_id and o.active and not o.is_state) then
    raise exception 'Organisme de prise en charge invalide ou inactif';
  end if;
  v_result:=public.create_student_enrollment_with_funding(
    p_establishment_id,p_academic_year_id,p_class_id,p_tuition_plan_id,p_enrollment_date,p_student_id,p_first_name,p_last_name,
    p_student_number,p_birth_date,p_sex,p_phone,p_email,coalesce(p_option_ids,'{}'::uuid[]),
    case when p_related_student_id is not null or p_organization_id is not null then '{}'::uuid[] else coalesce(p_paid_installment_ids,'{}'::uuid[]) end,
    case when p_related_student_id is not null or p_organization_id is not null then false else coalesce(p_pay_options,false) end,
    case when p_organization_id is not null then 'family' else p_funding_source end,
    case when p_organization_id is not null then false else coalesce(p_waive_registration,false) end,
    case when p_organization_id is not null then false else coalesce(p_waive_tuition,false) end
  );
  v_new_student_id:=(v_result->>'student_id')::uuid; v_enrollment_id:=(v_result->>'enrollment_id')::uuid;

  if p_related_student_id is not null then
    if p_related_student_id=v_new_student_id then raise exception 'Un élève ne peut pas être associé à lui-même'; end if;
    if not exists(select 1 from public.students s where s.id=p_related_student_id and s.establishment_id=p_establishment_id and s.active and s.merged_into_student_id is null) then
      raise exception 'L’élève choisi comme frère ou sœur n’est pas disponible dans cet établissement';
    end if;
    select family_id into v_related_family_id from public.student_family_members where student_id=p_related_student_id and establishment_id=p_establishment_id and active=true limit 1;
    if v_related_family_id is null then
      insert into public.school_families(establishment_id,display_name,created_by) values(p_establishment_id,coalesce(nullif(trim(p_last_name),''),'Famille')||' — famille',auth.uid()) returning id into v_family_id;
      insert into public.student_family_members(establishment_id,family_id,student_id,relationship,active,verified_at,created_by)
      values(p_establishment_id,v_family_id,p_related_student_id,'autre',true,now(),auth.uid());
    else v_family_id:=v_related_family_id; end if;
    if exists(select 1 from public.student_family_members where student_id=v_new_student_id and active=true and family_id<>v_family_id) then raise exception 'Le nouvel élève est déjà rattaché à une autre famille'; end if;
    insert into public.student_family_members(establishment_id,family_id,student_id,relationship,active,verified_at,created_by)
    values(p_establishment_id,v_family_id,v_new_student_id,coalesce(p_sibling_relationship,'autre'),true,now(),auth.uid())
    on conflict(family_id,student_id) do update set active=true,relationship=excluded.relationship,verified_at=now(),updated_at=now();

    select count(distinct sfm.student_id) into v_children_count from public.student_family_members sfm
    join public.enrollments e on e.student_id=sfm.student_id and e.establishment_id=sfm.establishment_id
    where sfm.family_id=v_family_id and sfm.establishment_id=p_establishment_id and sfm.active=true and e.academic_year_id=p_academic_year_id and e.status='active';

    select * into v_rule from public.family_discount_rules r where r.establishment_id=p_establishment_id and r.active
      and (r.academic_year_id is null or r.academic_year_id=p_academic_year_id)
      and r.min_children<=v_children_count and (r.max_children is null or r.max_children>=v_children_count)
      and cardinality(r.applies_to_categories)>0
      and (r.valid_from is null or r.valid_from<=p_enrollment_date) and (r.valid_until is null or r.valid_until>=p_enrollment_date)
    order by r.min_children desc,(r.academic_year_id is not null) desc,r.created_at desc limit 1;

    if v_rule.id is not null then
      for v_schedule in select * from public.payment_schedules ps where ps.enrollment_id=v_enrollment_id and ps.category = any(v_rule.applies_to_categories) and ps.payer_type='family' order by ps.installment_number for update loop
        v_original:=v_schedule.amount_due;
        v_discount:=case when v_rule.discount_type='percentage' then round(v_original*v_rule.discount_value/100,2) else least(v_original,v_rule.discount_value) end;
        v_net:=greatest(v_original-v_discount,0);
        insert into public.enrollment_discount_snapshots(establishment_id,enrollment_id,schedule_id,family_id,rule_id,rule_name,category,discount_type,discount_value,original_amount,discount_amount)
        values(p_establishment_id,v_enrollment_id,v_schedule.id,v_family_id,v_rule.id,v_rule.name,v_schedule.category,v_rule.discount_type,v_rule.discount_value,v_original,v_discount);
        if v_net<=0 then delete from public.payment_schedules where id=v_schedule.id;
        else update public.payment_schedules set amount_due=v_net,updated_at=now() where id=v_schedule.id; end if;
      end loop;
    end if;
  end if;

  if p_organization_id is not null then
    select sc.grade_level_id into v_grade_level_id from public.school_classes sc where sc.id=p_class_id and sc.establishment_id=p_establishment_id;
    for v_schedule in select * from public.payment_schedules ps where ps.enrollment_id=v_enrollment_id and ps.payer_type='family' and ps.amount_due>0 order by ps.installment_number for update loop
      select * into v_coverage_rule from public.organization_coverage_rules r
      where r.establishment_id=p_establishment_id and r.organization_id=p_organization_id and r.category=v_schedule.category and r.active
        and (r.grade_level_id is null or r.grade_level_id=v_grade_level_id) and (r.academic_year_id is null or r.academic_year_id=p_academic_year_id)
        and (r.valid_from is null or r.valid_from<=p_enrollment_date) and (r.valid_until is null or r.valid_until>=p_enrollment_date)
      order by (r.grade_level_id is not null) desc,(r.academic_year_id is not null) desc,r.created_at desc limit 1;
      if v_coverage_rule.id is null or v_coverage_rule.coverage_percent<=0 then continue; end if;
      v_net:=v_schedule.amount_due; v_covered:=round(v_net*v_coverage_rule.coverage_percent/100,2); v_family_share:=greatest(v_net-v_covered,0);
      if v_covered<=0 then continue; end if;
      insert into public.organization_coverage_snapshots(establishment_id,enrollment_id,schedule_id,organization_id,category,coverage_percent,net_amount,organization_amount,family_amount)
      values(p_establishment_id,v_enrollment_id,v_schedule.id,p_organization_id,v_schedule.category,v_coverage_rule.coverage_percent,v_net,v_covered,v_family_share);
      if v_family_share<=0 then update public.payment_schedules set payer_type='other',organization_id=p_organization_id,updated_at=now() where id=v_schedule.id;
      else
        update public.payment_schedules set amount_due=v_family_share,updated_at=now() where id=v_schedule.id;
        insert into public.payment_schedules(enrollment_id,installment_number,label,due_date,amount_due,amount_paid,status,payer_type,category,is_refundable,priority_rank,organization_id)
        values(v_schedule.enrollment_id,v_schedule.installment_number,v_schedule.label,v_schedule.due_date,v_covered,0,'pending','other',v_schedule.category,v_schedule.is_refundable,v_schedule.priority_rank,p_organization_id);
      end if;
    end loop;
    update public.enrollments set funding_source='other' where id=v_enrollment_id;
  end if;

  update public.enrollments e set
    parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0)) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0),
    state_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='state'),0),
    organization_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.organization_id is not null),0)
  where e.id=v_enrollment_id;
  v_result:=v_result||jsonb_build_object('family_id',v_family_id,'family_children_count',v_children_count,'family_discount_rule',case when v_rule.id is null then null else jsonb_build_object('id',v_rule.id,'name',v_rule.name,'type',v_rule.discount_type,'value',v_rule.discount_value) end,'organization_id',p_organization_id);
  return v_result;
end $$;
revoke all on function public.create_student_enrollment_with_family_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid) from public;
grant execute on function public.create_student_enrollment_with_family_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid) to authenticated;

create or replace function public.validate_sequential_payment_allocation()
returns trigger language plpgsql set search_path to 'public','pg_temp' as $$
declare v_current uuid; v_category text; v_due numeric; v_paid numeric; v_payer text; v_org uuid;
begin
  select category,payer_type,organization_id into v_category,v_payer,v_org from public.payment_schedules where id=new.payment_schedule_id;
  if coalesce(v_category,'tuition') not in ('tuition','registration','scolarite') then return new; end if;
  select ps.id into v_current from public.payment_schedules ps
  where ps.enrollment_id=(select enrollment_id from public.payment_schedules where id=new.payment_schedule_id)
    and coalesce(ps.category,'tuition') in ('tuition','registration','scolarite') and ps.payer_type=v_payer
    and coalesce(ps.organization_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(v_org,'00000000-0000-0000-0000-000000000000'::uuid)
    and greatest(coalesce(ps.amount_due,0)-coalesce(ps.amount_paid,0),0)>0
  order by ps.priority_rank nulls last,ps.installment_number,ps.due_date,ps.id limit 1;
  if v_current is not null and v_current<>new.payment_schedule_id then raise exception 'Cette échéance ne peut pas être payée avant la précédente pour ce payeur'; end if;
  select amount_due,amount_paid into v_due,v_paid from public.payment_schedules where id=new.payment_schedule_id;
  if coalesce(v_paid,0)+coalesce(new.amount,0)>coalesce(v_due,0) then raise exception 'Le paiement dépasse le montant restant de l échéance'; end if;
  return new;
end $$;

create or replace function public.create_payment_with_allocations(
  p_enrollment_id uuid,p_amount numeric,p_reference text default null,p_method text default null,p_notes text default null,p_allocations jsonb default '[]'::jsonb
) returns uuid language plpgsql set search_path to 'public','pg_temp' as $$
declare v_payment_id uuid; v_establishment_id uuid; v_allocated numeric:=0; v_schedule_id uuid; v_target uuid;
  v_amount numeric; v_payer text; v_category text; v_refundable boolean; v_org uuid; v_first uuid; v_remaining numeric; v_count integer; r jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select establishment_id into v_establishment_id from public.enrollments where id=p_enrollment_id;
  if v_establishment_id is null then raise exception 'Inscription introuvable'; end if;
  if not private.has_role(v_establishment_id,array['owner','admin','director','accountant']) then raise exception 'Permission insuffisante'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Montant de paiement invalide'; end if;
  if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)=0 then raise exception 'Allocations invalides'; end if;
  select count(*) into v_count from jsonb_array_elements(p_allocations);
  select coalesce(sum((x->>'amount')::numeric),0) into v_allocated from jsonb_array_elements(p_allocations) x;
  if v_allocated<>p_amount then raise exception 'Le total des affectations doit egaler le paiement'; end if;
  if v_count<>1 then raise exception 'Un paiement doit etre affecte a une seule echeance'; end if;
  select (p_allocations->0->>'payment_schedule_id')::uuid into v_target;
  select s.payer_type,s.category,coalesce(s.is_refundable,false),s.organization_id,greatest(coalesce(s.amount_due,0)-coalesce(s.amount_paid,0),0)
    into v_payer,v_category,v_refundable,v_org,v_remaining from public.payment_schedules s where s.id=v_target and s.enrollment_id=p_enrollment_id;
  if v_category is null then raise exception 'Echeance invalide'; end if;
  if v_remaining<=0 or v_allocated>v_remaining then raise exception 'Montant supérieur au reste à payer de l échéance'; end if;
  select s.id into v_first from public.payment_schedules s where s.enrollment_id=p_enrollment_id and s.category in ('registration','tuition','scolarite')
    and s.payer_type=v_payer and coalesce(s.organization_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(v_org,'00000000-0000-0000-0000-000000000000'::uuid)
    and greatest(coalesce(s.amount_due,0)-coalesce(s.amount_paid,0),0)>0
    order by s.priority_rank nulls last,s.installment_number,s.due_date,s.id limit 1;
  if v_first is null then raise exception 'Aucune échéance restante pour ce payeur'; end if;
  if v_target is distinct from v_first then raise exception 'Vous devez d’abord solder l’échéance précédente de ce payeur'; end if;
  insert into public.payments(establishment_id,enrollment_id,amount,reference,method,notes,recorded_by,payer_type,category,is_refundable,organization_id)
  values(v_establishment_id,p_enrollment_id,p_amount,p_reference,p_method,p_notes,auth.uid(),coalesce(v_payer,'family'),coalesce(v_category,'tuition'),v_refundable,v_org) returning id into v_payment_id;
  for r in select * from jsonb_array_elements(p_allocations) loop
    v_schedule_id=(r->>'payment_schedule_id')::uuid; v_amount=(r->>'amount')::numeric;
    if v_amount is null or v_amount<=0 then raise exception 'Montant d affectation invalide'; end if;
    insert into public.payment_allocations(payment_id,payment_schedule_id,amount) values(v_payment_id,v_schedule_id,v_amount);
  end loop;
  return v_payment_id;
end $$;
revoke all on function public.create_payment_with_allocations(uuid,numeric,text,text,text,jsonb) from public;
grant execute on function public.create_payment_with_allocations(uuid,numeric,text,text,text,jsonb) to authenticated;

create or replace function public.refresh_enrollment_payer_totals(p_enrollment_id uuid)
returns void language plpgsql set search_path to 'public','pg_temp' as $$
begin
  update public.enrollments e set
    parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0)) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0),
    state_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='state'),0),
    organization_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.organization_id is not null),0)
  where e.id=p_enrollment_id;
end $$;

create or replace function public.apply_payment_allocation()
returns trigger language plpgsql set search_path to 'public','pg_temp' as $$
declare se uuid; pe uuid; d numeric(12,2); np numeric(12,2);
begin
  select enrollment_id,amount_due into se,d from public.payment_schedules where id=new.payment_schedule_id for update;
  select enrollment_id into pe from public.payments where id=new.payment_id;
  if se<>pe then raise exception 'Le paiement et l échéance doivent appartenir à la même inscription'; end if;
  select amount_paid+new.amount into np from public.payment_schedules where id=new.payment_schedule_id;
  if np>d then raise exception 'Le paiement dépasse le montant restant'; end if;
  update public.payment_schedules set amount_paid=np,status=case when np=d then 'paid'::public.installment_status when np>0 then 'partial'::public.installment_status else 'pending'::public.installment_status end where id=new.payment_schedule_id;
  perform public.refresh_enrollment_payer_totals(se);
  return new;
end $$;

create or replace function public.get_enrollment_financial_summary(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
declare e uuid; result jsonb;
begin
  select establishment_id into e from public.enrollments where id=p_enrollment_id;
  if e is null then raise exception 'Inscription introuvable'; end if;
  if not (private.has_permission(e,'payments.read') or private.has_permission(e,'enrollments.manage') or exists(select 1 from public.student_guardians sg join public.enrollments en on en.student_id=sg.student_id where en.id=p_enrollment_id and sg.guardian_user_id=auth.uid())) then raise exception 'Accès refusé'; end if;
  select jsonb_build_object('total_due',coalesce(sum(amount_due),0),'total_paid',coalesce(sum(amount_paid),0),'remaining',coalesce(sum(amount_due-amount_paid),0),
    'parent_due',coalesce(sum(amount_due-amount_paid) filter(where payer_type='family'),0),
    'state_expected',coalesce(sum(amount_due) filter(where payer_type='state'),0),'state_paid',coalesce(sum(amount_paid) filter(where payer_type='state'),0),
    'organization_expected',coalesce(sum(amount_due) filter(where organization_id is not null),0),'organization_paid',coalesce(sum(amount_paid) filter(where organization_id is not null),0),
    'schedules',coalesce(jsonb_agg(jsonb_build_object('id',id,'number',installment_number,'label',label,'due_date',due_date,'amount_due',amount_due,'amount_paid',amount_paid,'status',status,'payer_type',payer_type,'organization_id',organization_id,'category',category,'is_refundable',is_refundable) order by installment_number),'[]'::jsonb))
  into result from public.payment_schedules where enrollment_id=p_enrollment_id;
  return result;
end $$;

create or replace view public.v_finance_student_payment_board as
select e.id as enrollment_id,e.establishment_id,e.student_id,e.class_id,e.academic_year_id,e.funding_source,e.state_expected_amount,e.parent_payable_amount,
  ps.id as schedule_id,ps.installment_number,ps.label,ps.due_date,ps.amount_due,ps.amount_paid,greatest(ps.amount_due-ps.amount_paid,0::numeric) as remaining_amount,ps.status,
  case when ps.status='paid' then 'paid'::text when ps.amount_paid>0 then case when current_date>ps.due_date then 'partial_late'::text else 'partial'::text end when current_date>ps.due_date then 'late'::text else 'pending'::text end as payment_state,
  current_date-ps.due_date as days_overdue,ps.category,s.first_name,s.last_name,s.student_number,c.name as class_name
from public.enrollments e join public.payment_schedules ps on ps.enrollment_id=e.id
join public.students s on s.id=e.student_id join public.school_classes c on c.id=e.class_id
where ps.payer_type='family';

create or replace view public.v_finance_organization_coverage_board with (security_invoker=true) as
select e.id as enrollment_id,e.establishment_id,e.student_id,e.class_id,e.academic_year_id,e.funding_source,e.state_expected_amount,e.parent_payable_amount,
  ps.id as schedule_id,ps.installment_number,ps.label,ps.due_date,ps.amount_due,ps.amount_paid,greatest(ps.amount_due-ps.amount_paid,0::numeric) as remaining_amount,ps.status,
  case when ps.status='paid' then 'paid'::text when ps.amount_paid>0 then case when current_date>ps.due_date then 'partial_late'::text else 'partial'::text end when current_date>ps.due_date then 'late'::text else 'pending'::text end as payment_state,
  current_date-ps.due_date as days_overdue,ps.category,ps.payer_type,ps.organization_id,o.name as organization_name,s.first_name,s.last_name,s.student_number,c.name as class_name
from public.enrollments e join public.payment_schedules ps on ps.enrollment_id=e.id
join public.students s on s.id=e.student_id join public.school_classes c on c.id=e.class_id
join public.sponsoring_organizations o on o.id=ps.organization_id where ps.organization_id is not null and ps.payer_type='other';
grant select on public.v_finance_organization_coverage_board to authenticated;

create or replace function private.notify_parent_on_payment_schedule()
returns trigger language plpgsql set search_path to 'public','private' as $$
declare v_student_id uuid; v_student_name text; v_status text; v_title text; v_body text;
begin
  if coalesce(new.payer_type,'family')<>'family' then return new; end if;
  v_status:=lower(coalesce(new.status::text,''));
  if v_status<>'late' and not (new.due_date<current_date and coalesce(new.amount_paid,0)<coalesce(new.amount_due,0)) then return new; end if;
  select e.student_id,trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) into v_student_id,v_student_name from public.enrollments e join public.students s on s.id=e.student_id where e.id=new.enrollment_id limit 1;
  if v_student_id is null then return new; end if;
  v_title:='Paiement en retard';
  v_body:=format('%s a une échéance en retard : %s. Montant restant : %s FCFA.',nullif(v_student_name,''),coalesce(new.label,'Échéance scolaire'),to_char(greatest(coalesce(new.amount_due,0)-coalesce(new.amount_paid,0),0),'FM999G999G999'));
  insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
  select distinct en.establishment_id,sg.guardian_user_id,'payment_overdue',v_title,v_body,'payment_schedule',new.id
  from public.enrollments en join public.student_guardians sg on sg.student_id=en.student_id and sg.establishment_id=en.establishment_id and sg.active=true
  where en.id=new.enrollment_id and not exists(select 1 from public.notifications n where n.recipient_user_id=sg.guardian_user_id and n.entity_type='payment_schedule' and n.entity_id=new.id and n.type='payment_overdue');
  return new;
end $$;
