-- Parent absence justifications: request-only workflow.
-- Parents may create a request only for an absence belonging to an active guardian link.
-- School staff remain responsible for validating/rejecting the request.

create table if not exists public.attendance_justification_requests (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_attendance_justification_open
  on public.attendance_justification_requests(attendance_id, parent_user_id)
  where status = 'pending';

create index if not exists idx_attendance_justification_parent_created
  on public.attendance_justification_requests(parent_user_id, created_at desc);

create index if not exists idx_attendance_justification_establishment_status
  on public.attendance_justification_requests(establishment_id, status, created_at desc);

alter table public.attendance_justification_requests enable row level security;

drop policy if exists "Parents view own attendance justification requests" on public.attendance_justification_requests;
create policy "Parents view own attendance justification requests"
on public.attendance_justification_requests
for select to authenticated
using (parent_user_id = (select auth.uid()));

drop policy if exists "Parents create linked attendance justification requests" on public.attendance_justification_requests;
create policy "Parents create linked attendance justification requests"
on public.attendance_justification_requests
for insert to authenticated
with check (
  parent_user_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.attendance_records ar
    join public.student_guardians sg on sg.student_id = ar.student_id and sg.establishment_id = ar.establishment_id
    where ar.id = attendance_justification_requests.attendance_id
      and ar.student_id = attendance_justification_requests.student_id
      and ar.establishment_id = attendance_justification_requests.establishment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true and sg.can_view_academic = true
  )
);

drop policy if exists "Parents cancel own pending attendance justification requests" on public.attendance_justification_requests;
create policy "Parents cancel own pending attendance justification requests"
on public.attendance_justification_requests
for update to authenticated
using (parent_user_id = (select auth.uid()) and status = 'pending')
with check (
  parent_user_id = (select auth.uid())
  and status = 'cancelled'
  and reviewed_by is null and reviewed_at is null
);

drop policy if exists "School members manage attendance justification requests" on public.attendance_justification_requests;
create policy "School members manage attendance justification requests"
on public.attendance_justification_requests
for all to authenticated
using (
  private.is_member(establishment_id)
  and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member') <> 'parent'
)
with check (
  private.is_member(establishment_id)
  and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member') <> 'parent'
);

revoke all on public.attendance_justification_requests from anon;
grant select, insert, update on public.attendance_justification_requests to authenticated;