alter function public.pointage_get_alerts(uuid,date) set search_path = '';

create or replace function public.pointage_close_lesson_admin(
  p_attendance_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.teacher_lesson_attendance%rowtype;
  v_now_local time;
  v_timezone text;
  v_duration integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  select tla.* into v_row from public.teacher_lesson_attendance tla where tla.id=p_attendance_id for update;
  if v_row.id is null then raise exception 'Cours introuvable'; end if;
  if not private.has_permission(v_row.establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
  if v_row.status not in ('in_progress','scheduled') then raise exception 'Ce cours est déjà clôturé'; end if;
  select e.timezone into v_timezone from public.establishments e where e.id=v_row.establishment_id;
  v_now_local := (now() at time zone v_timezone)::time;
  v_duration := case when v_row.started_time is null then null else greatest(0,round(extract(epoch from (v_now_local-v_row.started_time))/60)::integer) end;
  update public.teacher_lesson_attendance
  set ended_time=v_now_local, actual_duration_minutes=v_duration, end_method='admin',
      closed_by=(select auth.uid()), closure_reason=nullif(trim(p_reason),''), status='completed', updated_at=now()
  where id=v_row.id;
  return jsonb_build_object('attendance_id',v_row.id,'ended_time',v_now_local,'actual_duration_minutes',v_duration,'status','completed');
end;
$$;

revoke execute on function public.pointage_close_lesson_admin(uuid,text) from public, anon;
grant execute on function public.pointage_close_lesson_admin(uuid,text) to authenticated;

create or replace function public.pointage_upsert_settings(
  p_establishment_id uuid,
  p_academic_year_id uuid,
  p_early_arrival_tolerance_minutes integer default 15,
  p_full_credit_threshold_minutes integer default 40,
  p_full_credit_hours numeric default 2,
  p_partial_credit_hours numeric default 1,
  p_allow_teacher_close boolean default true,
  p_require_admin_closure_after_schedule_end boolean default true,
  p_alert_missing_lesson_after_minutes integer default 10,
  p_alerts_enabled boolean default true,
  p_code_enabled boolean default true,
  p_qr_enabled boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid;
begin
  if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
  insert into public.pointage_settings(
    establishment_id,academic_year_id,early_arrival_tolerance_minutes,full_credit_threshold_minutes,
    full_credit_hours,partial_credit_hours,allow_teacher_close,require_admin_closure_after_schedule_end,
    alert_missing_lesson_after_minutes,alerts_enabled,code_enabled,qr_enabled,updated_at
  )
  values(
    p_establishment_id,p_academic_year_id,p_early_arrival_tolerance_minutes,p_full_credit_threshold_minutes,
    p_full_credit_hours,p_partial_credit_hours,p_allow_teacher_close,p_require_admin_closure_after_schedule_end,
    p_alert_missing_lesson_after_minutes,p_alerts_enabled,p_code_enabled,p_qr_enabled,now()
  )
  on conflict(establishment_id,academic_year_id) do update set
    early_arrival_tolerance_minutes=excluded.early_arrival_tolerance_minutes,
    full_credit_threshold_minutes=excluded.full_credit_threshold_minutes,
    full_credit_hours=excluded.full_credit_hours,
    partial_credit_hours=excluded.partial_credit_hours,
    allow_teacher_close=excluded.allow_teacher_close,
    require_admin_closure_after_schedule_end=excluded.require_admin_closure_after_schedule_end,
    alert_missing_lesson_after_minutes=excluded.alert_missing_lesson_after_minutes,
    alerts_enabled=excluded.alerts_enabled, code_enabled=excluded.code_enabled, qr_enabled=excluded.qr_enabled, updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.pointage_upsert_settings(uuid,uuid,integer,integer,numeric,numeric,boolean,boolean,integer,boolean,boolean,boolean) from public, anon;
grant execute on function public.pointage_upsert_settings(uuid,uuid,integer,integer,numeric,numeric,boolean,boolean,integer,boolean,boolean,boolean) to authenticated;
