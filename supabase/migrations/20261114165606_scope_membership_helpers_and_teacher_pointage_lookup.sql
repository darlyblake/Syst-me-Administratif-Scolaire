create or replace function public.is_establishment_member(p_establishment_id uuid,p_user_id uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then return false; end if;
  if p_user_id is distinct from auth.uid()
    and not exists (
      select 1 from public.establishment_members current_member
      where current_member.establishment_id=p_establishment_id
        and current_member.user_id=auth.uid()
        and current_member.active=true
        and current_member.role in ('owner','admin','school_admin')
    ) then return false;
  end if;
  return exists (
    select 1 from public.establishment_members m
    where m.establishment_id=p_establishment_id and m.user_id=p_user_id and m.active=true
  );
end;
$function$;

create or replace function public.has_establishment_role(
  p_establishment_id uuid,p_roles text[],p_user_id uuid default auth.uid()
)
returns boolean language plpgsql stable security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then return false; end if;
  if p_user_id is distinct from auth.uid()
    and not exists (
      select 1 from public.establishment_members current_member
      where current_member.establishment_id=p_establishment_id
        and current_member.user_id=auth.uid()
        and current_member.active=true
        and current_member.role in ('owner','admin','school_admin')
    ) then return false;
  end if;
  return exists (
    select 1 from public.establishment_members m
    where m.establishment_id=p_establishment_id and m.user_id=p_user_id
      and m.active=true and m.role=any(p_roles)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.pointage_find_current_lesson(p_teacher_id uuid, p_establishment_id uuid, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(timetable_slot_id uuid, academic_year_id uuid, class_id uuid, subject_id uuid, scheduled_start time without time zone, scheduled_end time without time zone, late_minutes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_timezone text;
  v_local timestamp;
  v_date date;
  v_time time;
  v_day integer;
  v_early integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id,'attendance.read') and not exists (
    select 1 from public.teachers t
    join public.teacher_establishments te on te.teacher_id=t.id
    where t.id=p_teacher_id and t.profile_id=auth.uid() and t.active=true
      and te.establishment_id=p_establishment_id and te.status='active'
  ) then raise exception 'Accès au pointage refusé'; end if;

  select e.timezone into v_timezone
  from public.establishments e
  where e.id=p_establishment_id;

  if v_timezone is null then
    raise exception 'Établissement introuvable';
  end if;

  v_local := p_now at time zone v_timezone;
  v_date := v_local::date;
  v_time := v_local::time;
  v_day := extract(isodow from v_local)::integer;

  select coalesce(ps.early_arrival_tolerance_minutes,15)
    into v_early
  from public.pointage_settings ps
  where ps.establishment_id=p_establishment_id
    and (ps.academic_year_id is null or ps.academic_year_id in (
      select ay.id
      from public.academic_years ay
      where ay.establishment_id=p_establishment_id
        and ay.status='active'
        and v_date between ay.start_date and ay.end_date
    ))
  order by ps.academic_year_id desc nulls last
  limit 1;

  return query
  select
    ts.id,
    ay.id,
    cs.class_id,
    cs.subject_id,
    ts.starts_at,
    ts.ends_at,
    greatest(0,extract(epoch from (v_time-ts.starts_at))/60)::integer
  from public.timetable_slots ts
  join public.class_subjects cs on cs.id=ts.class_subject_id
  join public.academic_years ay on ay.id=ts.academic_year_id
  where ts.establishment_id=p_establishment_id
    and ay.status='active'
    and v_date between ay.start_date and ay.end_date
    and ts.day_of_week=v_day
    and cs.teacher_id=p_teacher_id
    and exists (
      select 1 from public.teachers t
      join public.teacher_establishments te on te.teacher_id=t.id
      where t.id=cs.teacher_id and t.active=true
        and te.establishment_id=p_establishment_id and te.status='active'
    )
    and ts.starts_at >= (v_time - make_interval(mins => v_early))
    and ts.starts_at <= v_time
    and v_time <= ts.ends_at
  order by ts.starts_at
  limit 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_by_invite_code(p_code text)
 RETURNS TABLE(teacher_id uuid, first_name text, last_name text, specialty text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select t.id,t.first_name,t.last_name,t.specialty
 from public.teachers t
 where auth.uid() is not null
 and upper(t.employee_number)=upper(trim(p_code)) and t.active=true
 and exists (select 1 from public.teacher_establishments te where te.teacher_id=t.id and te.status='active')
 and (
   t.profile_id=auth.uid()
   or lower(coalesce(t.email,''))=lower((select u.email from auth.users u where u.id=auth.uid()))
 )
 limit 1;
$function$;