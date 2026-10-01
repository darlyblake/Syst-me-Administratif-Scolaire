-- Harden teacher self-registration and establishment attachment approval
create or replace function public.teacher_create_profile(
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_employee_number text default null,
  p_specialty text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_teacher_id uuid;
  v_profile_id uuid := auth.uid();
begin
  if v_profile_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = v_profile_id and account_type = 'teacher') then
    raise exception 'Teacher account required';
  end if;

  select id into v_teacher_id from public.teachers
  where profile_id = v_profile_id order by created_at limit 1;

  if v_teacher_id is not null then
    update public.teachers
    set first_name = trim(p_first_name), last_name = trim(p_last_name),
        phone = nullif(trim(p_phone), ''), email = nullif(trim(p_email), ''),
        employee_number = nullif(trim(p_employee_number), ''),
        specialty = nullif(trim(p_specialty), ''), active = true,
        establishment_id = null, updated_at = now()
    where id = v_teacher_id;
    return v_teacher_id;
  end if;

  insert into public.teachers (
    profile_id, establishment_id, employee_number, first_name, last_name,
    phone, email, specialty, active
  ) values (
    v_profile_id, null, nullif(trim(p_employee_number), ''), trim(p_first_name),
    trim(p_last_name), nullif(trim(p_phone), ''), nullif(trim(p_email), ''),
    nullif(trim(p_specialty), ''), true
  ) returning id into v_teacher_id;

  return v_teacher_id;
end;
$function$;

revoke all on function public.teacher_create_profile(text,text,text,text,text,text) from public;
grant execute on function public.teacher_create_profile(text,text,text,text,text,text) to authenticated;

create or replace function public.approve_teacher_establishment_request(
  p_request_id uuid, p_note text default null
) returns uuid
language plpgsql
security invoker
set search_path = public, private
as $function$
declare
  v_request public.teacher_establishment_requests%rowtype;
  v_teacher_profile_id uuid;
  v_link_id uuid;
  v_role_id uuid;
begin
  select * into v_request from public.teacher_establishment_requests
  where id = p_request_id for update;

  if not found then raise exception 'Request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'Request is not pending'; end if;
  if not private.has_role(v_request.establishment_id, array['owner','admin','director']) then
    raise exception 'Not authorized';
  end if;

  select t.profile_id into v_teacher_profile_id from public.teachers t
  where t.id = v_request.teacher_id and t.active = true;
  if v_teacher_profile_id is null then raise exception 'Teacher profile not found'; end if;

  select id into v_role_id from public.establishment_roles
  where establishment_id = v_request.establishment_id and active = true
    and lower(name) in ('enseignant','teacher')
  order by case when lower(name) = 'enseignant' then 0 else 1 end limit 1;

  insert into public.teacher_establishments (teacher_id, establishment_id, status, joined_at)
  values (v_request.teacher_id, v_request.establishment_id, 'active', now())
  on conflict (teacher_id, establishment_id) do update set
    status = 'active',
    joined_at = coalesce(public.teacher_establishments.joined_at, now()),
    updated_at = now()
  returning id into v_link_id;

  insert into public.establishment_members (establishment_id, user_id, role, active, role_id)
  values (v_request.establishment_id, v_teacher_profile_id, 'teacher', true, v_role_id)
  on conflict (establishment_id, user_id) do update set
    role = 'teacher', active = true,
    role_id = coalesce(excluded.role_id, public.establishment_members.role_id),
    updated_at = now();

  update public.teacher_establishment_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = p_note, updated_at = now()
  where id = p_request_id;

  return v_link_id;
end;
$function$;

revoke all on function public.approve_teacher_establishment_request(uuid,text) from public;
grant execute on function public.approve_teacher_establishment_request(uuid,text) to authenticated;

create or replace function public.reject_teacher_establishment_request(
  p_request_id uuid, p_note text default null
) returns void
language plpgsql
security invoker
set search_path = public, private
as $function$
declare v_establishment_id uuid;
begin
  select establishment_id into v_establishment_id
  from public.teacher_establishment_requests where id = p_request_id;

  if v_establishment_id is null then raise exception 'Request not found'; end if;
  if not private.has_role(v_establishment_id, array['owner','admin','director']) then
    raise exception 'Not authorized';
  end if;

  update public.teacher_establishment_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = p_note, updated_at = now()
  where id = p_request_id and status = 'pending';

  if not found then raise exception 'Request is not pending'; end if;
end;
$function$;

revoke all on function public.reject_teacher_establishment_request(uuid,text) from public;
grant execute on function public.reject_teacher_establishment_request(uuid,text) to authenticated;
