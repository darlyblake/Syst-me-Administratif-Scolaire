-- Enforce establishment permissions at the database boundary.
-- Role modules are explicit grants; per-member revocations take precedence.
-- Only owner/admin accounts have establishment-wide access.

create or replace function private.permission_category(p_permission text)
returns text language sql immutable set search_path = ''
as $function$
  select case
    when p_permission in ('students.read','students.view','students.manage','students.create','students.edit','students.delete') then 'students'
    when p_permission like 'enrollments.%' or p_permission like 'inscriptions.%' then 'inscriptions'
    when p_permission in ('payments.read','payments.view','payments.create','payments.manage','payments.refund','finance.view') then 'finance'
    when p_permission like 'grades.%' or p_permission like 'notes.%' then 'notes'
    when p_permission like 'attendance.%' or p_permission like 'pointage.%' then 'attendance'
    when p_permission like 'documents.%' then 'documents'
    when p_permission like 'staff.%' or p_permission like 'personnel.%' or p_permission like 'payroll.%' or p_permission like 'salaires.%' then 'personnel'
    when p_permission like 'teachers.%' or p_permission like 'enseignants.%' then 'teachers'
    when p_permission like 'classes.%' or p_permission like 'academic.%' or p_permission like 'planning.%' or p_permission = 'subjects.manage' then 'classes'
    when p_permission like 'dashboard.%' then 'dashboard'
    when p_permission like 'messages.%' or p_permission like 'communication.%' then 'communication'
    when p_permission like 'settings.%' or p_permission = 'school.manage' then 'settings'
    when p_permission in ('users.view','users.manage','members.manage') then 'users.manage'
    when p_permission = 'roles.manage' then 'roles.manage'
    when p_permission like 'reports.%' or p_permission like 'rapports.%' then 'reports'
    when p_permission like 'support.%' then 'support'
    else null
  end;
$function$;

create or replace function private.permission_implied_manage(p_permission text)
returns text language sql immutable set search_path = ''
as $function$
  select case
    when p_permission in ('students.read','students.view') then 'students.manage'
    when p_permission in ('enrollments.read','enrollments.view','inscriptions.view') then 'enrollments.manage'
    when p_permission in ('payments.read','payments.view','finance.view') then 'payments.manage'
    when p_permission in ('grades.view','notes.view') then 'grades.manage'
    when p_permission in ('attendance.read','attendance.view','pointage.view') then 'attendance.manage'
    when p_permission = 'documents.view' then 'documents.manage'
    when p_permission in ('staff.view','personnel.view','salaires.view') then 'staff.manage'
    when p_permission in ('teachers.view','enseignants.view') then 'teachers.manage'
    when p_permission in ('classes.view','planning.view') then 'classes.manage'
    when p_permission = 'communication.view' then 'communication.manage'
    when p_permission = 'users.view' then 'users.manage'
    else null
  end;
$function$;

revoke all on function private.permission_category(text) from public, anon;
revoke all on function private.permission_implied_manage(text) from public, anon;
grant execute on function private.permission_category(text) to authenticated, service_role;
grant execute on function private.permission_implied_manage(text) to authenticated, service_role;

create or replace function private.has_permission(
  p_establishment_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select case
    when p_establishment_id is null or p_permission is null or p_user_id is null then false
    when private.is_platform_admin(p_user_id) then true
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

revoke all on function private.has_permission(uuid, text, uuid) from public, anon;
grant execute on function private.has_permission(uuid, text, uuid) to authenticated, service_role;

create or replace function private.has_establishment_permission(p_establishment_id uuid, p_permission text)
returns boolean language sql stable set search_path = ''
as $function$
  select private.has_permission(p_establishment_id, p_permission, auth.uid());
$function$;
revoke all on function private.has_establishment_permission(uuid, text) from public, anon;
grant execute on function private.has_establishment_permission(uuid, text) to authenticated, service_role;

create or replace function public.has_establishment_permission(p_establishment_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select private.has_permission(p_establishment_id, p_permission, auth.uid());
$function$;
revoke all on function public.has_establishment_permission(uuid, text) from public, anon;
grant execute on function public.has_establishment_permission(uuid, text) to authenticated, service_role;

-- Include explicit member grants/revocations in the auth context sent to the browser.
create or replace function public.get_my_auth_context()
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  p public.profiles;
  result jsonb;
  v_has_active boolean;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then return jsonb_build_object('authenticated', false); end if;

  result := jsonb_build_object(
    'authenticated', true, 'user_id', p.id, 'account_type', p.account_type,
    'first_name', p.first_name, 'last_name', p.last_name,
    'email', (select u.email from auth.users u where u.id = p.id)
  );

  if p.account_type = 'platform_admin' then return result; end if;

  if p.account_type = 'parent' then
    return result || jsonb_build_object('establishments', coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select distinct jsonb_build_object(
          'id', e.id, 'name', e.name, 'role', null, 'role_id', null,
          'permissions', '[]'::jsonb, 'revoked_permissions', '[]'::jsonb
        ) x
        from public.student_guardians sg
        join public.establishments e on e.id = sg.establishment_id
        where sg.guardian_user_id = p.id and sg.active = true
      ) s
    ), '[]'::jsonb));
  end if;

  if p.account_type = 'teacher' then
    return result || jsonb_build_object('establishments', coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select jsonb_build_object(
          'id', e.id, 'name', e.name, 'role', 'teacher', 'role_id', null,
          'permissions', jsonb_build_array('attendance'), 'revoked_permissions', '[]'::jsonb
        ) x
        from public.teacher_establishments te
        join public.teachers t on t.id = te.teacher_id
        join public.establishments e on e.id = te.establishment_id
        where t.profile_id = p.id and te.status = 'active' and t.active = true
      ) s
    ), '[]'::jsonb));
  end if;

  if p.account_type = 'school_member' then
    select exists (
      select 1 from public.establishment_members m
      where m.user_id = p.id and m.active = true
    ) into v_has_active;
    if not v_has_active then
      return jsonb_build_object('authenticated', false, 'reason', 'account_disabled');
    end if;

    return result || jsonb_build_object('establishments', coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'role', case
            when m.role in ('owner','admin','school_admin') then 'admin'
            when m.role_id is null then m.role
            when translate(lower(er.name),'àáâäãåçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn') in ('administrateur','admin') then 'admin'
            when translate(lower(er.name),'àáâäçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn') in ('directeur','direction') then 'director'
            when translate(lower(er.name),'àáâäãåçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn') = 'comptable' then 'accountant'
            when translate(lower(er.name),'àáâäãåçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn') = 'secretaire' then 'secretary'
            when translate(lower(er.name),'àáâäãåçéèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn') in ('enseignant','professeur') then 'teacher'
            when translate(lower(er.name),'àáâäãåçéèèêëîïôöùûüÿñ','aaaaaaceeeeiioouuuyn') = 'surveillant' then 'supervisor'
            else m.role
          end,
          'role_id', m.role_id,
          'permissions', coalesce((
            select jsonb_agg(distinct granted.permission order by granted.permission)
            from (
              select rp.permission
              from public.establishment_role_permissions rp
              where rp.role_id = m.role_id
              union
              select mp.permission
              from public.establishment_member_permissions mp
              where mp.establishment_member_id = m.id and mp.effect = 'grant'
            ) granted
          ), '[]'::jsonb),
          'revoked_permissions', coalesce((
            select jsonb_agg(distinct mp.permission order by mp.permission)
            from public.establishment_member_permissions mp
            where mp.establishment_member_id = m.id and mp.effect = 'revoke'
          ), '[]'::jsonb)
        ) x
        from public.establishment_members m
        join public.establishments e on e.id = m.establishment_id
        left join public.establishment_roles er on er.id = m.role_id
        where m.user_id = p.id and m.active = true
      ) s
    ), '[]'::jsonb));
  end if;

  return result;
end;
$function$;
revoke all on function public.get_my_auth_context() from public, anon;
grant execute on function public.get_my_auth_context() to authenticated, service_role;

-- A notification is returned only when its recipient still has permission for its domain.
create or replace function private.can_view_notification(
  p_establishment_id uuid, p_type text, p_entity_type text, p_entity_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean language plpgsql stable security definer set search_path = ''
as $function$
declare v_account_type public.account_type; v_permission text;
begin
  if p_user_id is null or p_establishment_id is null or p_type is null then return false; end if;
  select pr.account_type into v_account_type from public.profiles pr where pr.id = p_user_id;

  if v_account_type = 'parent' then
    case
      when p_type in ('payment_received','payment_overdue') then
        return exists (
          select 1 from public.student_guardians sg
          where sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_finance = true
            and (
              (p_entity_type = 'payment' and exists (
                select 1 from public.payments pay join public.enrollments en on en.id = pay.enrollment_id
                where pay.id = p_entity_id and pay.establishment_id = p_establishment_id
                  and en.student_id = sg.student_id and en.establishment_id = sg.establishment_id
              ))
              or (p_entity_type = 'payment_schedule' and exists (
                select 1 from public.payment_schedules ps join public.enrollments en on en.id = ps.enrollment_id
                where ps.id = p_entity_id and en.student_id = sg.student_id
                  and en.establishment_id = sg.establishment_id
              ))
            )
        );
      when p_type in ('enrollment_created') and p_entity_type = 'enrollment' then
        return exists (
          select 1 from public.enrollments en
          join public.student_guardians sg on sg.student_id = en.student_id
          where en.id = p_entity_id and en.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );
      when p_type = 'option_added' and p_entity_type = 'enrollment_option' then
        return exists (
          select 1 from public.enrollment_options eo
          join public.enrollments en on en.id = eo.enrollment_id
          join public.student_guardians sg on sg.student_id = en.student_id
          where eo.id = p_entity_id and eo.establishment_id = p_establishment_id
            and en.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_finance = true
        );
      when p_type in ('grade_published','grade_updated') and p_entity_type = 'grade' then
        return exists (
          select 1 from public.grades g
          join public.student_guardians sg on sg.student_id = g.student_id
          where g.id = p_entity_id and sg.guardian_user_id = p_user_id
            and sg.establishment_id = p_establishment_id and sg.active = true
            and sg.can_view_academic = true
        );
      when p_type in ('lesson_published','lesson_updated') and p_entity_type = 'lesson' then
        return exists (
          select 1 from public.teacher_lesson_entries le
          join public.timetable_slots ts on ts.id = le.timetable_slot_id
          join public.class_subjects cs on cs.id = ts.class_subject_id
          join public.enrollments en on en.class_id = cs.class_id
          join public.student_guardians sg on sg.student_id = en.student_id
          where le.id = p_entity_id and le.establishment_id = p_establishment_id
            and en.establishment_id = p_establishment_id and en.status::text = 'active'
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );
      when p_type in ('homework_published','homework_updated','homework_removed') and p_entity_type = 'homework' then
        return exists (
          select 1 from public.teacher_homework h
          join public.enrollments en on en.class_id = h.class_id
          join public.student_guardians sg on sg.student_id = en.student_id
          where h.id = p_entity_id and h.establishment_id = p_establishment_id
            and en.establishment_id = p_establishment_id and en.status::text = 'active'
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );
      when p_type in ('attendance_absent','attendance_present','attendance_updated') and p_entity_type = 'attendance' then
        return exists (
          select 1 from public.attendance_records ar
          join public.student_guardians sg on sg.student_id = ar.student_id
          where ar.id = p_entity_id and ar.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );
      when p_type = 'school_event' and p_entity_type = 'school_event' then
        return exists (
          select 1 from public.school_events se
          join public.student_guardians sg on sg.establishment_id = se.establishment_id
          where se.id = p_entity_id and se.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.active = true
        );
      when p_type = 'school_document_submission' and p_entity_type = 'school_document_request' then
        return exists (
          select 1 from public.school_document_requests dr
          join public.student_guardians sg on sg.student_id = dr.student_id
          where dr.id = p_entity_id and dr.establishment_id = p_establishment_id
            and sg.guardian_user_id = p_user_id and sg.establishment_id = p_establishment_id
            and sg.active = true and sg.can_view_academic = true
        );
      else return false;
    end case;
  end if;

  if v_account_type = 'teacher' then
    return exists (
      select 1 from public.teacher_establishments te
      join public.teachers t on t.id = te.teacher_id
      where te.establishment_id = p_establishment_id and te.status = 'active'
        and t.profile_id = p_user_id and t.active = true
        and (
          (p_type in ('lesson_published','lesson_updated') and p_entity_type = 'lesson'
            and exists (select 1 from public.teacher_lesson_entries le where le.id = p_entity_id and le.teacher_id = t.id))
          or (p_type in ('homework_published','homework_updated','homework_removed') and p_entity_type = 'homework'
            and exists (select 1 from public.teacher_homework h where h.id = p_entity_id and h.teacher_id = t.id))
          or p_type like 'attendance_%'
        )
    );
  end if;

  if not exists (
    select 1 from public.establishment_members m
    where m.establishment_id = p_establishment_id and m.user_id = p_user_id and m.active = true
  ) then return false; end if;

  v_permission := case
    when p_type = 'enrollment_created' then 'enrollments.read'
    when p_type in ('payment_overdue','payment_received','option_added') then 'payments.view'
    when p_type in ('grade_published','grade_updated') then 'grades.view'
    when p_type in ('lesson_published','lesson_updated','homework_published','homework_updated','homework_removed') then 'classes.view'
    when p_type like 'attendance_%' then 'attendance.read'
    when p_type = 'school_document_submission' then 'documents.manage'
    when p_type = 'school_event' then 'dashboard.view'
    when p_type = 'support_request_new' then 'support.manage'
    when p_type like 'pointage_%' then 'staff.view'
    else null
  end;
  if v_permission is null then return false; end if;
  return private.has_permission(p_establishment_id, v_permission, p_user_id);
end;
$function$;
revoke all on function private.can_view_notification(uuid, text, text, uuid, uuid) from public, anon;
grant execute on function private.can_view_notification(uuid, text, text, uuid, uuid) to authenticated, service_role;

-- Only the establishment administrator (owner/admin) can read audit history.
drop policy if exists audit_member on public.audit_logs;
create policy audit_member on public.audit_logs for select to authenticated
using (
  establishment_id is not null
  and exists (
    select 1 from public.establishment_members m
    where m.establishment_id = audit_logs.establishment_id
      and m.user_id = (select auth.uid()) and m.active = true
      and m.role in ('owner','admin','school_admin')
  )
);

drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications for select to authenticated
using (
  recipient_user_id = (select auth.uid())
  and private.can_view_notification(establishment_id, type, entity_type, entity_id, (select auth.uid()))
);
drop policy if exists "Parents update own notifications" on public.notifications;
create policy "Parents update own notifications" on public.notifications for update to authenticated
using (
  recipient_user_id = (select auth.uid())
  and private.can_view_notification(establishment_id, type, entity_type, entity_id, (select auth.uid()))
)
with check (
  recipient_user_id = (select auth.uid())
  and private.can_view_notification(establishment_id, type, entity_type, entity_id, (select auth.uid()))
);

create or replace function public.list_notifications_paginated(
  p_establishment_id uuid, p_page integer default 1,
  p_page_size integer default 20, p_unread_only boolean default false
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
  v_total bigint; v_rows jsonb;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_establishment_id is null then raise exception 'Acces refuse'; end if;

  select count(*) into v_total
  from public.notifications n
  where n.establishment_id = p_establishment_id and n.recipient_user_id = auth.uid()
    and (not p_unread_only or n.read_at is null)
    and private.can_view_notification(n.establishment_id, n.type, n.entity_type, n.entity_id, auth.uid());

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_rows
  from (
    select n.id, n.establishment_id, n.type, n.title, n.body, n.entity_type, n.entity_id, n.read_at, n.created_at
    from public.notifications n
    where n.establishment_id = p_establishment_id and n.recipient_user_id = auth.uid()
      and (not p_unread_only or n.read_at is null)
      and private.can_view_notification(n.establishment_id, n.type, n.entity_type, n.entity_id, auth.uid())
    order by n.created_at desc, n.id desc
    limit v_size offset ((v_page - 1) * v_size)
  ) x;

  return jsonb_build_object(
    'data', v_rows, 'page', v_page, 'page_size', v_size, 'total', v_total,
    'total_pages', case when v_total = 0 then 0 else ceil(v_total::numeric / v_size)::integer end
  );
end;
$function$;

create or replace function public.unread_notification_count(p_establishment_id uuid)
returns bigint language plpgsql security definer set search_path = ''
as $function$
declare v_count bigint;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_establishment_id is null then raise exception 'Acces refuse'; end if;
  select count(*) into v_count from public.notifications n
  where n.establishment_id = p_establishment_id and n.recipient_user_id = auth.uid()
    and n.read_at is null
    and private.can_view_notification(n.establishment_id, n.type, n.entity_type, n.entity_id, auth.uid());
  return v_count;
end;
$function$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  update public.notifications n set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id and n.recipient_user_id = auth.uid()
    and private.can_view_notification(n.establishment_id, n.type, n.entity_type, n.entity_id, auth.uid());
  return found;
end;
$function$;

revoke all on function public.list_notifications_paginated(uuid, integer, integer, boolean) from public, anon;
revoke all on function public.unread_notification_count(uuid) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.list_notifications_paginated(uuid, integer, integer, boolean) to authenticated, service_role;
grant execute on function public.unread_notification_count(uuid) to authenticated, service_role;
grant execute on function public.mark_notification_read(uuid) to authenticated, service_role;

-- Finance data is never readable solely through establishment membership.
drop policy if exists payments_member_select on public.payments;
create policy payments_member_select on public.payments for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists expenses_member on public.expenses;
create policy expenses_member on public.expenses for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists accounting_accounts_member on public.accounting_accounts;
create policy accounting_accounts_member on public.accounting_accounts for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists accounting_transactions_member on public.accounting_transactions;
create policy accounting_transactions_member on public.accounting_transactions for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists allocations_member_select on public.payment_allocations;
create policy allocations_member_select on public.payment_allocations for select to authenticated
using (exists (select 1 from public.payments p where p.id = payment_allocations.payment_id and private.has_permission(p.establishment_id, 'payments.view')));
drop policy if exists schedule_member_select on public.payment_schedules;
create policy schedule_member_select on public.payment_schedules for select to authenticated
using (exists (select 1 from public.enrollments e where e.id = payment_schedules.enrollment_id and private.has_permission(e.establishment_id, 'payments.view')));
drop policy if exists tuition_member_select on public.tuition_plans;
create policy tuition_member_select on public.tuition_plans for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists tuition_installment_member_select on public.tuition_plan_installments;
create policy tuition_installment_member_select on public.tuition_plan_installments for select to authenticated
using (exists (select 1 from public.tuition_plans p where p.id = tuition_plan_installments.tuition_plan_id and private.has_permission(p.establishment_id, 'payments.view')));
drop policy if exists "School members view fee overrides" on public.establishment_fee_overrides;
create policy "School members view fee overrides" on public.establishment_fee_overrides for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists "School members view fee settings" on public.establishment_fee_settings;
create policy "School members view fee settings" on public.establishment_fee_settings for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists payments_finance_write on public.payments;
create policy payments_finance_write on public.payments for all to authenticated
using (private.has_permission(establishment_id, 'payments.manage'))
with check (private.has_permission(establishment_id, 'payments.manage'));
drop policy if exists tuition_admin_write on public.tuition_plans;
create policy tuition_admin_write on public.tuition_plans for all to authenticated
using (private.has_permission(establishment_id, 'tuition.manage'))
with check (private.has_permission(establishment_id, 'tuition.manage'));
drop policy if exists tuition_installment_admin_write on public.tuition_plan_installments;
create policy tuition_installment_admin_write on public.tuition_plan_installments for all to authenticated
using (exists (select 1 from public.tuition_plans p where p.id = tuition_plan_installments.tuition_plan_id and private.has_permission(p.establishment_id, 'tuition.manage')))
with check (exists (select 1 from public.tuition_plans p where p.id = tuition_plan_installments.tuition_plan_id and private.has_permission(p.establishment_id, 'tuition.manage')));
drop policy if exists allocations_finance_write on public.payment_allocations;
create policy allocations_finance_write on public.payment_allocations for all to authenticated
using (exists (select 1 from public.payments p where p.id = payment_allocations.payment_id and private.has_permission(p.establishment_id, 'payments.manage')))
with check (exists (select 1 from public.payments p where p.id = payment_allocations.payment_id and private.has_permission(p.establishment_id, 'payments.manage')));
drop policy if exists schedule_finance_write on public.payment_schedules;
create policy schedule_finance_write on public.payment_schedules for all to authenticated
using (exists (select 1 from public.enrollments e where e.id = payment_schedules.enrollment_id and private.has_permission(e.establishment_id, 'payments.manage')))
with check (exists (select 1 from public.enrollments e where e.id = payment_schedules.enrollment_id and private.has_permission(e.establishment_id, 'payments.manage')));

-- Students/enrollments: explicit permissions; teacher and parent scope policies remain separate.
drop policy if exists students_member_select on public.students;
create policy students_member_select on public.students for select to authenticated using (private.has_permission(establishment_id, 'students.read'));
drop policy if exists enrollment_member_select on public.enrollments;
create policy enrollment_member_select on public.enrollments for select to authenticated using (private.has_permission(establishment_id, 'enrollments.read'));
drop policy if exists students_admin_write on public.students;
create policy students_admin_write on public.students for all to authenticated
using (private.has_permission(establishment_id, 'students.manage'))
with check (private.has_permission(establishment_id, 'students.manage'));
drop policy if exists enrollment_admin_write on public.enrollments;
create policy enrollment_admin_write on public.enrollments for all to authenticated
using (private.has_permission(establishment_id, 'enrollments.manage'))
with check (private.has_permission(establishment_id, 'enrollments.manage'));
drop policy if exists student_guardians_member_non_parent on public.student_guardians;
create policy student_guardians_member_non_parent on public.student_guardians for select to authenticated using (private.has_permission(establishment_id, 'students.read'));
drop policy if exists options_member on public.student_options;
create policy options_member on public.student_options for select to authenticated using (private.has_permission(establishment_id, 'payments.view'));
drop policy if exists options_manage on public.student_options;
create policy options_manage on public.student_options for all to authenticated
using (private.has_permission(establishment_id, 'tuition.manage'))
with check (private.has_permission(establishment_id, 'tuition.manage'));

-- Class/academic structure.
drop policy if exists classes_member_select on public.school_classes;
create policy classes_member_select on public.school_classes for select to authenticated using (private.has_permission(establishment_id, 'classes.view'));
drop policy if exists classes_admin_write on public.school_classes;
create policy classes_admin_write on public.school_classes for all to authenticated
using (private.has_permission(establishment_id, 'classes.manage'))
with check (private.has_permission(establishment_id, 'classes.manage'));
drop policy if exists class_subjects_member on public.class_subjects;
create policy class_subjects_member on public.class_subjects for select to authenticated
using (exists (select 1 from public.school_classes c where c.id = class_subjects.class_id and private.has_permission(c.establishment_id, 'classes.view')));
drop policy if exists class_subjects_manage on public.class_subjects;
create policy class_subjects_manage on public.class_subjects for all to authenticated
using (exists (select 1 from public.school_classes c where c.id = class_subjects.class_id and private.has_permission(c.establishment_id, 'classes.manage')))
with check (exists (select 1 from public.school_classes c where c.id = class_subjects.class_id and private.has_permission(c.establishment_id, 'classes.manage')));
drop policy if exists timetable_member on public.timetable_slots;
create policy timetable_member on public.timetable_slots for select to authenticated using (private.has_permission(establishment_id, 'classes.view'));
drop policy if exists timetable_manage on public.timetable_slots;
create policy timetable_manage on public.timetable_slots for all to authenticated
using (private.has_permission(establishment_id, 'academic.manage'))
with check (private.has_permission(establishment_id, 'academic.manage'));
drop policy if exists "subjects establishment access" on public.subjects;
drop policy if exists subjects_member on public.subjects;
create policy subjects_member on public.subjects for select to authenticated
using (private.has_permission(establishment_id, 'classes.view') or private.has_permission(establishment_id, 'grades.view'));
drop policy if exists subjects_manage on public.subjects;
create policy subjects_manage on public.subjects for all to authenticated
using (private.has_permission(establishment_id, 'classes.manage'))
with check (private.has_permission(establishment_id, 'classes.manage'));
drop policy if exists "subjects managers write" on public.subjects;
create policy "subjects managers write" on public.subjects for all to authenticated
using (private.has_permission(establishment_id, 'classes.manage'))
with check (private.has_permission(establishment_id, 'classes.manage'));
drop policy if exists pointage_settings_member_select on public.pointage_settings;
create policy pointage_settings_member_select on public.pointage_settings for select to authenticated using (private.has_permission(establishment_id, 'attendance.view'));

-- Personnel/payroll data: separate from ordinary school membership.
drop policy if exists members_manage on public.establishment_members;
create policy members_manage on public.establishment_members for all to authenticated
using (private.has_permission(establishment_id, 'users.manage'))
with check (private.has_permission(establishment_id, 'users.manage'));
drop policy if exists members_select on public.establishment_members;
create policy members_select on public.establishment_members for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists staff_member on public.staff_members;
create policy staff_member on public.staff_members for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists staff_attendance_member on public.staff_attendance;
create policy staff_attendance_member on public.staff_attendance for select to authenticated
using (private.has_permission(establishment_id, 'attendance.view') or private.has_permission(establishment_id, 'staff.view'));
drop policy if exists leave_member on public.leave_requests;
create policy leave_member on public.leave_requests for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists overtime_member on public.overtime_records;
create policy overtime_member on public.overtime_records for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));

drop policy if exists staff_compensations_member_select on public.staff_compensations;
create policy staff_compensations_member_select on public.staff_compensations for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists staff_compensations_member_insert on public.staff_compensations;
create policy staff_compensations_member_insert on public.staff_compensations for insert to authenticated with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists staff_compensations_member_update on public.staff_compensations;
create policy staff_compensations_member_update on public.staff_compensations for update to authenticated
using (private.has_permission(establishment_id, 'staff.manage')) with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists staff_compensations_member_delete on public.staff_compensations;
create policy staff_compensations_member_delete on public.staff_compensations for delete to authenticated using (private.has_permission(establishment_id, 'staff.manage'));

drop policy if exists payroll_academic_year_settings_member_select on public.payroll_academic_year_settings;
create policy payroll_academic_year_settings_member_select on public.payroll_academic_year_settings for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists payroll_academic_year_settings_member_insert on public.payroll_academic_year_settings;
create policy payroll_academic_year_settings_member_insert on public.payroll_academic_year_settings for insert to authenticated with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_academic_year_settings_member_update on public.payroll_academic_year_settings;
create policy payroll_academic_year_settings_member_update on public.payroll_academic_year_settings for update to authenticated
using (private.has_permission(establishment_id, 'staff.manage')) with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_academic_year_settings_member_delete on public.payroll_academic_year_settings;
create policy payroll_academic_year_settings_member_delete on public.payroll_academic_year_settings for delete to authenticated using (private.has_permission(establishment_id, 'staff.manage'));

drop policy if exists payroll_advances_member_select on public.payroll_advances;
create policy payroll_advances_member_select on public.payroll_advances for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists payroll_advances_member_insert on public.payroll_advances;
create policy payroll_advances_member_insert on public.payroll_advances for insert to authenticated with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_entry_member on public.payroll_entries;
create policy payroll_entry_member on public.payroll_entries for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists payroll_entry_manage on public.payroll_entries;
create policy payroll_entry_manage on public.payroll_entries for all to authenticated
using (private.has_permission(establishment_id, 'staff.manage')) with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_payment_allocations_member_select on public.payroll_payment_allocations;
create policy payroll_payment_allocations_member_select on public.payroll_payment_allocations for select to authenticated
using (exists (select 1 from public.payroll_payments p where p.id = payroll_payment_allocations.payment_id and private.has_permission(p.establishment_id, 'staff.view')));
drop policy if exists payroll_payment_allocations_member_insert on public.payroll_payment_allocations;
create policy payroll_payment_allocations_member_insert on public.payroll_payment_allocations for insert to authenticated
with check (exists (
  select 1 from public.payroll_payments p
  join public.payroll_entries e on e.establishment_id = p.establishment_id
  where p.id = payroll_payment_allocations.payment_id and e.id = payroll_payment_allocations.payroll_entry_id
    and private.has_permission(p.establishment_id, 'staff.manage')
));
drop policy if exists payroll_payments_member_select on public.payroll_payments;
create policy payroll_payments_member_select on public.payroll_payments for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists payroll_payments_member_insert on public.payroll_payments;
create policy payroll_payments_member_insert on public.payroll_payments for insert to authenticated with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_period_member on public.payroll_periods;
create policy payroll_period_member on public.payroll_periods for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists payroll_period_manage on public.payroll_periods;
create policy payroll_period_manage on public.payroll_periods for all to authenticated
using (private.has_permission(establishment_id, 'staff.manage')) with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_settings_member_select on public.payroll_settings;
create policy payroll_settings_member_select on public.payroll_settings for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists payroll_settings_member_insert on public.payroll_settings;
create policy payroll_settings_member_insert on public.payroll_settings for insert to authenticated with check (private.has_permission(establishment_id, 'staff.manage'));
drop policy if exists payroll_settings_member_update on public.payroll_settings;
create policy payroll_settings_member_update on public.payroll_settings for update to authenticated
using (private.has_permission(establishment_id, 'staff.manage')) with check (private.has_permission(establishment_id, 'staff.manage'));

-- Documents, attendance requests and conversations.
drop policy if exists documents_member on public.documents;
create policy documents_member on public.documents for select to authenticated using (private.has_permission(establishment_id, 'documents.view'));
drop policy if exists document_requests_school_read on public.document_requests;
create policy document_requests_school_read on public.document_requests for select to authenticated
using (private.has_permission(establishment_id, 'documents.view') or target_profile_id = (select auth.uid()) or requested_by = (select auth.uid()));
drop policy if exists "School members manage document requests" on public.parent_document_requests;
create policy "School members manage document requests" on public.parent_document_requests for all to authenticated
using (private.has_permission(establishment_id, 'documents.manage')) with check (private.has_permission(establishment_id, 'documents.manage'));
drop policy if exists "School members manage school document requests" on public.school_document_requests;
create policy "School members manage school document requests" on public.school_document_requests for all to authenticated
using (private.has_permission(establishment_id, 'documents.manage')) with check (private.has_permission(establishment_id, 'documents.manage'));
drop policy if exists "School members manage attendance justification requests" on public.attendance_justification_requests;
create policy "School members manage attendance justification requests" on public.attendance_justification_requests for all to authenticated
using (private.has_permission(establishment_id, 'attendance.manage')) with check (private.has_permission(establishment_id, 'attendance.manage'));
drop policy if exists "School members manage attendance summary settings" on public.attendance_summary_settings;
create policy "School members manage attendance summary settings" on public.attendance_summary_settings for all to authenticated
using (private.has_permission(establishment_id, 'attendance.manage')) with check (private.has_permission(establishment_id, 'attendance.manage'));
drop policy if exists "School members view document request attachments" on public.parent_document_request_attachments;
create policy "School members view document request attachments" on public.parent_document_request_attachments for select to authenticated
using (exists (
  select 1 from public.parent_document_requests r
  where r.id = parent_document_request_attachments.request_id
    and private.has_permission(r.establishment_id, 'documents.manage')
));
drop policy if exists conversations_member_non_parent on public.conversations;
create policy conversations_member_non_parent on public.conversations for select to authenticated
using (
  exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversations.id and cp.user_id = (select auth.uid()))
  or private.has_permission(establishment_id, 'communication.view')
);
drop policy if exists conversations_manage_non_parent on public.conversations;
create policy conversations_manage_non_parent on public.conversations for all to authenticated
using (private.has_permission(establishment_id, 'communication.manage'))
with check (private.has_permission(establishment_id, 'communication.manage'));

-- Sensitive administration of accounts and role permissions.
drop policy if exists members_manage on public.establishment_members;
create policy members_manage on public.establishment_members for all to authenticated
using (private.has_permission(establishment_id, 'users.manage'))
with check (private.has_permission(establishment_id, 'users.manage'));
drop policy if exists members_select on public.establishment_members;
create policy members_select on public.establishment_members for select to authenticated using (private.has_permission(establishment_id, 'staff.view'));
drop policy if exists "admin manage member permissions" on public.establishment_member_permissions;
create policy "admin manage member permissions" on public.establishment_member_permissions for all to authenticated
using (exists (
  select 1 from public.establishment_members me
  join public.establishment_members target on target.establishment_id = me.establishment_id
  where target.id = establishment_member_permissions.establishment_member_id
    and me.user_id = (select auth.uid()) and me.active = true
    and me.role in ('owner','admin','school_admin')
))
with check (exists (
  select 1 from public.establishment_members me
  join public.establishment_members target on target.establishment_id = me.establishment_id
  where target.id = establishment_member_permissions.establishment_member_id
    and me.user_id = (select auth.uid()) and me.active = true
    and me.role in ('owner','admin','school_admin')
));
drop policy if exists "role permissions select" on public.establishment_role_permissions;
create policy "role permissions select" on public.establishment_role_permissions for select to authenticated
using (exists (
  select 1 from public.establishment_roles r
  where r.id = establishment_role_permissions.role_id and private.has_permission(r.establishment_id, 'roles.manage')
));
drop policy if exists "establishment roles select" on public.establishment_roles;
create policy "establishment roles select" on public.establishment_roles for select to authenticated
using (private.has_permission(establishment_id, 'roles.manage'));

-- Restrict settings that contain financial or attendance configuration.
drop policy if exists pointage_settings_member_select on public.pointage_settings;
create policy pointage_settings_member_select on public.pointage_settings for select to authenticated using (private.has_permission(establishment_id, 'attendance.view'));
drop policy if exists events_member on public.school_events;
create policy events_member on public.school_events for select to authenticated
using (private.has_permission(establishment_id, 'dashboard.view') or private.has_permission(establishment_id, 'school.events.view'));
drop policy if exists academic_grade_periods_select_member on public.academic_grade_periods;
create policy academic_grade_periods_select_member on public.academic_grade_periods for select to authenticated using (private.has_permission(establishment_id, 'grades.view'));
