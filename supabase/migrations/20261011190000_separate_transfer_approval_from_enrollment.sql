-- Sépare la décision administrative du transfert de la création d'une inscription.
-- Les frais d'inscription impayés laissent l'inscription en attente; un paiement réel l'active.
drop function if exists public.list_student_transfers(uuid);

CREATE OR REPLACE FUNCTION public.review_student_transfer(p_transfer_id uuid, p_decision text, p_class_id uuid DEFAULT NULL::uuid, p_tuition_plan_id uuid DEFAULT NULL::uuid, p_rejection_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_transfer public.student_transfer_requests;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if lower(coalesce(p_decision, '')) not in ('accept', 'reject') then
    raise exception 'Décision invalide';
  end if;

  select * into v_transfer
  from public.student_transfer_requests
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'Dossier de transfert introuvable';
  end if;

  if not private.has_permission(v_transfer.destination_establishment_id, 'students.manage', auth.uid()) then
    raise exception 'Vous ne disposez pas des droits nécessaires pour examiner les transferts';
  end if;

  if v_transfer.status <> 'pending' then
    raise exception 'Ce dossier a déjà été traité';
  end if;

  if lower(p_decision) = 'reject' then
    update public.student_transfer_requests
    set status = 'rejected',
        rejection_reason = nullif(trim(coalesce(p_rejection_reason, '')), ''),
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    where id = p_transfer_id;

    return jsonb_build_object('id', p_transfer_id, 'status', 'rejected');
  end if;

  -- L'accord ne crée ni fiche élève, ni inscription, ni échéance de paiement.
  update public.student_transfer_requests
  set status = 'accepted',
      rejection_reason = null,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_transfer_id;

  return jsonb_build_object(
    'id', p_transfer_id,
    'status', 'accepted',
    'next_step', 'enrollment_pending'
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.list_student_transfers(p_establishment_id uuid)
 RETURNS TABLE(id uuid, code text, source_establishment_id uuid, source_establishment_name text, destination_establishment_id uuid, destination_establishment_name text, source_student_id uuid, requested_grade_level_id uuid, requested_grade_name text, reason text, student_snapshot jsonb, status text, created_at timestamp with time zone, reviewed_at timestamp with time zone, rejection_reason text, destination_student_id uuid, destination_enrollment_id uuid, destination_enrollment_status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not (
    private.has_permission(p_establishment_id, 'students.view', auth.uid())
    or private.has_permission(p_establishment_id, 'students.read', auth.uid())
    or private.has_permission(p_establishment_id, 'students.manage', auth.uid())
    or private.has_permission(p_establishment_id, 'enrollments.view', auth.uid())
    or private.has_permission(p_establishment_id, 'enrollments.read', auth.uid())
    or private.has_permission(p_establishment_id, 'enrollments.manage', auth.uid())
  ) then raise exception 'Accès refusé aux transferts de cet établissement'; end if;
  return query
  select tr.id, tr.code, tr.source_establishment_id, src.name, tr.destination_establishment_id, dst.name,
    tr.source_student_id, tr.requested_grade_level_id, gl.name, tr.reason, tr.student_snapshot,
    tr.status, tr.created_at, tr.reviewed_at, tr.rejection_reason, tr.destination_student_id,
    tr.destination_enrollment_id, en.status::text
  from public.student_transfer_requests tr
  join public.establishments src on src.id = tr.source_establishment_id
  join public.establishments dst on dst.id = tr.destination_establishment_id
  join public.grade_levels gl on gl.id = tr.requested_grade_level_id
  left join public.enrollments en on en.id = tr.destination_enrollment_id
    and en.establishment_id = tr.destination_establishment_id
  where tr.source_establishment_id = p_establishment_id or tr.destination_establishment_id = p_establishment_id
  order by tr.created_at desc;
end;
$function$


CREATE OR REPLACE FUNCTION public.can_finalize_student_transfers(p_establishment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
  select auth.uid() is not null
    and (
      private.is_platform_admin(auth.uid())
      or exists (
        select 1
        from public.establishment_members m
        where m.establishment_id = p_establishment_id
          and m.user_id = auth.uid()
          and m.active = true
          and (
            m.role in ('owner', 'admin', 'secretary')
            or exists (
              select 1 from public.establishment_role_permissions rp
              where rp.role_id = m.role_id
                and rp.permission = 'transfers.finalize'
            )
            or exists (
              select 1 from public.establishment_member_permissions mp
              where mp.establishment_member_id = m.id
                and mp.permission = 'transfers.finalize'
                and mp.effect = 'allow'
            )
          )
      )
    );
$function$


CREATE OR REPLACE FUNCTION public.finalize_student_transfer(p_transfer_id uuid, p_class_id uuid, p_tuition_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_transfer public.student_transfer_requests;
  v_active_year uuid;
  v_student_id uuid;
  v_enrollment_result jsonb;
  v_enrollment_id uuid;
  v_student_number text;
  v_first text;
  v_last text;
  v_birth date;
  v_registration_fee numeric := 0;
  v_registration_paid numeric := 0;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select * into v_transfer from public.student_transfer_requests where id = p_transfer_id for update;
  if not found then raise exception 'Dossier de transfert introuvable'; end if;
  if not public.can_finalize_student_transfers(v_transfer.destination_establishment_id) then
    raise exception 'Seul le secrétariat ou le personnel explicitement autorisé peut finaliser l’inscription';
  end if;
  if v_transfer.status <> 'accepted' then raise exception 'Le transfert doit être accepté avant de préparer l’inscription'; end if;
  if v_transfer.destination_enrollment_id is not null then raise exception 'L’inscription de ce transfert a déjà été préparée'; end if;
  if p_class_id is null or p_tuition_plan_id is null then raise exception 'Choisissez une classe d’accueil et le plan de scolarité'; end if;

  select ay.id into v_active_year from public.academic_years ay
  where ay.establishment_id = v_transfer.destination_establishment_id and ay.status = 'active'
  order by ay.updated_at desc, ay.created_at desc limit 1;
  if v_active_year is null then raise exception 'Aucune année scolaire active dans l’établissement de destination'; end if;

  if not exists (
    select 1 from public.school_classes sc
    where sc.id = p_class_id and sc.establishment_id = v_transfer.destination_establishment_id
      and sc.grade_level_id = v_transfer.requested_grade_level_id and sc.active = true
  ) then raise exception 'La classe ne correspond pas au niveau demandé'; end if;

  select coalesce(tp.registration_fee, 0) into v_registration_fee
  from public.tuition_plans tp
  where tp.id = p_tuition_plan_id and tp.establishment_id = v_transfer.destination_establishment_id
    and tp.academic_year_id = v_active_year and tp.grade_level_id = v_transfer.requested_grade_level_id
    and tp.active = true;
  if not found then raise exception 'Le plan de scolarité ne correspond pas au niveau et à l’année actifs'; end if;

  v_first := nullif(trim(v_transfer.student_snapshot->>'first_name'), '');
  v_last := nullif(trim(v_transfer.student_snapshot->>'last_name'), '');
  if v_first is null or v_last is null then raise exception 'Le dossier ne contient pas le nom complet de l’élève'; end if;
  v_birth := nullif(v_transfer.student_snapshot->>'birth_date', '')::date;

  if exists (
    select 1 from public.students s
    where s.establishment_id = v_transfer.destination_establishment_id and s.active = true
      and s.merged_into_student_id is null
      and lower(trim(s.first_name)) = lower(trim(v_first))
      and lower(trim(s.last_name)) = lower(trim(v_last))
      and s.birth_date is not distinct from v_birth
  ) then raise exception 'Un élève avec le même nom et la même date de naissance existe déjà dans l’école de destination. Vérifiez le dossier avant de continuer.'; end if;

  v_student_number := 'TRF-' || upper(substr(replace(v_transfer.id::text, '-', ''), 1, 10));
  insert into public.students(
    establishment_id, student_number, last_name, first_name, birth_date, place_of_birth,
    sex, phone, email, active, guardian_first_name, guardian_last_name, guardian_phone,
    guardian_email, guardian_address, guardian_relationship
  ) values (
    v_transfer.destination_establishment_id, v_student_number, v_last, v_first, v_birth,
    nullif(v_transfer.student_snapshot->>'place_of_birth', ''), nullif(v_transfer.student_snapshot->>'sex', ''),
    nullif(v_transfer.student_snapshot->>'phone', ''), nullif(v_transfer.student_snapshot->>'email', ''),
    true, nullif(v_transfer.student_snapshot->>'guardian_first_name', ''),
    nullif(v_transfer.student_snapshot->>'guardian_last_name', ''),
    nullif(v_transfer.student_snapshot->>'guardian_phone', ''),
    nullif(v_transfer.student_snapshot->>'guardian_email', ''),
    nullif(v_transfer.student_snapshot->>'guardian_address', ''),
    nullif(v_transfer.student_snapshot->>'guardian_relationship', '')
  ) returning id into v_student_id;

  v_enrollment_result := public.create_student_enrollment_with_schedule(
    v_transfer.destination_establishment_id, v_active_year, p_class_id, p_tuition_plan_id,
    current_date, v_student_id, null, null, null, null, null, null, null, '{}'::uuid[]
  );
  v_enrollment_id := (v_enrollment_result->>'enrollment_id')::uuid;

  select coalesce(ps.amount_due, 0), coalesce(ps.amount_paid, 0)
    into v_registration_fee, v_registration_paid
  from public.payment_schedules ps
  where ps.enrollment_id = v_enrollment_id and ps.category = 'registration'
  order by ps.priority_rank nulls first, ps.due_date limit 1;

  if coalesce(v_registration_fee, 0) > coalesce(v_registration_paid, 0) then
    update public.enrollments set status = 'pending', updated_at = now()
    where id = v_enrollment_id and establishment_id = v_transfer.destination_establishment_id;
  end if;

  insert into public.student_guardians(
    establishment_id, student_id, guardian_user_id, relationship, is_primary,
    can_view_finance, can_view_academic, active
  )
  select v_transfer.destination_establishment_id, v_student_id, sg.guardian_user_id,
    sg.relationship, sg.is_primary, sg.can_view_finance, sg.can_view_academic, sg.active
  from public.student_guardians sg
  where sg.establishment_id = v_transfer.source_establishment_id
    and sg.student_id = v_transfer.source_student_id and sg.active = true
  on conflict (establishment_id, student_id, guardian_user_id) do nothing;

  update public.student_transfer_requests
  set destination_student_id = v_student_id, destination_enrollment_id = v_enrollment_id, updated_at = now()
  where id = p_transfer_id;

  return jsonb_build_object(
    'id', p_transfer_id, 'status', 'accepted', 'student_id', v_student_id,
    'enrollment_id', v_enrollment_id,
    'enrollment_status', case when coalesce(v_registration_fee, 0) > coalesce(v_registration_paid, 0) then 'pending' else 'active' end,
    'academic_year_id', v_active_year
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.complete_source_after_student_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_destination_status text;
begin
  if new.status = 'accepted' and new.destination_enrollment_id is not null then
    select e.status::text into v_destination_status
    from public.enrollments e
    where e.id = new.destination_enrollment_id
      and e.establishment_id = new.destination_establishment_id;

    if v_destination_status = 'active' then
      update public.enrollments
      set status = 'cancelled', updated_at = now()
      where student_id = new.source_student_id
        and establishment_id = new.source_establishment_id
        and status = 'active';

      update public.students
      set active = false, updated_at = now()
      where id = new.source_student_id
        and establishment_id = new.source_establishment_id;
    end if;
  end if;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.activate_transfer_enrollment_after_registration_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_enrollment_id uuid;
begin
  if new.category = 'registration'
     and new.amount_due > 0
     and new.amount_paid >= new.amount_due
     and new.amount_paid > old.amount_paid then
    select e.id into v_enrollment_id
    from public.enrollments e
    join public.student_transfer_requests tr
      on tr.destination_enrollment_id = e.id
     and tr.destination_establishment_id = e.establishment_id
     and tr.status = 'accepted'
    where e.id = new.enrollment_id
      and e.status = 'pending'
    limit 1;

    if v_enrollment_id is not null then
      update public.enrollments
      set status = 'active', updated_at = now()
      where id = v_enrollment_id and status = 'pending';

      update public.student_transfer_requests
      set updated_at = now()
      where destination_enrollment_id = v_enrollment_id
        and status = 'accepted';
    end if;
  end if;
  return new;
end;
$function$


revoke all on function public.review_student_transfer(uuid,text,uuid,uuid,text) from public, anon;
revoke all on function public.list_student_transfers(uuid) from public, anon;
revoke all on function public.can_finalize_student_transfers(uuid) from public, anon;
revoke all on function public.finalize_student_transfer(uuid,uuid,uuid) from public, anon;
revoke all on function public.complete_source_after_student_transfer() from public, anon, authenticated;
revoke all on function public.activate_transfer_enrollment_after_registration_payment() from public, anon, authenticated;
grant execute on function public.review_student_transfer(uuid,text,uuid,uuid,text) to authenticated;
grant execute on function public.list_student_transfers(uuid) to authenticated;
grant execute on function public.can_finalize_student_transfers(uuid) to authenticated;
grant execute on function public.finalize_student_transfer(uuid,uuid,uuid) to authenticated;
drop trigger if exists trg_complete_source_after_student_transfer on public.student_transfer_requests;
create trigger trg_complete_source_after_student_transfer after update of status, destination_enrollment_id, updated_at on public.student_transfer_requests for each row execute function public.complete_source_after_student_transfer();
drop trigger if exists trg_activate_transfer_enrollment_after_registration_payment on public.payment_schedules;
create trigger trg_activate_transfer_enrollment_after_registration_payment after update of amount_paid on public.payment_schedules for each row execute function public.activate_transfer_enrollment_after_registration_payment();
