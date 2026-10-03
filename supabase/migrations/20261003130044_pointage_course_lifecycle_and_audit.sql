-- Pointage v2: automatic course resolution, safe lifecycle, audit history and persistent alerts.

create table if not exists public.pointage_event_history (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  staff_type text not null check (staff_type in ('teacher','staff')),
  staff_id uuid not null,
  event_type text not null check (event_type in ('arrival','departure','course_start','course_end')),
  event_time timestamptz not null default now(),
  method text not null check (method in ('code','qr','admin','automatic')),
  attendance_id uuid null references public.teacher_lesson_attendance(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pointage_event_history_establishment_time_idx on public.pointage_event_history(establishment_id,event_time desc);
create index if not exists pointage_event_history_staff_time_idx on public.pointage_event_history(staff_type,staff_id,event_time desc);
alter table public.pointage_event_history enable row level security;
drop policy if exists pointage_event_history_manager on public.pointage_event_history;
create policy pointage_event_history_manager on public.pointage_event_history for all to authenticated using (private.has_permission(establishment_id,'attendance.manage')) with check (private.has_permission(establishment_id,'attendance.manage'));

create or replace function public.pointage_find_current_lesson(p_teacher_id uuid,p_establishment_id uuid,p_now timestamptz default now())
returns table(timetable_slot_id uuid,academic_year_id uuid,class_id uuid,subject_id uuid,scheduled_start time,scheduled_end time,late_minutes integer)
language plpgsql stable security definer set search_path to ''
as $function$
declare v_timezone text; v_local timestamp; v_date date; v_time time; v_day integer; v_early integer;
begin
 select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
 if v_timezone is null then raise exception 'Établissement introuvable'; end if;
 v_local:=p_now at time zone v_timezone; v_date:=v_local::date; v_time:=v_local::time; v_day:=extract(isodow from v_local)::integer;
 select coalesce(ps.early_arrival_tolerance_minutes,15) into v_early
 from public.pointage_settings ps where ps.establishment_id=p_establishment_id
 and (ps.academic_year_id is null or ps.academic_year_id in (
   select ay.id from public.academic_years ay where ay.establishment_id=p_establishment_id and ay.status='active' and v_date between ay.start_date and ay.end_date
 )) order by ps.academic_year_id desc nulls last limit 1;
 return query
 select ts.id,ay.id,cs.class_id,cs.subject_id,ts.starts_at,ts.ends_at,greatest(0,extract(epoch from(v_time-ts.starts_at))/60)::integer
 from public.timetable_slots ts join public.class_subjects cs on cs.id=ts.class_subject_id join public.academic_years ay on ay.id=ts.academic_year_id
 where ts.establishment_id=p_establishment_id and ay.status='active' and v_date between ay.start_date and ay.end_date
 and ts.day_of_week=v_day and cs.teacher_id=p_teacher_id
 and ts.starts_at >= (v_time-make_interval(mins=>v_early)) and ts.starts_at<=v_time and v_time<=ts.ends_at
 order by ts.starts_at limit 1;
end;
$function$;

create or replace function public.pointage_start_teacher_course(p_establishment_id uuid,p_method text default 'qr')
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_teacher_id uuid; v_lesson record; v_timezone text; v_local timestamp; v_date date; v_settings record; v_credited numeric; v_id uuid; v_existing public.teacher_lesson_attendance%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 if p_method not in ('qr','code','admin') then raise exception 'Méthode invalide'; end if;
 select t.id into v_teacher_id from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
 where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active' order by t.created_at limit 1;
 if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;
 select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
 v_local:=now() at time zone v_timezone; v_date:=v_local::date;
 select * into v_lesson from public.pointage_find_current_lesson(v_teacher_id,p_establishment_id,now());
 if v_lesson.timetable_slot_id is null then raise exception 'Aucun cours correspondant à votre emploi du temps actuellement'; end if;
 select tla.* into v_existing from public.teacher_lesson_attendance tla
 where tla.establishment_id=p_establishment_id and tla.teacher_id=v_teacher_id and tla.timetable_slot_id=v_lesson.timetable_slot_id and tla.attendance_date=v_date for update;
 if v_existing.id is not null then
   if v_existing.status='completed' then raise exception 'Ce cours est déjà terminé';
   elsif v_existing.status in ('missed','cancelled') then raise exception 'Ce cours ne peut plus être démarré';
   else
     return jsonb_build_object('attendance_id',v_existing.id,'timetable_slot_id',v_lesson.timetable_slot_id,'academic_year_id',v_lesson.academic_year_id,'class_id',v_lesson.class_id,'subject_id',v_lesson.subject_id,'scheduled_start',v_lesson.scheduled_start,'scheduled_end',v_lesson.scheduled_end,'started_time',v_existing.started_time,'late_minutes',v_existing.late_minutes,'credited_hours',v_existing.counted_hours,'status',v_existing.status,'already_started',true);
   end if;
 end if;
 select * into v_settings from public.pointage_settings ps where ps.establishment_id=p_establishment_id and (ps.academic_year_id is null or ps.academic_year_id=v_lesson.academic_year_id) order by ps.academic_year_id desc nulls last limit 1;
 v_credited:=case when v_lesson.late_minutes<=coalesce(v_settings.full_credit_threshold_minutes,40) then coalesce(v_settings.full_credit_hours,2) else coalesce(v_settings.partial_credit_hours,1) end;
 insert into public.teacher_lesson_attendance(establishment_id,academic_year_id,timetable_slot_id,teacher_id,attendance_date,started_time,scheduled_hours,counted_hours,credited_minutes,late_minutes,status,start_method,recorded_by)
 values(p_establishment_id,v_lesson.academic_year_id,v_lesson.timetable_slot_id,v_teacher_id,v_date,v_local::time,extract(epoch from(v_lesson.scheduled_end-v_lesson.scheduled_start))/3600,v_credited,round(v_credited*60),v_lesson.late_minutes,'in_progress',p_method,(select auth.uid())) returning id into v_id;
 insert into public.pointage_event_history(establishment_id,staff_type,staff_id,event_type,event_time,method,attendance_id,metadata,created_by)
 values(p_establishment_id,'teacher',v_teacher_id,'course_start',now(),p_method,v_id,jsonb_build_object('timetable_slot_id',v_lesson.timetable_slot_id,'academic_year_id',v_lesson.academic_year_id,'class_id',v_lesson.class_id,'subject_id',v_lesson.subject_id,'scheduled_start',v_lesson.scheduled_start,'scheduled_end',v_lesson.scheduled_end,'late_minutes',v_lesson.late_minutes,'credited_hours',v_credited),(select auth.uid()));
 return jsonb_build_object('attendance_id',v_id,'timetable_slot_id',v_lesson.timetable_slot_id,'academic_year_id',v_lesson.academic_year_id,'class_id',v_lesson.class_id,'subject_id',v_lesson.subject_id,'scheduled_start',v_lesson.scheduled_start,'scheduled_end',v_lesson.scheduled_end,'late_minutes',v_lesson.late_minutes,'credited_hours',v_credited,'status','in_progress','already_started',false);
end;
$function$;

create or replace function public.pointage_record_by_code(p_establishment_id uuid,p_event_type text,p_code text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_code public.pointage_access_codes%rowtype; v_teacher_id uuid; v_attendance_id uuid; v_timezone text; v_local timestamp; v_date date; v_lesson public.teacher_lesson_attendance%rowtype; v_started jsonb;
begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
 if p_event_type not in ('arrival','departure','course_start','course_end') then raise exception 'Événement invalide'; end if;
 select * into v_code from public.pointage_access_codes where establishment_id=p_establishment_id and active=true and code_digest=encode(extensions.digest(upper(trim(p_code)),'sha256'),'hex') limit 1;
 if v_code.id is null or not extensions.crypt(upper(trim(p_code)),v_code.code_hash)=v_code.code_hash then raise exception 'Code de pointage invalide'; end if;
 if p_event_type in ('arrival','departure') then
   v_attendance_id:=public.pointage_record_staff_event(p_establishment_id,v_code.staff_type,v_code.staff_id,p_event_type,'code');
   return jsonb_build_object('event_type',p_event_type,'staff_type',v_code.staff_type,'staff_id',v_code.staff_id,'attendance_id',v_attendance_id);
 end if;
 if v_code.staff_type<>'teacher' then raise exception 'Seul un enseignant peut pointer un début ou une fin de cours'; end if;
 v_teacher_id:=v_code.staff_id;
 if p_event_type='course_start' then
   select public.pointage_start_teacher_course(p_establishment_id,'code') into v_started;
   return v_started || jsonb_build_object('event_type','course_start');
 end if;
 select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
 v_local:=now() at time zone v_timezone; v_date:=v_local::date;
 select tla.* into v_lesson from public.teacher_lesson_attendance tla where tla.teacher_id=v_teacher_id and tla.establishment_id=p_establishment_id and tla.attendance_date=v_date and tla.status='in_progress' and tla.started_time is not null order by tla.started_time desc limit 1 for update;
 if v_lesson.id is null then raise exception 'Aucun cours en cours à clôturer'; end if;
 update public.teacher_lesson_attendance set ended_time=v_local::time,actual_duration_minutes=greatest(0,round(extract(epoch from(v_local::time-v_lesson.started_time))/60)::integer),end_method='code',status='completed',updated_at=now() where id=v_lesson.id;
 insert into public.pointage_event_history(establishment_id,staff_type,staff_id,event_type,event_time,method,attendance_id,metadata,created_by)
 values(p_establishment_id,'teacher',v_teacher_id,'course_end',now(),'code',v_lesson.id,jsonb_build_object('ended_time',v_local::time,'actual_duration_minutes',greatest(0,round(extract(epoch from(v_local::time-v_lesson.started_time))/60)::integer)),(select auth.uid()));
 return jsonb_build_object('event_type','course_end','attendance_id',v_lesson.id,'teacher_id',v_teacher_id,'ended_time',v_local::time,'status','completed');
end;
$function$;

create or replace function public.pointage_finish_teacher_course(p_establishment_id uuid,p_method text default 'qr')
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_teacher_id uuid; v_timezone text; v_local timestamp; v_date date; v_row public.teacher_lesson_attendance%rowtype; v_duration integer; v_credited integer;
begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 if p_method not in ('qr','code','admin','automatic') then raise exception 'Méthode invalide'; end if;
 select t.id into v_teacher_id from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active' order by t.created_at limit 1;
 if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;
 select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
 v_local:=now() at time zone v_timezone; v_date:=v_local::date;
 select tla.* into v_row from public.teacher_lesson_attendance tla where tla.teacher_id=v_teacher_id and tla.establishment_id=p_establishment_id and tla.attendance_date=v_date and tla.status='in_progress' and tla.started_time is not null order by tla.started_time desc limit 1 for update;
 if v_row.id is null then raise exception 'Aucun cours en cours à clôturer'; end if;
 v_duration:=greatest(0,round(extract(epoch from(v_local::time-v_row.started_time))/60)::integer);
 v_credited:=coalesce(v_row.credited_minutes,round(v_row.counted_hours*60));
 update public.teacher_lesson_attendance set ended_time=v_local::time,actual_duration_minutes=v_duration,counted_hours=round(v_credited/60.0,2),credited_minutes=v_credited,end_method=p_method,status='completed',updated_at=now() where id=v_row.id;
 insert into public.pointage_event_history(establishment_id,staff_type,staff_id,event_type,event_time,method,attendance_id,metadata,created_by)
 values(p_establishment_id,'teacher',v_teacher_id,'course_end',now(),p_method,v_row.id,jsonb_build_object('ended_time',v_local::time,'actual_duration_minutes',v_duration,'credited_minutes',v_credited),(select auth.uid()));
 return jsonb_build_object('attendance_id',v_row.id,'ended_time',v_local::time,'actual_duration_minutes',v_duration,'credited_minutes',v_credited,'status','completed');
end;
$function$;

create or replace function public.pointage_close_lesson_admin(p_attendance_id uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_row public.teacher_lesson_attendance%rowtype; v_now_local time; v_timezone text; v_duration integer;
begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 select tla.* into v_row from public.teacher_lesson_attendance tla where tla.id=p_attendance_id for update;
 if v_row.id is null then raise exception 'Cours introuvable'; end if;
 if not private.has_permission(v_row.establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
 if v_row.status not in ('in_progress','scheduled') then raise exception 'Ce cours est déjà clôturé'; end if;
 select e.timezone into v_timezone from public.establishments e where e.id=v_row.establishment_id;
 v_now_local:=(now() at time zone v_timezone)::time;
 v_duration:=case when v_row.started_time is null then null else greatest(0,round(extract(epoch from(v_now_local-v_row.started_time))/60)::integer) end;
 update public.teacher_lesson_attendance set ended_time=v_now_local,actual_duration_minutes=v_duration,end_method='admin',closed_by=(select auth.uid()),closure_reason=nullif(trim(p_reason),''),status='completed',updated_at=now() where id=v_row.id;
 insert into public.pointage_event_history(establishment_id,staff_type,staff_id,event_type,event_time,method,attendance_id,metadata,created_by)
 values(v_row.establishment_id,'teacher',v_row.teacher_id,'course_end',now(),'admin',v_row.id,jsonb_build_object('ended_time',v_now_local,'actual_duration_minutes',v_duration,'reason',nullif(trim(p_reason),'')),(select auth.uid()));
 return jsonb_build_object('attendance_id',v_row.id,'ended_time',v_now_local,'actual_duration_minutes',v_duration,'status','completed');
end;
$function$;

create or replace function public.pointage_record_staff_event(p_establishment_id uuid,p_staff_type text,p_staff_id uuid,p_event_type text,p_method text default 'code')
returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v_id uuid; v_timezone text; v_now timestamptz:=now(); v_date date;
begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
 if p_event_type not in ('arrival','departure') then raise exception 'Événement personnel invalide'; end if;
 if p_method not in ('code','qr','admin','automatic') then raise exception 'Méthode invalide'; end if;
 select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
 v_date:=(v_now at time zone v_timezone)::date;
 if p_staff_type='staff' then
   if not exists(select 1 from public.staff_members s where s.id=p_staff_id and s.establishment_id=p_establishment_id and s.active=true) then raise exception 'Personnel introuvable'; end if;
 elsif p_staff_type='teacher' then
   if not exists(select 1 from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id where t.id=p_staff_id and t.active=true and te.establishment_id=p_establishment_id and te.status='active') then raise exception 'Enseignant introuvable'; end if;
 else raise exception 'Type de personnel invalide'; end if;
 if p_event_type='arrival' then
   insert into public.staff_attendance(establishment_id,staff_type,staff_id,attendance_date,check_in,status,recorded_by)
   values(p_establishment_id,p_staff_type,p_staff_id,v_date,v_now,'present',(select auth.uid()))
   on conflict(establishment_id,staff_type,staff_id,attendance_date) do nothing returning id into v_id;
   if v_id is null then select id into v_id from public.staff_attendance where establishment_id=p_establishment_id and staff_type=p_staff_type and staff_id=p_staff_id and attendance_date=v_date;
   else insert into public.pointage_event_history(establishment_id,staff_type,staff_id,event_type,event_time,method,metadata,created_by) values(p_establishment_id,p_staff_type,p_staff_id,'arrival',v_now,p_method,jsonb_build_object('attendance_id',v_id),(select auth.uid())); end if;
 else
   update public.staff_attendance set check_out=v_now,updated_at=now(),recorded_by=(select auth.uid()) where establishment_id=p_establishment_id and staff_type=p_staff_type and staff_id=p_staff_id and attendance_date=v_date returning id into v_id;
   if v_id is null then raise exception 'Aucune arrivée enregistrée pour cette journée'; end if;
   insert into public.pointage_event_history(establishment_id,staff_type,staff_id,event_type,event_time,method,metadata,created_by) values(p_establishment_id,p_staff_type,p_staff_id,'departure',v_now,p_method,jsonb_build_object('attendance_id',v_id),(select auth.uid()));
 end if;
 return v_id;
end;
$function$;

create or replace function public.pointage_refresh_alerts(p_establishment_id uuid,p_date date default null)
returns integer language plpgsql security definer set search_path to ''
as $function$
declare v_date date; v_timezone text; v_count integer:=0; r record;
begin
 if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
 if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
 select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
 if v_timezone is null then raise exception 'Établissement introuvable'; end if;
 v_date:=coalesce(p_date,(now() at time zone v_timezone)::date);
 for r in select * from public.pointage_get_alerts(p_establishment_id,v_date) loop
   if not exists(select 1 from public.pointage_alerts a where a.establishment_id=p_establishment_id and a.alert_date=v_date and a.alert_type=r.alert_type and a.timetable_slot_id=r.timetable_slot_id and a.teacher_id=r.teacher_id and coalesce(a.lesson_attendance_id,'00000000-0000-0000-0000-000000000000')=coalesce(r.lesson_attendance_id,'00000000-0000-0000-0000-000000000000') and a.resolved_at is null) then
     insert into public.pointage_alerts(establishment_id,academic_year_id,alert_type,teacher_id,timetable_slot_id,lesson_attendance_id,alert_date,detected_at,metadata)
     select p_establishment_id,ts.academic_year_id,r.alert_type,r.teacher_id,r.timetable_slot_id,r.lesson_attendance_id,v_date,now(),jsonb_build_object('scheduled_start',r.scheduled_start,'scheduled_end',r.scheduled_end,'status',r.status,'late_minutes',r.late_minutes)
     from public.timetable_slots ts where ts.id=r.timetable_slot_id;
     v_count:=v_count+1;
   end if;
 end loop;
 return v_count;
end;
$function$;

create or replace function public.pointage_get_alerts(p_establishment_id uuid,p_date date default null)
returns table(alert_type text,teacher_id uuid,timetable_slot_id uuid,lesson_attendance_id uuid,scheduled_start time,scheduled_end time,status text,late_minutes integer)
language sql stable set search_path to ''
as $function$
with context as (
 select coalesce(p_date,(now() at time zone e.timezone)::date) local_date,e.timezone
 from public.establishments e where e.id=p_establishment_id
), active_slots as (
 select ts.id timetable_slot_id,ts.academic_year_id,ts.starts_at,ts.ends_at,cs.teacher_id,c.local_date,c.timezone,
        coalesce(ps.alert_missing_lesson_after_minutes,10) missing_after_minutes
 from public.timetable_slots ts join public.class_subjects cs on cs.id=ts.class_subject_id join public.academic_years ay on ay.id=ts.academic_year_id
 join context c on true left join public.pointage_settings ps on ps.establishment_id=p_establishment_id and (ps.academic_year_id is null or ps.academic_year_id=ts.academic_year_id)
 where ts.establishment_id=p_establishment_id and ay.status='active' and c.local_date between ay.start_date and ay.end_date and ts.day_of_week=extract(isodow from(c.local_date::timestamp))::integer
)
select case
 when tla.id is null and (now() at time zone s.timezone)::time >= (s.starts_at+make_interval(mins=>s.missing_after_minutes))::time then 'missing_lesson'
 when tla.id is not null and tla.status='in_progress' and (now() at time zone s.timezone)::time >= s.ends_at then 'lesson_to_close'
 when tla.id is not null and tla.late_minutes>0 then 'late' else 'anomaly' end,
 s.teacher_id,s.timetable_slot_id,tla.id,s.starts_at,s.ends_at,coalesce(tla.status,'not_started'),coalesce(tla.late_minutes,0)
from active_slots s left join public.teacher_lesson_attendance tla on tla.timetable_slot_id=s.timetable_slot_id and tla.teacher_id=s.teacher_id and tla.attendance_date=s.local_date
where (tla.id is null and (now() at time zone s.timezone)::time >= (s.starts_at+make_interval(mins=>s.missing_after_minutes))::time)
or (tla.id is not null and tla.status='in_progress' and (now() at time zone s.timezone)::time >= s.ends_at)
or (tla.id is not null and tla.late_minutes>0);
$function$;
