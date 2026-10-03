create or replace function private.pointage_issue_code_on_person_created(p_establishment_id uuid,p_staff_type text,p_staff_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare v_code text;v_digest text;
begin
  if p_establishment_id is null or p_staff_id is null then return; end if;
  if exists(select 1 from public.pointage_access_codes c where c.establishment_id=p_establishment_id and c.staff_type=p_staff_type and c.staff_id=p_staff_id and c.active=true) then return; end if;
  v_code:=upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8));
  v_digest:=encode(extensions.digest(v_code,'sha256'),'hex');
  while exists(select 1 from public.pointage_access_codes c where c.establishment_id=p_establishment_id and c.code_digest=v_digest) loop
    v_code:=upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8));
    v_digest:=encode(extensions.digest(v_code,'sha256'),'hex');
  end loop;
  insert into public.pointage_access_codes(establishment_id,staff_type,staff_id,code_digest,code_hash,code_last4,created_by,active,revoked_at)
  values(p_establishment_id,p_staff_type,p_staff_id,v_digest,extensions.crypt(v_code,extensions.gen_salt('bf',10)),right(v_code,4),null,true,null)
  on conflict(establishment_id,staff_type,staff_id) do update set active=true,revoked_at=null;
end;
$$;

create or replace function private.issue_pointage_code_after_person_insert()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if tg_table_name='staff_members' and new.active=true then
    perform private.pointage_issue_code_on_person_created(new.establishment_id,'staff',new.id);
  elsif tg_table_name='teacher_establishments' and new.status='active' then
    perform private.pointage_issue_code_on_person_created(new.establishment_id,'teacher',new.teacher_id);
  end if;
  return new;
end;
$$;

revoke execute on function private.pointage_issue_code_on_person_created(uuid,text,uuid) from public,authenticated,anon;
revoke execute on function private.issue_pointage_code_after_person_insert() from public,authenticated,anon;

drop trigger if exists trg_pointage_code_after_staff_insert on public.staff_members;
create trigger trg_pointage_code_after_staff_insert after insert on public.staff_members
for each row execute function private.issue_pointage_code_after_person_insert();

drop trigger if exists trg_pointage_code_after_teacher_establishment_insert on public.teacher_establishments;
create trigger trg_pointage_code_after_teacher_establishment_insert after insert on public.teacher_establishments
for each row execute function private.issue_pointage_code_after_person_insert();
