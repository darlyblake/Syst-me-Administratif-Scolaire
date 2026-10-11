-- Tighten the finance view and add indexes for the new family/funding relations.
create or replace view public.v_finance_student_payment_board with (security_invoker=true) as
select e.id as enrollment_id,e.establishment_id,e.student_id,e.class_id,e.academic_year_id,e.funding_source,e.state_expected_amount,e.parent_payable_amount,
  ps.id as schedule_id,ps.installment_number,ps.label,ps.due_date,ps.amount_due,ps.amount_paid,greatest(ps.amount_due-ps.amount_paid,0::numeric) as remaining_amount,ps.status,
  case when ps.status='paid' then 'paid'::text when ps.amount_paid>0 then case when current_date>ps.due_date then 'partial_late'::text else 'partial'::text end when current_date>ps.due_date then 'late'::text else 'pending'::text end as payment_state,
  current_date-ps.due_date as days_overdue,ps.category,s.first_name,s.last_name,s.student_number,c.name as class_name
from public.enrollments e
join public.payment_schedules ps on ps.enrollment_id=e.id
join public.students s on s.id=e.student_id
join public.school_classes c on c.id=e.class_id
where ps.payer_type='family';
revoke all on table public.v_finance_student_payment_board from anon, public;
grant select on table public.v_finance_student_payment_board to authenticated;
revoke all on table public.v_finance_organization_coverage_board from anon, public;
grant select on table public.v_finance_organization_coverage_board to authenticated;

revoke all on function public.create_student_enrollment_with_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean) from anon, public;
grant execute on function public.create_student_enrollment_with_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean) to authenticated;

drop policy if exists sponsoring_org_guardian_read on public.sponsoring_organizations;
create policy sponsoring_org_guardian_read on public.sponsoring_organizations for select to authenticated using (
  exists (
    select 1 from public.payment_schedules ps
    join public.enrollments e on e.id=ps.enrollment_id
    join public.student_guardians sg on sg.student_id=e.student_id and sg.establishment_id=e.establishment_id
    where ps.organization_id=sponsoring_organizations.id
      and sg.guardian_user_id=auth.uid() and sg.active=true and sg.can_view_finance=true
  )
);

create index if not exists sponsoring_organizations_created_by_idx on public.sponsoring_organizations(created_by);
create index if not exists organization_coverage_rules_organization_id_idx on public.organization_coverage_rules(organization_id);
create index if not exists school_families_created_by_idx on public.school_families(created_by);
create index if not exists student_family_members_student_id_idx on public.student_family_members(student_id);
create index if not exists student_family_members_created_by_idx on public.student_family_members(created_by);
create index if not exists family_discount_rules_created_by_idx on public.family_discount_rules(created_by);
create index if not exists enrollment_discount_snapshots_establishment_id_idx on public.enrollment_discount_snapshots(establishment_id);
create index if not exists enrollment_discount_snapshots_family_id_idx on public.enrollment_discount_snapshots(family_id);
create index if not exists enrollment_discount_snapshots_rule_id_idx on public.enrollment_discount_snapshots(rule_id);
create index if not exists enrollment_discount_snapshots_schedule_id_idx on public.enrollment_discount_snapshots(schedule_id);
create index if not exists organization_coverage_snapshots_establishment_id_idx on public.organization_coverage_snapshots(establishment_id);
create index if not exists organization_coverage_snapshots_organization_id_idx on public.organization_coverage_snapshots(organization_id);
create index if not exists organization_coverage_snapshots_schedule_id_idx on public.organization_coverage_snapshots(schedule_id);
create index if not exists payment_schedules_organization_id_idx on public.payment_schedules(organization_id);
create index if not exists payments_organization_id_idx on public.payments(organization_id);
