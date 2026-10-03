-- Pointage v1: central attendance workflow, teacher lesson lifecycle, codes, QR sessions and settings.
-- 2026-10-03

alter table public.teacher_lesson_attendance
  add column if not exists actual_duration_minutes integer,
  add column if not exists credited_minutes integer,
  add column if not exists late_minutes integer not null default 0,
  add column if not exists start_method text,
  add column if not exists end_method text,
  add column if not exists closed_by uuid references auth.users(id),
  add column if not exists closure_reason text;

alter table public.teacher_lesson_attendance
  drop constraint if exists teacher_lesson_attendance_start_method_check;
alter table public.teacher_lesson_attendance
  add constraint teacher_lesson_attendance_start_method_check
  check (start_method is null or start_method in ('code','qr','admin'));

alter table public.teacher_lesson_attendance
  drop constraint if exists teacher_lesson_attendance_end_method_check;
alter table public.teacher_lesson_attendance
  add constraint teacher_lesson_attendance_end_method_check
  check (end_method is null or end_method in ('code','qr','admin','automatic'));

create unique index if not exists teacher_lesson_attendance_slot_date_uidx
  on public.teacher_lesson_attendance(teacher_id,timetable_slot_id,attendance_date);

create index if not exists teacher_lesson_attendance_est_date_status_idx
  on public.teacher_lesson_attendance(establishment_id,attendance_date,status);

create table if not exists public.pointage_settings (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  early_arrival_tolerance_minutes integer not null default 15 check (early_arrival_tolerance_minutes between 0 and 120),
  full_credit_threshold_minutes integer not null default 40 check (full_credit_threshold_minutes between 0 and 240),
  full_credit_hours numeric(5,2) not null default 2 check (full_credit_hours >= 0),
  partial_credit_hours numeric(5,2) not null default 1 check (partial_credit_hours >= 0),
  allow_teacher_close boolean not null default true,
  require_admin_closure_after_schedule_end boolean not null default true,
  alert_missing_lesson_after_minutes integer not null default 10 check (alert_missing_lesson_after_minutes between 0 and 240),
  alerts_enabled boolean not null default true,
  code_enabled boolean not null default true,
  qr_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(establishment_id, academic_year_id)
);

alter table public.pointage_settings enable row level security;

drop policy if exists "pointage_settings_manager" on public.pointage_settings;
create policy "pointage_settings_manager"
on public.pointage_settings
for all to authenticated
using (private.has_permission(establishment_id,'attendance.manage'))
with check (private.has_permission(establishment_id,'attendance.manage'));

drop policy if exists "pointage_settings_member_select" on public.pointage_settings;
create policy "pointage_settings_member_select"
on public.pointage_settings
for select to authenticated
using (private.is_member(establishment_id));

grant select,insert,update,delete on public.pointage_settings to authenticated;

create table if not exists public.pointage_access_codes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  staff_type text not null check (staff_type in ('teacher','staff')),
  staff_id uuid not null,
  code_digest text not null,
  code_hash text not null,
  code_last4 text not null,
  active boolean not null default true,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique(establishment_id,staff_type,staff_id),
  unique(establishment_id,code_digest)
);

alter table public.pointage_access_codes enable row level security;

drop policy if exists "pointage_codes_manager" on public.pointage_access_codes;
create policy "pointage_codes_manager"
on public.pointage_access_codes
for all to authenticated
using (private.has_permission(establishment_id,'attendance.manage'))
with check (private.has_permission(establishment_id,'attendance.manage'));

grant select,insert,update,delete on public.pointage_access_codes to authenticated;

create table if not exists public.pointage_qr_sessions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  terminal_label text,
  token_digest text not null unique,
  expires_at timestamptz not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pointage_qr_sessions enable row level security;

drop policy if exists "pointage_qr_manager" on public.pointage_qr_sessions;
create policy "pointage_qr_manager"
on public.pointage_qr_sessions
for all to authenticated
using (private.has_permission(establishment_id,'attendance.manage'))
with check (private.has_permission(establishment_id,'attendance.manage'));

grant select,insert,update,delete on public.pointage_qr_sessions to authenticated;

create table if not exists public.pointage_alerts (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  alert_type text not null check (alert_type in ('missing_arrival','missing_lesson','late','lesson_to_close','missing_departure','anomaly')),
  teacher_id uuid references public.teachers(id) on delete cascade,
  staff_id uuid references public.staff_members(id) on delete cascade,
  timetable_slot_id uuid references public.timetable_slots(id) on delete cascade,
  lesson_attendance_id uuid references public.teacher_lesson_attendance(id) on delete cascade,
  alert_date date not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.pointage_alerts enable row level security;

drop policy if exists "pointage_alerts_manager" on public.pointage_alerts;
create policy "pointage_alerts_manager"
on public.pointage_alerts
for all to authenticated
using (private.has_permission(establishment_id,'attendance.manage'))
with check (private.has_permission(establishment_id,'attendance.manage'));

grant select,insert,update,delete on public.pointage_alerts to authenticated;

create index if not exists pointage_access_codes_lookup_idx
  on public.pointage_access_codes(establishment_id,code_digest)
  where active = true;

create index if not exists pointage_qr_sessions_active_idx
  on public.pointage_qr_sessions(establishment_id,expires_at)
  where active = true;

create index if not exists pointage_alerts_open_idx
  on public.pointage_alerts(establishment_id,alert_date,alert_type)
  where resolved_at is null;

create or replace function public.pointage_issue_code(
  p_establishment_id uuid,
  p_staff_type text,
  p_staff_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_digest text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if not private.has_permission(p_establishment_id,'attendance.manage') then
    raise exception 'Non autorisé';
  end if;

  if p_staff_type = 'teacher' then
    if not exists (
      select 1 from public.teachers t
      join public.teacher_establishments te on te.teacher_id=t.id
      where t.id=p_staff_id and t.active=true
        and te.establishment_id=p_establishment_id and te.status='active'
    ) then
      raise exception 'Enseignant non rattaché à cet établissement';
    end if;
  elsif p_staff_type = 'staff' then
    if not exists (
      select 1 from public.staff_members s
      where s.id=p_staff_id and s.establishment_id=p_establishment_id and s.active=true
    ) then
      raise exception 'Personnel non trouvé dans cet établissement';
    end if;
  else
    raise exception 'Type de personnel invalide';
  end if;

  v_code := upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8));
  v_digest := encode(extensions.digest(v_code,'sha256'),'hex');

  while exists (
    select 1 from public.pointage_access_codes
    where establishment_id=p_establishment_id and code_digest=v_digest
  ) loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,8));
    v_digest := encode(extensions.digest(v_code,'sha256'),'hex');
  end loop;

  insert into public.pointage_access_codes(
    establishment_id,staff_type,staff_id,code_digest,code_hash,code_last4,created_by,active,revoked_at
  )
  values(
    p_establishment_id,p_staff_type,p_staff_id,v_digest,
    extensions.crypt(v_code,extensions.gen_salt('bf',10)),
    right(v_code,4),(select auth.uid()),true,null
  )
  on conflict(establishment_id,staff_type,staff_id) do update set
    code_digest=excluded.code_digest,
    code_hash=excluded.code_hash,
    code_last4=excluded.code_last4,
    active=true,
    revoked_at=null,
    issued_at=now(),
    created_by=(select auth.uid());

  return v_code;
end;
$$;

revoke execute on function public.pointage_issue_code(uuid,text,uuid) from public, anon;
grant execute on function public.pointage_issue_code(uuid,text,uuid) to authenticated;

create or replace function public.pointage_create_qr_session(
  p_establishment_id uuid,
  p_terminal_label text default null,
  p_ttl_seconds integer default 60
)
returns table(token text,expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_digest text;
  v_expires timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise';
  end if;

  if not private.has_permission(p_establishment_id,'attendance.manage') then
    raise exception 'Non autorisé';
  end if;

  if p_ttl_seconds < 15 or p_ttl_seconds > 300 then
    raise exception 'Durée QR invalide';
  end if;

  update public.pointage_qr_sessions
  set active=false
  where establishment_id=p_establishment_id and active=true;

  v_token := encode(extensions.gen_random_bytes(24),'hex');
  v_digest := encode(extensions.digest(v_token,'sha256'),'hex');
  v_expires := now() + make_interval(secs => p_ttl_seconds);

  insert into public.pointage_qr_sessions(
    establishment_id,terminal_label,token_digest,expires_at,created_by
  )
  values(
    p_establishment_id,p_terminal_label,v_digest,v_expires,(select auth.uid())
  );

  return query select v_token,v_expires;
end;
$$;

revoke execute on function public.pointage_create_qr_session(uuid,text,integer) from public, anon;
grant execute on function public.pointage_create_qr_session(uuid,text,integer) to authenticated;

create or replace function public.pointage_find_current_lesson(
  p_teacher_id uuid,
  p_establishment_id uuid,
  p_now timestamptz default now()
)
returns table(
  timetable_slot_id uuid,
  academic_year_id uuid,
  class_id uuid,
  subject_id uuid,
  scheduled_start time,
  scheduled_end time,
  late_minutes integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_timezone text;
  v_local timestamp;
  v_date date;
  v_time time;
  v_day integer;
  v_early integer;
begin
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
      select ay.id from public.academic_years ay
      where ay.establishment_id=p_establishment_id
        and ay.status='active'
        and v_date between ay.start_date and ay.end_date
    ))
  order by ps.academic_year_id nulls last
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
    and ts.starts_at <= v_time
    and ts.ends_at >= v_time
  order by ts.starts_at
  limit 1;
end;
$$;

revoke execute on function public.pointage_find_current_lesson(uuid,uuid,timestamptz) from public, anon;
grant execute on function public.pointage_find_current_lesson(uuid,uuid,timestamptz) to authenticated;

create or replace function public.pointage_start_teacher_course(
  p_establishment_id uuid,
  p_method text default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_id uuid;
  v_lesson record;
  v_timezone text;
  v_local timestamp;
  v_date date;
  v_settings record;
  v_credited numeric;
  v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if p_method not in ('qr','code','admin') then raise exception 'Méthode invalide'; end if;

  select t.id into v_teacher_id
  from public.teachers t
  join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=(select auth.uid())
    and t.active=true
    and te.establishment_id=p_establishment_id
    and te.status='active'
  order by t.created_at
  limit 1;

  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;

  select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
  v_local := now() at time zone v_timezone;
  v_date := v_local::date;

  select * into v_lesson
  from public.pointage_find_current_lesson(v_teacher_id,p_establishment_id,now());

  if v_lesson.timetable_slot_id is null then
    raise exception 'Aucun cours correspondant à votre emploi du temps actuellement';
  end if;

  select * into v_settings
  from public.pointage_settings ps
  where ps.establishment_id=p_establishment_id
    and (ps.academic_year_id is null or ps.academic_year_id=v_lesson.academic_year_id)
  order by ps.academic_year_id desc nulls last
  limit 1;

  v_credited := case
    when v_lesson.late_minutes <= coalesce(v_settings.full_credit_threshold_minutes,40)
      then coalesce(v_settings.full_credit_hours,2)
    else coalesce(v_settings.partial_credit_hours,1)
  end;

  insert into public.teacher_lesson_attendance(
    establishment_id,academic_year_id,timetable_slot_id,teacher_id,attendance_date,
    started_time,scheduled_hours,counted_hours,credited_minutes,late_minutes,status,start_method,recorded_by
  )
  values(
    p_establishment_id,v_lesson.academic_year_id,v_lesson.timetable_slot_id,v_teacher_id,v_date,
    v_local::time,
    extract(epoch from (v_lesson.scheduled_end-v_lesson.scheduled_start))/3600,
    v_credited,
    round(v_credited*60),
    v_lesson.late_minutes,
    'in_progress',
    p_method,
    (select auth.uid())
  )
  on conflict(teacher_id,timetable_slot_id,attendance_date) do update
  set started_time=coalesce(public.teacher_lesson_attendance.started_time,excluded.started_time),
      status='in_progress',
      start_method=coalesce(public.teacher_lesson_attendance.start_method,excluded.start_method),
      recorded_by=coalesce(public.teacher_lesson_attendance.recorded_by,excluded.recorded_by),
      late_minutes=excluded.late_minutes,
      counted_hours=excluded.counted_hours,
      credited_minutes=excluded.credited_minutes,
      updated_at=now()
  returning id into v_id;

  return jsonb_build_object(
    'attendance_id',v_id,
    'timetable_slot_id',v_lesson.timetable_slot_id,
    'academic_year_id',v_lesson.academic_year_id,
    'class_id',v_lesson.class_id,
    'subject_id',v_lesson.subject_id,
    'scheduled_start',v_lesson.scheduled_start,
    'scheduled_end',v_lesson.scheduled_end,
    'late_minutes',v_lesson.late_minutes,
    'credited_hours',v_credited
  );
end;
$$;

revoke execute on function public.pointage_start_teacher_course(uuid,text) from public, anon;
grant execute on function public.pointage_start_teacher_course(uuid,text) to authenticated;

create or replace function public.pointage_finish_teacher_course(
  p_establishment_id uuid,
  p_method text default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher_id uuid;
  v_timezone text;
  v_local timestamp;
  v_date date;
  v_row public.teacher_lesson_attendance%rowtype;
  v_duration integer;
  v_credited integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if p_method not in ('qr','code','admin','automatic') then raise exception 'Méthode invalide'; end if;

  select t.id into v_teacher_id
  from public.teachers t
  join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=(select auth.uid())
    and t.active=true
    and te.establishment_id=p_establishment_id
    and te.status='active'
  order by t.created_at
  limit 1;

  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;

  select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
  v_local := now() at time zone v_timezone;
  v_date := v_local::date;

  select tla.* into v_row
  from public.teacher_lesson_attendance tla
  where tla.teacher_id=v_teacher_id
    and tla.establishment_id=p_establishment_id
    and tla.attendance_date=v_date
    and tla.status='in_progress'
    and tla.started_time is not null
  order by tla.started_time desc
  limit 1
  for update;

  if v_row.id is null then
    raise exception 'Aucun cours en cours à clôturer';
  end if;

  v_duration := greatest(0,round(extract(epoch from (v_local::time-v_row.started_time))/60)::integer);
  v_credited := coalesce(v_row.credited_minutes,round(v_row.counted_hours*60));

  update public.teacher_lesson_attendance
  set ended_time=v_local::time,
      actual_duration_minutes=v_duration,
      counted_hours=round(v_credited/60.0,2),
      credited_minutes=v_credited,
      end_method=p_method,
      closed_by=case when p_method in ('admin','automatic') then (select auth.uid()) else closed_by end,
      status='completed',
      updated_at=now()
  where id=v_row.id;

  return jsonb_build_object(
    'attendance_id',v_row.id,
    'ended_time',v_local::time,
    'actual_duration_minutes',v_duration,
    'credited_minutes',v_credited,
    'status','completed'
  );
end;
$$;

revoke execute on function public.pointage_finish_teacher_course(uuid,text) from public, anon;
grant execute on function public.pointage_finish_teacher_course(uuid,text) to authenticated;

create or replace function public.pointage_record_staff_event(
  p_establishment_id uuid,
  p_staff_type text,
  p_staff_id uuid,
  p_event_type text,
  p_method text default 'code'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_timezone text;
  v_now timestamptz := now();
  v_date date;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id,'attendance.manage') then
    raise exception 'Non autorisé';
  end if;
  if p_event_type not in ('arrival','departure') then
    raise exception 'Événement personnel invalide';
  end if;

  select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
  v_date := (v_now at time zone v_timezone)::date;

  if p_staff_type='staff' then
    if not exists(select 1 from public.staff_members s where s.id=p_staff_id and s.establishment_id=p_establishment_id and s.active=true) then
      raise exception 'Personnel introuvable';
    end if;
  elsif p_staff_type='teacher' then
    if not exists(
      select 1 from public.teachers t
      join public.teacher_establishments te on te.teacher_id=t.id
      where t.id=p_staff_id and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
    ) then raise exception 'Enseignant introuvable'; end if;
  else raise exception 'Type de personnel invalide'; end if;

  if p_event_type='arrival' then
    insert into public.staff_attendance(establishment_id,staff_type,staff_id,attendance_date,check_in,status,recorded_by)
    values(p_establishment_id,p_staff_type,p_staff_id,v_date,v_now,'present',(select auth.uid()))
    on conflict do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.staff_attendance
      where establishment_id=p_establishment_id and staff_type=p_staff_type and staff_id=p_staff_id and attendance_date=v_date;
    end if;
  else
    update public.staff_attendance
    set check_out=v_now,updated_at=now(),recorded_by=(select auth.uid())
    where establishment_id=p_establishment_id and staff_type=p_staff_type and staff_id=p_staff_id and attendance_date=v_date
    returning id into v_id;
    if v_id is null then raise exception 'Aucune arrivée enregistrée pour cette journée'; end if;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.pointage_record_staff_event(uuid,text,uuid,text,text) from public, anon;
grant execute on function public.pointage_record_staff_event(uuid,text,uuid,text,text) to authenticated;

create or replace function public.pointage_get_alerts(
  p_establishment_id uuid,
  p_date date default null
)
returns table(
  alert_type text,
  teacher_id uuid,
  timetable_slot_id uuid,
  lesson_attendance_id uuid,
  scheduled_start time,
  scheduled_end time,
  status text,
  late_minutes integer
)
language sql
security invoker
stable
as $$
  with context as (
    select
      coalesce(p_date,(now() at time zone e.timezone)::date) as local_date,
      e.timezone
    from public.establishments e
    where e.id=p_establishment_id
  ),
  active_slots as (
    select
      ts.id as timetable_slot_id,
      ts.academic_year_id,
      ts.starts_at,
      ts.ends_at,
      cs.teacher_id,
      c.class_id,
      (select local_date from context) as local_date,
      (select timezone from context) as timezone
    from public.timetable_slots ts
    join public.class_subjects cs on cs.id=ts.class_subject_id
    join public.academic_years ay on ay.id=ts.academic_year_id
    join context c on true
    where ts.establishment_id=p_establishment_id
      and ay.status='active'
      and c.local_date between ay.start_date and ay.end_date
      and ts.day_of_week=extract(isodow from (c.local_date::timestamp))::integer
  )
  select
    case
      when tla.id is null and (now() at time zone s.timezone)::time > s.starts_at
        then 'missing_lesson'
      when tla.id is not null and tla.status='in_progress'
           and (now() at time zone s.timezone)::time >= s.ends_at
        then 'lesson_to_close'
      when tla.id is not null and tla.late_minutes > 0
        then 'late'
      else 'anomaly'
    end,
    s.teacher_id,
    s.timetable_slot_id,
    tla.id,
    s.starts_at,
    s.ends_at,
    coalesce(tla.status,'not_started'),
    coalesce(tla.late_minutes,0)
  from active_slots s
  left join public.teacher_lesson_attendance tla
    on tla.timetable_slot_id=s.timetable_slot_id
   and tla.teacher_id=s.teacher_id
   and tla.attendance_date=s.local_date
  where tla.id is null
     or tla.status='in_progress'
     or tla.late_minutes > 0;
$$;

revoke execute on function public.pointage_get_alerts(uuid,date) from public, anon;
grant execute on function public.pointage_get_alerts(uuid,date) to authenticated;


create or replace function public.pointage_start_teacher_course_by_qr(
  p_qr_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_establishment_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;

  select q.establishment_id into v_establishment_id
  from public.pointage_qr_sessions q
  where q.token_digest=encode(extensions.digest(p_qr_token,'sha256'),'hex')
    and q.active=true
    and q.expires_at>now()
  limit 1;

  if v_establishment_id is null then
    raise exception 'QR de pointage expiré ou invalide';
  end if;

  return public.pointage_start_teacher_course(v_establishment_id,'qr');
end;
$$;

revoke execute on function public.pointage_start_teacher_course_by_qr(text) from public, anon;
grant execute on function public.pointage_start_teacher_course_by_qr(text) to authenticated;

create or replace function public.pointage_finish_teacher_course_by_qr(
  p_qr_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_establishment_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;

  select q.establishment_id into v_establishment_id
  from public.pointage_qr_sessions q
  where q.token_digest=encode(extensions.digest(p_qr_token,'sha256'),'hex')
    and q.active=true
    and q.expires_at>now()
  limit 1;

  if v_establishment_id is null then
    raise exception 'QR de pointage expiré ou invalide';
  end if;

  return public.pointage_finish_teacher_course(v_establishment_id,'qr');
end;
$$;

revoke execute on function public.pointage_finish_teacher_course_by_qr(text) from public, anon;
grant execute on function public.pointage_finish_teacher_course_by_qr(text) to authenticated;

create or replace function public.pointage_record_by_code(
  p_establishment_id uuid,
  p_event_type text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.pointage_access_codes%rowtype;
  v_teacher_id uuid;
  v_staff_id uuid;
  v_attendance_id uuid;
  v_started jsonb;
  v_timezone text;
  v_local timestamp;
  v_date date;
  v_lesson public.teacher_lesson_attendance%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_establishment_id,'attendance.manage') then raise exception 'Non autorisé'; end if;
  if p_event_type not in ('arrival','departure','course_start','course_end') then raise exception 'Événement invalide'; end if;

  select * into v_code
  from public.pointage_access_codes
  where establishment_id=p_establishment_id
    and active=true
    and code_digest=encode(extensions.digest(upper(trim(p_code)),'sha256'),'hex')
  limit 1;

  if v_code.id is null then raise exception 'Code de pointage invalide'; end if;

  if not extensions.crypt(upper(trim(p_code)),v_code.code_hash)=v_code.code_hash then
    raise exception 'Code de pointage invalide';
  end if;

  if p_event_type in ('arrival','departure') then
    v_attendance_id := public.pointage_record_staff_event(
      p_establishment_id,v_code.staff_type,v_code.staff_id,
      case when p_event_type='arrival' then 'arrival' else 'departure' end,'code'
    );
    return jsonb_build_object(
      'event_type',p_event_type,
      'staff_type',v_code.staff_type,
      'staff_id',v_code.staff_id,
      'attendance_id',v_attendance_id
    );
  end if;

  if v_code.staff_type <> 'teacher' then
    raise exception 'Seul un enseignant peut pointer un début ou une fin de cours';
  end if;

  v_teacher_id := v_code.staff_id;
  select e.timezone into v_timezone from public.establishments e where e.id=p_establishment_id;
  v_local := now() at time zone v_timezone;
  v_date := v_local::date;

  if p_event_type='course_start' then
    declare
      v_lesson record;
      v_settings record;
      v_credited numeric;
      v_id uuid;
    begin
      select * into v_lesson
      from public.pointage_find_current_lesson(v_teacher_id,p_establishment_id,now());

      if v_lesson.timetable_slot_id is null then
        raise exception 'Aucun cours correspondant à l''emploi du temps actuellement';
      end if;

      select * into v_settings
      from public.pointage_settings ps
      where ps.establishment_id=p_establishment_id
        and (ps.academic_year_id is null or ps.academic_year_id=v_lesson.academic_year_id)
      order by ps.academic_year_id desc nulls last
      limit 1;

      v_credited := case
        when v_lesson.late_minutes <= coalesce(v_settings.full_credit_threshold_minutes,40)
          then coalesce(v_settings.full_credit_hours,2)
        else coalesce(v_settings.partial_credit_hours,1)
      end;

      insert into public.teacher_lesson_attendance(
        establishment_id,academic_year_id,timetable_slot_id,teacher_id,attendance_date,
        started_time,scheduled_hours,counted_hours,credited_minutes,late_minutes,status,start_method,recorded_by
      )
      values(
        p_establishment_id,v_lesson.academic_year_id,v_lesson.timetable_slot_id,v_teacher_id,v_date,
        v_local::time,
        extract(epoch from (v_lesson.scheduled_end-v_lesson.scheduled_start))/3600,
        v_credited,round(v_credited*60),v_lesson.late_minutes,'in_progress','code',(select auth.uid())
      )
      on conflict(teacher_id,timetable_slot_id,attendance_date) do update
      set started_time=coalesce(public.teacher_lesson_attendance.started_time,excluded.started_time),
          status='in_progress',
          start_method=coalesce(public.teacher_lesson_attendance.start_method,excluded.start_method),
          recorded_by=coalesce(public.teacher_lesson_attendance.recorded_by,excluded.recorded_by),
          late_minutes=excluded.late_minutes,
          counted_hours=excluded.counted_hours,
          credited_minutes=excluded.credited_minutes,
          updated_at=now()
      returning id into v_id;

      return jsonb_build_object(
        'event_type','course_start','attendance_id',v_id,'teacher_id',v_teacher_id,
        'timetable_slot_id',v_lesson.timetable_slot_id,'class_id',v_lesson.class_id,
        'subject_id',v_lesson.subject_id,'scheduled_start',v_lesson.scheduled_start,
        'scheduled_end',v_lesson.scheduled_end,'late_minutes',v_lesson.late_minutes,
        'credited_hours',v_credited
      );
    end;
  end if;

  select tla.* into v_lesson
  from public.teacher_lesson_attendance tla
  where tla.teacher_id=v_teacher_id
    and tla.establishment_id=p_establishment_id
    and tla.attendance_date=v_date
    and tla.status='in_progress'
  order by tla.started_time desc
  limit 1
  for update;

  if v_lesson.id is null then raise exception 'Aucun cours en cours à clôturer'; end if;

  update public.teacher_lesson_attendance
  set ended_time=v_local::time,
      actual_duration_minutes=greatest(0,round(extract(epoch from (v_local::time-v_lesson.started_time))/60)::integer),
      end_method='code',
      status='completed',
      updated_at=now()
  where id=v_lesson.id;

  return jsonb_build_object(
    'event_type','course_end',
    'attendance_id',v_lesson.id,
    'teacher_id',v_teacher_id,
    'ended_time',v_local::time,
    'status','completed'
  );
end;
$$;

revoke execute on function public.pointage_record_by_code(uuid,text,text) from public, anon;
grant execute on function public.pointage_record_by_code(uuid,text,text) to authenticated;
