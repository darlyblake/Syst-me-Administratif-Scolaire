-- Multi-establishment teacher identity and affiliation workflow
-- Applied to Supabase project gestion scolaire.

alter table public.teachers alter column establishment_id drop not null;

alter table public.teacher_establishments drop constraint if exists teacher_establishments_teacher_id_establishment_id_key;
alter table public.teacher_establishments
  add constraint teacher_establishments_teacher_id_establishment_id_key
  unique (teacher_id, establishment_id);

create table if not exists public.teacher_establishment_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, establishment_id)
);

alter table public.teacher_establishment_requests enable row level security;

drop policy if exists "teacher establishment requests select" on public.teacher_establishment_requests;
create policy "teacher establishment requests select"
on public.teacher_establishment_requests
for select to authenticated
using (
  requested_by = auth.uid()
  or exists (
    select 1 from public.teachers t
    where t.id = teacher_establishment_requests.teacher_id
      and t.profile_id = auth.uid()
  )
  or private.has_role(establishment_id, array['owner','admin','director'])
);

drop policy if exists "teacher establishment requests insert" on public.teacher_establishment_requests;
create policy "teacher establishment requests insert"
on public.teacher_establishment_requests
for insert to authenticated
with check (
  requested_by = auth.uid()
  and exists (
    select 1 from public.teachers t
    where t.id = teacher_establishment_requests.teacher_id
      and t.profile_id = auth.uid()
      and t.active = true
  )
);

drop policy if exists "teacher establishment requests admin update" on public.teacher_establishment_requests;
create policy "teacher establishment requests admin update"
on public.teacher_establishment_requests
for update to authenticated
using (private.has_role(establishment_id, array['owner','admin','director']))
with check (private.has_role(establishment_id, array['owner','admin','director']));

create index if not exists teacher_establishment_requests_establishment_status_idx
  on public.teacher_establishment_requests(establishment_id,status);
create index if not exists teacher_establishment_requests_teacher_idx
  on public.teacher_establishment_requests(teacher_id);

create or replace function public.teacher_create_profile(
  p_first_name text, p_last_name text, p_phone text default null,
  p_email text default null, p_employee_number text default null,
  p_specialty text default null
) returns uuid
language plpgsql security invoker set search_path = public
as $function$
declare
  v_teacher_id uuid;
  v_profile_id uuid := auth.uid();
begin
  if v_profile_id is null then raise exception 'Authentication required'; end if;

  select id into v_teacher_id from public.teachers
  where profile_id = v_profile_id order by created_at limit 1;

  if v_teacher_id is not null then
    update public.teachers
    set first_name=trim(p_first_name), last_name=trim(p_last_name),
        phone=nullif(trim(p_phone),''), email=nullif(trim(p_email),''),
        employee_number=nullif(trim(p_employee_number),''),
        specialty=nullif(trim(p_specialty),''), active=true, updated_at=now()
    where id=v_teacher_id;
    return v_teacher_id;
  end if;

  insert into public.teachers
    (profile_id,establishment_id,employee_number,first_name,last_name,phone,email,specialty,active)
  values
    (v_profile_id,null,nullif(trim(p_employee_number),''),trim(p_first_name),
     trim(p_last_name),nullif(trim(p_phone),''),nullif(trim(p_email),''),
     nullif(trim(p_specialty),''),true)
  returning id into v_teacher_id;

  return v_teacher_id;
end;
$function$;

create or replace function public.teacher_request_establishment(
  p_establishment_id uuid, p_teacher_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = public
as $function$
declare
  v_teacher_id uuid;
  v_request_id uuid;
begin
  select t.id into v_teacher_id from public.teachers t
  where t.profile_id=auth.uid() and t.active=true
    and (p_teacher_id is null or t.id=p_teacher_id)
  order by t.created_at limit 1;

  if v_teacher_id is null then raise exception 'Teacher profile not found'; end if;
  if not exists (select 1 from public.establishments e where e.id=p_establishment_id)
    then raise exception 'Establishment not found'; end if;

  if exists (
    select 1 from public.teacher_establishments te
    where te.teacher_id=v_teacher_id and te.establishment_id=p_establishment_id
      and te.status='active'
  ) then raise exception 'Teacher is already attached to this establishment'; end if;

  insert into public.teacher_establishment_requests(teacher_id,establishment_id,requested_by)
  values(v_teacher_id,p_establishment_id,auth.uid())
  on conflict(teacher_id,establishment_id) do update set
    status='pending', requested_by=excluded.requested_by, reviewed_by=null,
    reviewed_at=null, review_note=null, updated_at=now()
  returning id into v_request_id;

  return v_request_id;
end;
$function$;

create or replace function public.approve_teacher_establishment_request(
  p_request_id uuid, p_note text default null
) returns uuid
language plpgsql security invoker set search_path = public
as $function$
declare
  v_request public.teacher_establishment_requests%rowtype;
  v_link_id uuid;
begin
  select * into v_request from public.teacher_establishment_requests
  where id=p_request_id for update;

  if not found then raise exception 'Request not found'; end if;
  if not private.has_role(v_request.establishment_id,array['owner','admin','director'])
    then raise exception 'Not authorized'; end if;

  insert into public.teacher_establishments(teacher_id,establishment_id,status,joined_at)
  values(v_request.teacher_id,v_request.establishment_id,'active',now())
  on conflict(teacher_id,establishment_id) do update set
    status='active', joined_at=coalesce(public.teacher_establishments.joined_at,now()),
    updated_at=now()
  returning id into v_link_id;

  update public.teacher_establishment_requests
  set status='approved', reviewed_by=auth.uid(), reviewed_at=now(),
      review_note=p_note, updated_at=now()
  where id=p_request_id;

  return v_link_id;
end;
$function$;

create or replace function public.reject_teacher_establishment_request(
  p_request_id uuid, p_note text default null
) returns void
language plpgsql security invoker set search_path = public
as $function$
declare v_establishment_id uuid;
begin
  select establishment_id into v_establishment_id
  from public.teacher_establishment_requests where id=p_request_id;
  if v_establishment_id is null then raise exception 'Request not found'; end if;
  if not private.has_role(v_establishment_id,array['owner','admin','director'])
    then raise exception 'Not authorized'; end if;

  update public.teacher_establishment_requests
  set status='rejected', reviewed_by=auth.uid(), reviewed_at=now(),
      review_note=p_note, updated_at=now()
  where id=p_request_id;
end;
$function$;

grant execute on function public.teacher_create_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.teacher_request_establishment(uuid,uuid) to authenticated;
grant execute on function public.approve_teacher_establishment_request(uuid,text) to authenticated;
grant execute on function public.reject_teacher_establishment_request(uuid,text) to authenticated;

drop policy if exists "teachers_manage" on public.teachers;
drop policy if exists "teachers_member" on public.teachers;
create policy "teachers_admin_manage" on public.teachers for all to authenticated
using (
  exists (select 1 from public.teacher_establishments te
          where te.teacher_id=teachers.id
            and private.has_role(te.establishment_id,array['owner','admin','director']))
  or (teachers.establishment_id is not null
      and private.has_role(teachers.establishment_id,array['owner','admin','director']))
)
with check (
  exists (select 1 from public.teacher_establishments te
          where te.teacher_id=teachers.id
            and private.has_role(te.establishment_id,array['owner','admin','director']))
  or (teachers.establishment_id is not null
      and private.has_role(teachers.establishment_id,array['owner','admin','director']))
);

create policy "teachers_self_select" on public.teachers
for select to authenticated using (profile_id=auth.uid());

create policy "teachers_self_insert" on public.teachers
for insert to authenticated
with check (profile_id=auth.uid() and establishment_id is null);

create policy "teachers_self_update" on public.teachers
for update to authenticated
using (profile_id=auth.uid())
with check (profile_id=auth.uid() and establishment_id is null);

drop policy if exists "teacher_establishments_manage" on public.teacher_establishments;
drop policy if exists "teacher_establishments_select" on public.teacher_establishments;

create policy "teacher_establishments_admin_manage" on public.teacher_establishments
for all to authenticated
using (private.has_role(establishment_id,array['owner','admin','director']))
with check (private.has_role(establishment_id,array['owner','admin','director']));

create policy "teacher_establishments_self_select" on public.teacher_establishments
for select to authenticated
using (exists (select 1 from public.teachers t
              where t.id=teacher_establishments.teacher_id and t.profile_id=auth.uid()));

create index if not exists teacher_establishments_establishment_status_idx
  on public.teacher_establishments(establishment_id,status);
create index if not exists teacher_establishments_teacher_status_idx
  on public.teacher_establishments(teacher_id,status);
