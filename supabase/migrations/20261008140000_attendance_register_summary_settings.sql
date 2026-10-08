create table if not exists public.attendance_summary_settings (
 id uuid primary key default gen_random_uuid(),
 establishment_id uuid not null references public.establishments(id) on delete cascade,
 academic_year_id uuid not null references public.academic_years(id) on delete cascade,
 reset_period text not null default 'term' check (reset_period in ('week','month','term','semester','year')),
 include_justified_in_bulletin boolean not null default false,
 updated_at timestamptz not null default now(),
 unique(establishment_id,academic_year_id)
);
alter table public.attendance_summary_settings enable row level security;
drop policy if exists "School members manage attendance summary settings" on public.attendance_summary_settings;
create policy "School members manage attendance summary settings" on public.attendance_summary_settings for all to authenticated using (private.is_member(establishment_id)) with check (private.is_member(establishment_id));
alter table public.attendance_records add column if not exists duration_minutes integer;
update public.attendance_records ar set duration_minutes=round(extract(epoch from (ts.ends_at-ts.starts_at))/60)::integer from public.timetable_slots ts where ar.duration_minutes is null and ar.lesson_key=ts.id::text and ar.status='absent';
create index if not exists idx_attendance_records_register on public.attendance_records(establishment_id,class_id,attendance_date,lesson_key);
create or replace function public.get_attendance_register_summary(p_establishment_id uuid,p_class_id uuid,p_start_date date,p_end_date date)
returns table(student_id uuid,student_number text,last_name text,first_name text,absent_minutes bigint,late_count bigint,late_minutes bigint,present_count bigint,justified_count bigint)
language sql security invoker set search_path=public as $$
select s.id,s.student_number,s.last_name,s.first_name,
coalesce(sum(case when ar.status='absent' then coalesce(ar.duration_minutes,0) else 0 end),0)::bigint,
count(*) filter(where ar.status='late')::bigint,
coalesce(sum(case when ar.status='late' then coalesce(ar.duration_minutes,0) else 0 end),0)::bigint,
count(*) filter(where ar.status='present')::bigint,
count(*) filter(where ar.status in ('justified','excused'))::bigint
from public.enrollments e join public.students s on s.id=e.student_id
left join public.attendance_records ar on ar.student_id=s.id and ar.class_id=e.class_id and ar.establishment_id=e.establishment_id and ar.attendance_date between p_start_date and p_end_date
where e.establishment_id=p_establishment_id and e.class_id=p_class_id and e.status='active'
group by s.id,s.student_number,s.last_name,s.first_name
order by s.last_name,s.first_name
$$;
grant execute on function public.get_attendance_register_summary(uuid,uuid,date,date) to authenticated;