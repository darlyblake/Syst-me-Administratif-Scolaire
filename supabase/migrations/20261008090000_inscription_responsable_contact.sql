alter table public.students
  add column if not exists guardian_first_name text,
  add column if not exists guardian_last_name text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_email text,
  add column if not exists guardian_address text,
  add column if not exists guardian_relationship text;

create or replace function public.save_student_guardian_contact(
  p_establishment_id uuid, p_student_id uuid,
  p_parent_first_name text default null, p_parent_last_name text default null,
  p_parent_phone text default null, p_parent_email text default null,
  p_parent_address text default null, p_relationship text default 'Parent'
) returns void
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_guardian_user_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id,'enrollments.manage')
     and not private.has_permission(p_establishment_id,'students.manage') then
    raise exception 'Permission refusee';
  end if;
  update public.students
  set guardian_first_name=nullif(trim(p_parent_first_name),''),
      guardian_last_name=nullif(trim(p_parent_last_name),''),
      guardian_phone=nullif(trim(p_parent_phone),''),
      guardian_email=nullif(trim(p_parent_email),''),
      guardian_address=nullif(trim(p_parent_address),''),
      guardian_relationship=nullif(trim(p_relationship),'Parent')
  where id=p_student_id and establishment_id=p_establishment_id;
  if not found then raise exception 'Eleve introuvable ou hors etablissement'; end if;
  select sg.guardian_user_id into v_guardian_user_id
  from public.student_guardians sg
  where sg.student_id=p_student_id and sg.establishment_id=p_establishment_id and sg.active=true
  order by sg.is_primary desc nulls last,sg.created_at limit 1;
  if v_guardian_user_id is not null then
    update public.profiles
    set first_name=coalesce(nullif(trim(p_parent_first_name),''),first_name),
        last_name=coalesce(nullif(trim(p_parent_last_name),''),last_name),
        phone=coalesce(nullif(trim(p_parent_phone),''),phone),updated_at=now()
    where id=v_guardian_user_id;
  end if;
end;
$$;