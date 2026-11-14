CREATE OR REPLACE FUNCTION private.has_permission(p_establishment_id uuid, p_permission text, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when p_establishment_id is null or p_permission is null or p_user_id is null then false
    when private.is_platform_admin(p_user_id) then true
    when exists (
      select 1 from public.profiles pr
      where pr.id = p_user_id and pr.account_type = 'teacher'
    ) then false
    else exists (
      select 1
      from public.establishment_members m
      left join lateral (
        select mp.effect
        from public.establishment_member_permissions mp
        where mp.establishment_member_id = m.id
          and mp.permission in (
            p_permission,
            private.permission_category(p_permission),
            private.permission_implied_manage(p_permission)
          )
        order by case
          when mp.permission = p_permission then 0
          when mp.permission = private.permission_category(p_permission) then 1
          else 2
        end
        limit 1
      ) member_override on true
      where m.establishment_id = p_establishment_id
        and m.user_id = p_user_id
        and m.active = true
        and (
          m.role in ('owner','admin','school_admin')
          or case member_override.effect
            when 'revoke' then false
            when 'grant' then true
            else exists (
              select 1 from public.establishment_role_permissions rp
              where rp.role_id = m.role_id
                and rp.permission in (
                  p_permission,
                  private.permission_category(p_permission),
                  private.permission_implied_manage(p_permission)
                )
            )
          end
        )
    )
  end;
$function$;

CREATE OR REPLACE FUNCTION private.can_view_assessment(p_establishment_id uuid, p_class_id uuid, p_subject_id uuid, p_teacher_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select private.has_permission(p_establishment_id, 'grades.view', p_user_id)
    or exists (
      select 1
      from public.teachers t
      join public.class_subjects cs on cs.teacher_id = t.id
      join public.school_classes c on c.id = cs.class_id
      where t.id = p_teacher_id
        and t.profile_id = p_user_id
        and t.establishment_id = p_establishment_id
        and t.active = true
        and cs.class_id = p_class_id
        and cs.subject_id = p_subject_id
        and c.establishment_id = p_establishment_id
    );
$function$;

CREATE OR REPLACE FUNCTION private.can_manage_assessment(p_establishment_id uuid, p_class_id uuid, p_subject_id uuid, p_teacher_id uuid, p_user_id uuid, p_period_id uuid, p_require_open_period boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    (
      private.has_permission(p_establishment_id, 'grades.manage', p_user_id)
      or exists (
        select 1
        from public.teachers t
        join public.class_subjects cs on cs.teacher_id = t.id
        join public.school_classes c on c.id = cs.class_id
        join public.academic_grade_periods p on p.id = p_period_id
        where t.id = p_teacher_id
          and t.profile_id = p_user_id
          and t.establishment_id = p_establishment_id
          and t.active = true
          and cs.class_id = p_class_id
          and cs.subject_id = p_subject_id
          and c.establishment_id = p_establishment_id
          and p.establishment_id = p_establishment_id
          and (not p_require_open_period or (p.entry_open = true and current_date between p.start_date and p.end_date))
      )
    );
$function$;

CREATE OR REPLACE FUNCTION private.can_manage_grade(p_assessment_id uuid, p_student_id uuid, p_user_id uuid, p_require_open_period boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.assessments a
    join public.academic_grade_periods p on p.id = a.period_id
    where a.id = p_assessment_id
      and (
        private.has_permission(a.establishment_id, 'grades.manage', p_user_id)
        or exists (
          select 1
          from public.teachers t
          join public.class_subjects cs on cs.class_id = a.class_id and cs.subject_id = a.subject_id and cs.teacher_id = a.teacher_id
          join public.school_classes c on c.id = a.class_id
          where t.id = a.teacher_id
            and t.profile_id = p_user_id
            and t.establishment_id = a.establishment_id
            and t.active = true
            and c.establishment_id = a.establishment_id
        )
      )
      and exists (
        select 1
        from public.enrollments e
        where e.student_id = p_student_id
          and e.class_id = a.class_id
          and e.establishment_id = a.establishment_id
      )
      and (not p_require_open_period or (p.entry_open = true and current_date between p.start_date and p.end_date))
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_manage_all_attendance(p_establishment_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select private.has_permission(p_establishment_id, 'attendance.manage', p_user_id);
$function$;

CREATE OR REPLACE FUNCTION public.refresh_enrollment_payer_totals(p_enrollment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_establishment_id uuid;
begin
  select establishment_id into v_establishment_id from public.enrollments where id=p_enrollment_id;
  if v_establishment_id is null then return; end if;
  if auth.uid() is null or not private.has_permission(v_establishment_id,'payments.manage') then
    raise exception 'Permission insuffisante pour actualiser les soldes';
  end if;
  update public.enrollments e set
    parent_payable_amount=coalesce((select sum(greatest(ps.amount_due-ps.amount_paid,0)) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='family'),0),
    state_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.payer_type='state'),0),
    organization_expected_amount=coalesce((select sum(ps.amount_due) from public.payment_schedules ps where ps.enrollment_id=e.id and ps.organization_id is not null),0)
  where e.id=p_enrollment_id;
end $function$;


drop policy if exists years_admin_write on public.academic_years;
create policy years_admin_write on public.academic_years for all to authenticated
using (private.has_permission(establishment_id,'classes.manage'))
with check (private.has_permission(establishment_id,'classes.manage'));

drop policy if exists cycles_admin_write on public.education_cycles;
create policy cycles_admin_write on public.education_cycles for all to authenticated
using (private.has_permission(establishment_id,'classes.manage'))
with check (private.has_permission(establishment_id,'classes.manage'));

drop policy if exists levels_admin_write on public.grade_levels;
create policy levels_admin_write on public.grade_levels for all to authenticated
using (exists (
  select 1 from public.education_cycles c
  where c.id=grade_levels.cycle_id and private.has_permission(c.establishment_id,'classes.manage')
))
with check (exists (
  select 1 from public.education_cycles c
  where c.id=grade_levels.cycle_id and private.has_permission(c.establishment_id,'classes.manage')
));

drop policy if exists "School finance admins manage fee overrides" on public.establishment_fee_overrides;
create policy "School finance admins manage fee overrides" on public.establishment_fee_overrides for all to authenticated
using (private.has_permission(establishment_id,'payments.manage'))
with check (private.has_permission(establishment_id,'payments.manage'));

drop policy if exists "School finance admins manage fee settings" on public.establishment_fee_settings;
create policy "School finance admins manage fee settings" on public.establishment_fee_settings for all to authenticated
using (private.has_permission(establishment_id,'payments.manage'))
with check (private.has_permission(establishment_id,'payments.manage'));

drop policy if exists staff_manage on public.staff_members;
create policy staff_manage on public.staff_members for all to authenticated
using (private.has_permission(establishment_id,'staff.manage'))
with check (private.has_permission(establishment_id,'staff.manage'));

drop policy if exists "teacher establishment requests admin update" on public.teacher_establishment_requests;
create policy "teacher establishment requests admin update" on public.teacher_establishment_requests for update to authenticated
using (private.has_permission(establishment_id,'teachers.manage'))
with check (private.has_permission(establishment_id,'teachers.manage'));

drop policy if exists "teacher establishment requests select" on public.teacher_establishment_requests;
create policy "teacher establishment requests select" on public.teacher_establishment_requests for select to authenticated
using (
  requested_by = (select auth.uid())
  or exists (
    select 1 from public.teachers t
    where t.id=teacher_establishment_requests.teacher_id and t.profile_id=(select auth.uid())
  )
  or private.has_permission(establishment_id,'teachers.manage')
);

drop policy if exists teacher_establishments_manager_delete on public.teacher_establishments;
create policy teacher_establishments_manager_delete on public.teacher_establishments for delete to authenticated
using (private.has_permission(establishment_id,'teachers.manage'));
drop policy if exists teacher_establishments_manager_insert on public.teacher_establishments;
create policy teacher_establishments_manager_insert on public.teacher_establishments for insert to authenticated
with check (private.has_permission(establishment_id,'teachers.manage'));
drop policy if exists teacher_establishments_manager_select on public.teacher_establishments;
create policy teacher_establishments_manager_select on public.teacher_establishments for select to authenticated
using (private.has_permission(establishment_id,'teachers.manage'));
drop policy if exists teacher_establishments_manager_update on public.teacher_establishments;
create policy teacher_establishments_manager_update on public.teacher_establishments for update to authenticated
using (private.has_permission(establishment_id,'teachers.manage'))
with check (private.has_permission(establishment_id,'teachers.manage'));

drop policy if exists teachers_manager_insert on public.teachers;
create policy teachers_manager_insert on public.teachers for insert to authenticated
with check (establishment_id is not null and private.has_permission(establishment_id,'teachers.manage'));
drop policy if exists teachers_manager_select on public.teachers;
create policy teachers_manager_select on public.teachers for select to authenticated
using (exists (
  select 1 from public.teacher_establishments te
  where te.teacher_id=teachers.id and te.status='active'
    and private.has_permission(te.establishment_id,'teachers.manage')
));
drop policy if exists teachers_manager_update on public.teachers;
create policy teachers_manager_update on public.teachers for update to authenticated
using (
  exists (
    select 1 from public.teacher_establishments te
    where te.teacher_id=teachers.id and private.has_permission(te.establishment_id,'teachers.manage')
  )
  or (establishment_id is not null and private.has_permission(establishment_id,'teachers.manage'))
)
with check (establishment_id is not null and private.has_permission(establishment_id,'teachers.manage'));
