-- Notify only the guardians who may view the affected class timetable.
alter function private.can_view_notification(uuid, text, text, uuid, uuid)
  rename to can_view_notification_base;

create function private.can_view_notification(
  p_establishment_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_account_type public.account_type;
begin
  if p_user_id is null or p_establishment_id is null or p_type is null then
    return false;
  end if;

  if p_type = 'timetable_updated' and p_entity_type = 'timetable_schedule' then
    select pr.account_type into v_account_type
    from public.profiles pr
    where pr.id = p_user_id;

    if v_account_type = 'parent' then
      return exists (
        select 1
        from public.enrollments en
        join public.student_guardians sg
          on sg.student_id = en.student_id
         and sg.establishment_id = en.establishment_id
        where en.establishment_id = p_establishment_id
          and en.class_id = p_entity_id
          and en.status::text = 'active'
          and sg.guardian_user_id = p_user_id
          and sg.active = true
          and sg.can_view_academic = true
      );
    end if;
  end if;

  return private.can_view_notification_base(
    p_establishment_id, p_type, p_entity_type, p_entity_id, p_user_id
  );
end;
$function$;

revoke all on function private.can_view_notification(uuid, text, text, uuid, uuid) from public;
grant execute on function private.can_view_notification(uuid, text, text, uuid, uuid) to authenticated, service_role;

create or replace function private.notify_timetable_change_to_parents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_class_ids uuid[] := array[]::uuid[];
  v_year_ids uuid[] := array[]::uuid[];
  v_class_id uuid;
  v_class_name text;
  v_year_name text;
  v_establishment_id uuid;
  v_action text;
begin
  if tg_op = 'UPDATE' and
     (old.class_subject_id, old.academic_year_id, old.day_of_week, old.starts_at, old.ends_at, old.room)
       is not distinct from
     (new.class_subject_id, new.academic_year_id, new.day_of_week, new.starts_at, new.ends_at, new.room) then
    return new;
  end if;

  if tg_op <> 'INSERT' then
    select cs.class_id into v_class_id
    from public.class_subjects cs where cs.id = old.class_subject_id;
    if v_class_id is not null then v_class_ids := array_append(v_class_ids, v_class_id); end if;
    v_year_ids := array_append(v_year_ids, old.academic_year_id);
  end if;

  if tg_op <> 'DELETE' then
    select cs.class_id into v_class_id
    from public.class_subjects cs where cs.id = new.class_subject_id;
    if v_class_id is not null then v_class_ids := array_append(v_class_ids, v_class_id); end if;
    v_year_ids := array_append(v_year_ids, new.academic_year_id);
  end if;

  v_establishment_id := case when tg_op = 'DELETE' then old.establishment_id else new.establishment_id end;
  v_action := case
    when tg_op = 'INSERT' then 'a ajouté un cours'
    when tg_op = 'DELETE' then 'a supprimé un cours'
    else 'a modifié un cours'
  end;

  for v_class_id in
    select distinct x from unnest(v_class_ids) as x where x is not null
  loop
    select sc.name into v_class_name
    from public.school_classes sc
    where sc.id = v_class_id and sc.establishment_id = v_establishment_id;

    select ay.name into v_year_name
    from public.academic_years ay
    where ay.id = any(v_year_ids) and ay.establishment_id = v_establishment_id
    order by ay.start_date desc
    limit 1;

    insert into public.notifications (
      establishment_id, recipient_user_id, type, title, body, entity_type, entity_id
    )
    select distinct
      v_establishment_id,
      sg.guardian_user_id,
      'timetable_updated',
      'Emploi du temps modifié',
      'L’emploi du temps de la classe ' || coalesce(v_class_name, 'de votre enfant') ||
        ' a été modifié (' || v_action || '). Consultez le nouvel emploi du temps dans votre espace parent.' ||
        case when v_year_name is not null then ' Année scolaire : ' || v_year_name || '.' else '' end,
      'timetable_schedule',
      v_class_id
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    where en.establishment_id = v_establishment_id
      and en.class_id = v_class_id
      and en.academic_year_id = any(v_year_ids)
      and en.status::text = 'active'
      and sg.active = true
      and sg.can_view_academic = true
      and sg.guardian_user_id is not null;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.notify_timetable_change_to_parents() from public, anon, authenticated;
drop trigger if exists trg_notify_timetable_change_to_parents on public.timetable_slots;
create trigger trg_notify_timetable_change_to_parents
after insert or update or delete on public.timetable_slots
for each row execute function private.notify_timetable_change_to_parents();
