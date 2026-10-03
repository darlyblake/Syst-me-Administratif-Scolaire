create or replace function public.pointage_daily_report(
  p_establishment_id uuid,p_start_date date,p_end_date date
)
returns table (
  attendance_date date,staff_type text,staff_id uuid,employee_number text,first_name text,last_name text,job_title text,
  planned_minutes integer,worked_minutes integer,credited_minutes integer,late_minutes integer,early_departure_minutes integer,
  overtime_minutes integer,status text,check_in timestamptz,check_out timestamptz
)
language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not (private.has_permission(p_establishment_id,'attendance.manage') or private.has_permission(p_establishment_id,'payments.manage')) then raise exception 'Non autorisé'; end if;
  return query
  with settings as (
    select coalesce(ps.work_start_time,'07:00'::time) work_start_time,coalesce(ps.work_end_time,'15:00'::time) work_end_time,
      coalesce(ps.work_days,'{1,2,3,4,5}'::smallint[]) work_days,e.timezone
    from public.establishments e
    left join lateral (select p.work_start_time,p.work_end_time,p.work_days from public.pointage_settings p where p.establishment_id=e.id order by p.updated_at desc limit 1) ps on true
    where e.id=p_establishment_id
  ),
  dates as (select gs::date attendance_date from generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') gs),
  staff_days as (
    select d.attendance_date,'staff'::text staff_type,s.id staff_id,s.employee_number,s.first_name,s.last_name,s.position job_title,sa.check_in,sa.check_out,
      extract(epoch from(ps.work_end_time-ps.work_start_time))::integer/60 planned_minutes,
      case when sa.check_in is not null and sa.check_out is not null then greatest(0,extract(epoch from(sa.check_out-sa.check_in))::integer/60) else 0 end worked_minutes,
      case when sa.check_in is not null and sa.check_out is not null then greatest(0,extract(epoch from(sa.check_out-sa.check_in))::integer/60) else 0 end credited_minutes,
      case when sa.check_in is not null then greatest(0,extract(epoch from((sa.check_in at time zone coalesce(ps.timezone,'UTC'))::time-ps.work_start_time))::integer/60) else 0 end late_minutes,
      case when sa.check_out is not null then greatest(0,extract(epoch from(ps.work_end_time-(sa.check_out at time zone coalesce(ps.timezone,'UTC'))::time))::integer/60) else 0 end early_departure_minutes,
      0::integer overtime_minutes,case when sa.check_in is null then 'absent' when sa.check_out is null then 'incomplete' else 'present' end status
    from dates d cross join public.staff_members s cross join settings ps
    left join public.staff_attendance sa on sa.establishment_id=p_establishment_id and sa.staff_type='staff' and sa.staff_id=s.id and sa.attendance_date=d.attendance_date
    where s.establishment_id=p_establishment_id and s.active=true and extract(isodow from d.attendance_date)::smallint=any(ps.work_days)
  ),
  teacher_days as (
    select tla.attendance_date,'teacher'::text staff_type,tla.teacher_id staff_id,t.employee_number,t.first_name,t.last_name,'Enseignant'::text job_title,
      sum(round(tla.scheduled_hours*60))::integer planned_minutes,
      sum(case when tla.started_time is not null and tla.ended_time is not null then greatest(0,round(extract(epoch from(tla.ended_time-tla.started_time))/60)::integer) else 0 end)::integer worked_minutes,
      sum(coalesce(tla.credited_minutes,round(tla.counted_hours*60)::integer,0))::integer credited_minutes,sum(coalesce(tla.late_minutes,0))::integer late_minutes,0::integer early_departure_minutes,
      greatest(0,sum(case when tla.started_time is not null and tla.ended_time is not null then greatest(0,round(extract(epoch from(tla.ended_time-tla.started_time))/60)::integer) else 0 end)::integer-sum(round(tla.scheduled_hours*60))::integer) overtime_minutes,
      case when bool_and(tla.status='completed') then 'present' when bool_or(tla.status='in_progress') then 'incomplete' else 'scheduled' end status,null::timestamptz check_in,null::timestamptz check_out
    from public.teacher_lesson_attendance tla join public.teachers t on t.id=tla.teacher_id
    where tla.establishment_id=p_establishment_id and tla.attendance_date between p_start_date and p_end_date
    group by tla.attendance_date,tla.teacher_id,t.employee_number,t.first_name,t.last_name
  )
  select x.attendance_date,x.staff_type,x.staff_id,x.employee_number,x.first_name,x.last_name,x.job_title,x.planned_minutes,x.worked_minutes,x.credited_minutes,
    x.late_minutes,x.early_departure_minutes,case when x.staff_type='staff' then greatest(0,x.worked_minutes-x.planned_minutes) else x.overtime_minutes end,
    x.status,x.check_in,x.check_out
  from (select * from staff_days union all select * from teacher_days) x order by x.attendance_date desc,x.last_name,x.first_name;
end; $$;

revoke execute on function public.pointage_daily_report(uuid,date,date) from public;
grant execute on function public.pointage_daily_report(uuid,date,date) to authenticated;

create or replace function public.pointage_period_summary(
  p_establishment_id uuid,p_start_date date,p_end_date date
)
returns table (
  staff_type text,staff_id uuid,employee_number text,first_name text,last_name text,job_title text,
  planned_hours numeric,worked_hours numeric,credited_hours numeric,late_minutes integer,early_departure_minutes integer,overtime_hours numeric,
  absent_days integer,incomplete_days integer
)
language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not (private.has_permission(p_establishment_id,'attendance.manage') or private.has_permission(p_establishment_id,'payments.manage')) then raise exception 'Non autorisé'; end if;
  return query select r.staff_type,r.staff_id,r.employee_number,r.first_name,r.last_name,r.job_title,round(sum(r.planned_minutes)::numeric/60,2),
    round(sum(r.worked_minutes)::numeric/60,2),round(sum(r.credited_minutes)::numeric/60,2),sum(r.late_minutes)::integer,sum(r.early_departure_minutes)::integer,
    round(sum(r.overtime_minutes)::numeric/60,2),count(*) filter(where r.status='absent')::integer,count(*) filter(where r.status='incomplete')::integer
  from public.pointage_daily_report(p_establishment_id,p_start_date,p_end_date) r
  group by r.staff_type,r.staff_id,r.employee_number,r.first_name,r.last_name,r.job_title order by r.last_name,r.first_name;
end; $$;
