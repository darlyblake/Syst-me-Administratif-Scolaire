-- Preserve compatibility with the legacy "settings" role permission.
-- The settings-management RLS policies use the granular permission names
-- settings.read/settings.manage, while existing administrator roles store
-- the legacy permission key "settings". Keep the grant scoped to users whose
-- active establishment role explicitly has that legacy permission.

CREATE OR REPLACE FUNCTION private.has_permission(
  p_establishment_id uuid,
  p_permission text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    private.is_platform_admin(p_user_id)
    or exists (
      select 1
      from public.establishment_members m
      left join public.establishment_roles r on r.id = m.role_id
      where m.establishment_id = p_establishment_id
        and m.user_id = p_user_id
        and m.active = true
        and (
          exists (
            select 1
            from public.establishment_role_permissions rp
            where rp.role_id = m.role_id
              and (
                rp.permission = p_permission
                or (
                  p_permission in ('attendance.read','attendance.manage')
                  and rp.permission in ('attendance','attendance.manage')
                )
                or (
                  p_permission in ('settings.read','settings.manage')
                  and rp.permission = 'settings'
                )
              )
          )
          or case p_permission
            when 'school.manage' then m.role in ('owner','admin','director')
            when 'members.manage' then m.role in ('owner','admin','director')
            when 'academic.manage' then m.role in ('owner','admin','director','secretary')
            when 'students.read' then m.role in ('owner','admin','director','secretary','teacher','supervisor')
            when 'students.manage' then m.role in ('owner','admin','director','secretary')
            when 'enrollments.read' then m.role in ('owner','admin','director','secretary','teacher','supervisor')
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
$function$;
