drop function if exists public.pointage_upsert_settings(uuid,uuid,integer,integer,numeric,numeric,boolean,boolean,integer,boolean,boolean,boolean);
create or replace function public.pointage_upsert_settings(
  p_establishment_id uuid,p_academic_year_id uuid,p_early_arrival_tolerance_minutes integer default 15,
  p_full_credit_threshold_minutes integer default 40,p_full_credit_hours numeric default 2,p_partial_credit_hours numeric default 1,
  p_allow_teacher_close boolean default true,p_require_admin_closure_after_schedule_end boolean default true,
  p_alert_missing_lesson_after_minutes integer default 10,p_alerts_enabled boolean default true,p_code_enabled boolean default true,p_qr_enabled boolean default true,
  p_work_start_time time default '07:00',p_work_end_time time default '15:00',p_work_days smallint[] default '{1,2,3,4,5}'
)
returns uuid language plpgsql set search_path=''
as $$
declare v_id uuid;
begin
  if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
  insert into public.pointage_settings(
    establishment_id,academic_year_id,early_arrival_tolerance_minutes,full_credit_threshold_minutes,full_credit_hours,partial_credit_hours,
    allow_teacher_close,require_admin_closure_after_schedule_end,alert_missing_lesson_after_minutes,alerts_enabled,code_enabled,qr_enabled,
    work_start_time,work_end_time,work_days,updated_at
  ) values(
    p_establishment_id,p_academic_year_id,p_early_arrival_tolerance_minutes,p_full_credit_threshold_minutes,p_full_credit_hours,p_partial_credit_hours,
    p_allow_teacher_close,p_require_admin_closure_after_schedule_end,p_alert_missing_lesson_after_minutes,p_alerts_enabled,p_code_enabled,p_qr_enabled,
    p_work_start_time,p_work_end_time,p_work_days,now()
  )
  on conflict(establishment_id,academic_year_id) do update set
    early_arrival_tolerance_minutes=excluded.early_arrival_tolerance_minutes,full_credit_threshold_minutes=excluded.full_credit_threshold_minutes,
    full_credit_hours=excluded.full_credit_hours,partial_credit_hours=excluded.partial_credit_hours,allow_teacher_close=excluded.allow_teacher_close,
    require_admin_closure_after_schedule_end=excluded.require_admin_closure_after_schedule_end,
    alert_missing_lesson_after_minutes=excluded.alert_missing_lesson_after_minutes,alerts_enabled=excluded.alerts_enabled,
    code_enabled=excluded.code_enabled,qr_enabled=excluded.qr_enabled,work_start_time=excluded.work_start_time,
    work_end_time=excluded.work_end_time,work_days=excluded.work_days,updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;
revoke execute on function public.pointage_upsert_settings(uuid,uuid,integer,integer,numeric,numeric,boolean,boolean,integer,boolean,boolean,boolean,time,time,smallint[]) from public;
grant execute on function public.pointage_upsert_settings(uuid,uuid,integer,integer,numeric,numeric,boolean,boolean,integer,boolean,boolean,boolean,time,time,smallint[]) to authenticated;

create or replace function public.pointage_ensure_access_codes(p_establishment_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare v_count integer:=0;v_code text;v_digest text;r record;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
  for r in
    select 'staff'::text staff_type,s.id staff_id from public.staff_members s where s.establishment_id=p_establishment_id and s.active=true
    union all
    select 'teacher'::text,te.teacher_id from public.teacher_establishments te join public.teachers t on t.id=te.teacher_id and t.active=true
    where te.establishment_id=p_establishment_id and te.status='active'
  loop
    if not exists(select 1 from public.pointage_access_codes c where c.establishment_id=p_establishment_id and c.staff_type=r.staff_type and c.staff_id=r.staff_id and c.active=true) then
      v_code:=upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8));
      v_digest:=encode(extensions.digest(v_code,'sha256'),'hex');
      while exists(select 1 from public.pointage_access_codes c where c.establishment_id=p_establishment_id and c.code_digest=v_digest) loop
        v_code:=upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8));
        v_digest:=encode(extensions.digest(v_code,'sha256'),'hex');
      end loop;
      insert into public.pointage_access_codes(establishment_id,staff_type,staff_id,code_digest,code_hash,code_last4,created_by)
      values(p_establishment_id,r.staff_type,r.staff_id,v_digest,extensions.crypt(v_code,extensions.gen_salt('bf',10)),right(v_code,4),(select auth.uid()))
      on conflict(establishment_id,staff_type,staff_id) do update set active=true,revoked_at=null;
      v_count:=v_count+1;
    end if;
  end loop;
  return v_count;
end; $$;
revoke execute on function public.pointage_ensure_access_codes(uuid) from public;
grant execute on function public.pointage_ensure_access_codes(uuid) to authenticated;
