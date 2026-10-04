create table if not exists public.teacher_lesson_entries (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  timetable_slot_id uuid not null references public.timetable_slots(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  lesson_date date not null,
  topic text not null default '',
  content text not null default '',
  activities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (timetable_slot_id, lesson_date)
);

create table if not exists public.teacher_homework (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  timetable_slot_id uuid not null references public.timetable_slots(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  lesson_entry_id uuid references public.teacher_lesson_entries(id) on delete set null,
  title text not null default 'Devoir',
  instructions text not null,
  due_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_lesson_entries_teacher_date_idx on public.teacher_lesson_entries(teacher_id, lesson_date desc);
create index if not exists teacher_lesson_entries_establishment_date_idx on public.teacher_lesson_entries(establishment_id, lesson_date desc);
create index if not exists teacher_homework_teacher_due_idx on public.teacher_homework(teacher_id, due_date);
create index if not exists teacher_homework_class_idx on public.teacher_homework(class_id, due_date);

alter table public.teacher_lesson_entries enable row level security;
alter table public.teacher_homework enable row level security;

drop policy if exists teacher_lesson_entries_teacher_select on public.teacher_lesson_entries;
create policy teacher_lesson_entries_teacher_select on public.teacher_lesson_entries
for select to authenticated using (
  exists (
    select 1 from public.teachers t
    join public.teacher_establishments te on te.teacher_id=t.id
    where t.id=teacher_lesson_entries.teacher_id
      and t.profile_id=(select auth.uid()) and t.active=true
      and te.establishment_id=teacher_lesson_entries.establishment_id
      and te.status='active'
  )
);

drop policy if exists teacher_homework_teacher_select on public.teacher_homework;
create policy teacher_homework_teacher_select on public.teacher_homework
for select to authenticated using (
  exists (
    select 1 from public.teachers t
    join public.teacher_establishments te on te.teacher_id=t.id
    where t.id=teacher_homework.teacher_id
      and t.profile_id=(select auth.uid()) and t.active=true
      and te.establishment_id=teacher_homework.establishment_id
      and te.status='active'
  )
);

create or replace function public.teacher_lesson_entries(p_establishment_id uuid,p_from date default null,p_to date default null)
returns table(id uuid,establishment_id uuid,academic_year_id uuid,timetable_slot_id uuid,teacher_id uuid,lesson_date date,class_id uuid,class_name text,subject_id uuid,subject_name text,starts_at time,ends_at time,room text,topic text,content text,activities text,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not exists (
    select 1 from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
    where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
  ) then raise exception 'Enseignant non rattaché à cet établissement'; end if;
  return query
  select e.id,e.establishment_id,e.academic_year_id,e.timetable_slot_id,e.teacher_id,e.lesson_date,
         cs.class_id,c.name,cs.subject_id,s.name,ts.starts_at,ts.ends_at,ts.room,
         e.topic,e.content,e.activities,e.created_at,e.updated_at
  from public.teacher_lesson_entries e
  join public.timetable_slots ts on ts.id=e.timetable_slot_id
  join public.class_subjects cs on cs.id=ts.class_subject_id
  join public.school_classes c on c.id=cs.class_id
  join public.subjects s on s.id=cs.subject_id
  where e.teacher_id in (
    select t.id from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
    where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
  )
  and e.establishment_id=p_establishment_id
  and (p_from is null or e.lesson_date>=p_from)
  and (p_to is null or e.lesson_date<=p_to)
  order by e.lesson_date desc,ts.starts_at;
end;
$$;

create or replace function public.teacher_save_lesson_entry(p_establishment_id uuid,p_timetable_slot_id uuid,p_lesson_date date,p_topic text,p_content text,p_activities text default null)
returns uuid
language plpgsql security definer set search_path to ''
as $$
declare v_teacher_id uuid; v_academic_year_id uuid; v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  select t.id into v_teacher_id
  from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
  where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
  order by t.created_at limit 1;
  if v_teacher_id is null then raise exception 'Enseignant non rattaché à cet établissement'; end if;
  select ts.academic_year_id into v_academic_year_id
  from public.timetable_slots ts join public.class_subjects cs on cs.id=ts.class_subject_id
  where ts.id=p_timetable_slot_id and ts.establishment_id=p_establishment_id and cs.teacher_id=v_teacher_id
    and (ts.day_of_week)::numeric=extract(isodow from p_lesson_date);
  if v_academic_year_id is null then raise exception 'Séance non autorisée pour cet enseignant'; end if;
  insert into public.teacher_lesson_entries(establishment_id,academic_year_id,timetable_slot_id,teacher_id,lesson_date,topic,content,activities,updated_at)
  values(p_establishment_id,v_academic_year_id,p_timetable_slot_id,v_teacher_id,p_lesson_date,coalesce(trim(p_topic),''),coalesce(trim(p_content),''),nullif(trim(p_activities),''),now())
  on conflict(timetable_slot_id,lesson_date) do update set topic=excluded.topic,content=excluded.content,activities=excluded.activities,updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.teacher_homework(p_establishment_id uuid,p_from date default null,p_to date default null)
returns table(id uuid,timetable_slot_id uuid,lesson_entry_id uuid,class_id uuid,class_name text,subject_id uuid,subject_name text,lesson_date date,title text,instructions text,due_date date,active boolean,created_at timestamptz,updated_at timestamptz)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise'; end if;
  if not exists (
    select 1 from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
    where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
  ) then raise exception 'Enseignant non rattaché à cet établissement'; end if;
  return query
  select h.id,h.timetable_slot_id,h.lesson_entry_id,h.class_id,c.name,h.subject_id,s.name,
         coalesce(le.lesson_date,(h.created_at at time zone e.timezone)::date),h.title,h.instructions,h.due_date,h.active,h.created_at,h.updated_at
  from public.teacher_homework h
  join public.school_classes c on c.id=h.class_id
  join public.subjects s on s.id=h.subject_id
  join public.establishments e on e.id=h.establishment_id
  left join public.teacher_lesson_entries le on le.id=h.lesson_entry_id
  where h.teacher_id in (
    select t.id from public.teachers t join public.teacher_establishments te on te.teacher_id=t.id
    where t.profile_id=(select auth.uid()) and t.active=true and te.establishment_id=p_establishment_id and te.status='active'
  )
  and h.establishment_id=p_establishment_id and h.active=true
  and (p_from is null or coalesce(le.lesson_date,(h.created_at at time zone e.timezone)::date)>=p_from)
  and (p_to is null or coalesce(le.lesson_date,(h.created_at at time zone e.timezone)::date)<=p_to)
  order by h.due_date nulls last,h.created_at desc;
end;
$$;

revoke all on public.teacher_lesson_entries,public.teacher_homework from anon,authenticated;
grant select on public.teacher_lesson_entries,public.teacher_homework to authenticated;

revoke all on function public.teacher_lesson_entries(uuid,date,date) from public,anon;
grant execute on function public.teacher_lesson_entries(uuid,date,date) to authenticated;
revoke all on function public.teacher_save_lesson_entry(uuid,uuid,date,text,text,text) from public,anon;
grant execute on function public.teacher_save_lesson_entry(uuid,uuid,date,text,text,text) to authenticated;
revoke all on function public.teacher_homework(uuid,date,date) from public,anon;
grant execute on function public.teacher_homework(uuid,date,date) to authenticated;
