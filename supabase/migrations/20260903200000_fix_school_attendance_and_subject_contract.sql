-- Keep the school frontend and Supabase contracts aligned.
-- 1) subjects.description is used by the school subject form/service.
-- 2) attendance history uses the dedicated read permission.

alter table public.subjects
  add column if not exists description text;

create or replace function private.has_permission(
  p_establishment_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    private.is_platform_admin(p_user_id)
    or exists (
      select 1
      from public.establishment_members m
      where m.establishment_id = p_establishment_id
        and m.user_id = p_user_id
        and m.active
        and case p_permission
          when 'school.manage' then m.role in ('owner','admin','director')
          when 'members.manage' then m.role in ('owner','admin','director')
          when 'academic.manage' then m.role in ('owner','admin','director','secretary')
          when 'students.manage' then m.role in ('owner','admin','director','secretary')
          when 'enrollments.manage' then m.role in ('owner','admin','director','secretary')
          when 'tuition.manage' then m.role in ('owner','admin','director','accountant')
          when 'payments.manage' then m.role in ('owner','admin','director','accountant')
          when 'grades.manage' then m.role in ('owner','admin','director','teacher')
          when 'attendance.read' then m.role in ('owner','admin','director','teacher','supervisor','secretary')
          when 'attendance.manage' then m.role in ('owner','admin','director','teacher','supervisor')
          when 'teachers.manage' then m.role in ('owner','admin','director')
          when 'staff.manage' then m.role in ('owner','admin','director')
          when 'reports.view' then m.role in ('owner','admin','director','accountant','secretary')
          else false
        end
    )
    or (
      p_permission in ('grades.manage','attendance.manage','attendance.read')
      and exists (
        select 1
        from public.teacher_establishments te
        join public.teachers t on t.id = te.teacher_id
        where te.establishment_id = p_establishment_id
          and te.status = 'active'
          and t.profile_id = p_user_id
          and t.active = true
      )
    );
$$;
