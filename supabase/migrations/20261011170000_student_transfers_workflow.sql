create table if not exists public.student_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  source_establishment_id uuid not null references public.establishments(id),
  destination_establishment_id uuid not null references public.establishments(id),
  source_student_id uuid not null references public.students(id),
  requested_grade_level_id uuid not null references public.grade_levels(id),
  reason text not null,
  student_snapshot jsonb not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  destination_student_id uuid references public.students(id),
  destination_enrollment_id uuid references public.enrollments(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_transfer_different_establishments check (source_establishment_id <> destination_establishment_id)
);

create index if not exists idx_student_transfer_destination_status on public.student_transfer_requests(destination_establishment_id, status, created_at desc);
create index if not exists idx_student_transfer_source_status on public.student_transfer_requests(source_establishment_id, status, created_at desc);
alter table public.student_transfer_requests enable row level security;
revoke all on public.student_transfer_requests from anon, authenticated;

create or replace function public.create_student_transfer(p_source_establishment_id uuid,p_student_id uuid,p_destination_establishment_id uuid,p_requested_grade_level_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_student public.students; v_current_class text; v_current_level text; v_snapshot jsonb; v_code text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if not private.has_permission(p_source_establishment_id,'students.view',auth.uid()) then raise exception 'Vous ne pouvez pas consulter les élèves de cet établissement'; end if;
  if not private.has_permission(p_source_establishment_id,'enrollments.create',auth.uid()) then raise exception 'Permission insuffisante pour initier un transfert'; end if;
  if p_source_establishment_id = p_destination_establishment_id then raise exception 'Choisissez un établissement différent'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Le motif du transfert est obligatoire'; end if;
  select * into v_student from public.students s where s.id=p_student_id and s.establishment_id=p_source_establishment_id and s.active=true and s.merged_into_student_id is null;
  if not found then raise exception 'Élève introuvable ou inactif dans l’établissement source'; end if;
  if not exists(select 1 from public.establishments e where e.id=p_destination_establishment_id and e.status='active') then raise exception 'Établissement de destination indisponible'; end if;
  if not exists(select 1 from public.grade_levels gl join public.education_cycles ec on ec.id=gl.cycle_id where gl.id=p_requested_grade_level_id and gl.active=true and ec.active=true and ec.establishment_id=p_destination_establishment_id) then raise exception 'Le niveau choisi ne correspond pas à l’établissement de destination'; end if;
  select sc.name,gl.name into v_current_class,v_current_level from public.enrollments en left join public.school_classes sc on sc.id=en.class_id left join public.grade_levels gl on gl.id=sc.grade_level_id where en.student_id=p_student_id and en.establishment_id=p_source_establishment_id and en.status='active' order by en.created_at desc limit 1;
  v_snapshot:=jsonb_build_object('source_student_number',v_student.student_number,'first_name',v_student.first_name,'last_name',v_student.last_name,'birth_date',v_student.birth_date,'place_of_birth',v_student.place_of_birth,'sex',v_student.sex,'phone',v_student.phone,'email',v_student.email,'guardian_first_name',v_student.guardian_first_name,'guardian_last_name',v_student.guardian_last_name,'guardian_phone',v_student.guardian_phone,'guardian_email',v_student.guardian_email,'guardian_address',v_student.guardian_address,'guardian_relationship',v_student.guardian_relationship,'source_class_name',v_current_class,'source_grade_name',v_current_level);
  v_code:='TRF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.student_transfer_requests(code,source_establishment_id,destination_establishment_id,source_student_id,requested_grade_level_id,reason,student_snapshot,created_by)
  values(v_code,p_source_establishment_id,p_destination_establishment_id,p_student_id,p_requested_grade_level_id,trim(p_reason),v_snapshot,auth.uid()) returning id into v_id;
  return jsonb_build_object('id',v_id,'code',v_code,'status','pending');
end; $$;

create or replace function public.list_student_transfers(p_establishment_id uuid)
returns table(id uuid,code text,source_establishment_id uuid,source_establishment_name text,destination_establishment_id uuid,destination_establishment_name text,source_student_id uuid,requested_grade_level_id uuid,requested_grade_name text,reason text,student_snapshot jsonb,status text,created_at timestamptz,reviewed_at timestamptz,rejection_reason text,destination_student_id uuid,destination_enrollment_id uuid)
language plpgsql stable security definer set search_path=public,private,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 if not (private.has_permission(p_establishment_id,'students.view',auth.uid()) or private.has_permission(p_establishment_id,'enrollments.view',auth.uid())) then raise exception 'Accès refusé aux transferts de cet établissement'; end if;
 return query select tr.id,tr.code,tr.source_establishment_id,src.name,tr.destination_establishment_id,dst.name,tr.source_student_id,tr.requested_grade_level_id,gl.name,tr.reason,tr.student_snapshot,tr.status,tr.created_at,tr.reviewed_at,tr.rejection_reason,tr.destination_student_id,tr.destination_enrollment_id
 from public.student_transfer_requests tr join public.establishments src on src.id=tr.source_establishment_id join public.establishments dst on dst.id=tr.destination_establishment_id join public.grade_levels gl on gl.id=tr.requested_grade_level_id
 where tr.source_establishment_id=p_establishment_id or tr.destination_establishment_id=p_establishment_id order by tr.created_at desc;
end; $$;

create or replace function public.review_student_transfer(p_transfer_id uuid,p_decision text,p_class_id uuid default null,p_tuition_plan_id uuid default null,p_rejection_reason text default null)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_transfer public.student_transfer_requests; v_active_year uuid; v_student_id uuid; v_enrollment_result jsonb; v_enrollment_id uuid; v_student_number text; v_first text; v_last text; v_birth date;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 if lower(coalesce(p_decision,'')) not in ('accept','reject') then raise exception 'Décision invalide'; end if;
 select * into v_transfer from public.student_transfer_requests where id=p_transfer_id for update;
 if not found then raise exception 'Dossier de transfert introuvable'; end if;
 if not private.has_permission(v_transfer.destination_establishment_id,'students.manage',auth.uid()) or not private.has_permission(v_transfer.destination_establishment_id,'enrollments.manage',auth.uid()) then raise exception 'Vous ne disposez pas des droits nécessaires pour traiter ce transfert'; end if;
 if v_transfer.status<>'pending' then raise exception 'Ce dossier a déjà été traité'; end if;
 if lower(p_decision)='reject' then
  update public.student_transfer_requests set status='rejected',rejection_reason=nullif(trim(coalesce(p_rejection_reason,'')),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_transfer_id;
  return jsonb_build_object('id',p_transfer_id,'status','rejected');
 end if;
 if p_class_id is null or p_tuition_plan_id is null then raise exception 'Choisissez une classe d’accueil et le plan de scolarité'; end if;
 select ay.id into v_active_year from public.academic_years ay where ay.establishment_id=v_transfer.destination_establishment_id and ay.status='active' order by ay.updated_at desc,ay.created_at desc limit 1;
 if v_active_year is null then raise exception 'Aucune année scolaire active dans l’établissement de destination'; end if;
 if not exists(select 1 from public.school_classes sc where sc.id=p_class_id and sc.establishment_id=v_transfer.destination_establishment_id and sc.grade_level_id=v_transfer.requested_grade_level_id and sc.active=true) then raise exception 'La classe ne correspond pas au niveau demandé'; end if;
 if not exists(select 1 from public.tuition_plans tp where tp.id=p_tuition_plan_id and tp.establishment_id=v_transfer.destination_establishment_id and tp.academic_year_id=v_active_year and tp.grade_level_id=v_transfer.requested_grade_level_id and tp.active=true) then raise exception 'Le plan de scolarité ne correspond pas au niveau et à l’année actifs'; end if;
 v_first:=nullif(trim(v_transfer.student_snapshot->>'first_name'),''); v_last:=nullif(trim(v_transfer.student_snapshot->>'last_name'),'');
 if v_first is null or v_last is null then raise exception 'Le dossier ne contient pas le nom complet de l’élève'; end if;
 v_birth:=nullif(v_transfer.student_snapshot->>'birth_date','')::date;
 if exists(select 1 from public.students s where s.establishment_id=v_transfer.destination_establishment_id and s.active=true and s.merged_into_student_id is null and lower(trim(s.first_name))=lower(trim(v_first)) and lower(trim(s.last_name))=lower(trim(v_last)) and s.birth_date is not distinct from v_birth) then raise exception 'Un élève avec le même nom et la même date de naissance existe déjà dans l’école de destination. Vérifiez le dossier avant de continuer.'; end if;
 v_student_number:='TRF-'||upper(substr(replace(v_transfer.id::text,'-',''),1,10));
 insert into public.students(establishment_id,student_number,last_name,first_name,birth_date,place_of_birth,sex,phone,email,active,guardian_first_name,guardian_last_name,guardian_phone,guardian_email,guardian_address,guardian_relationship)
 values(v_transfer.destination_establishment_id,v_student_number,v_last,v_first,v_birth,nullif(v_transfer.student_snapshot->>'place_of_birth',''),nullif(v_transfer.student_snapshot->>'sex',''),nullif(v_transfer.student_snapshot->>'phone',''),nullif(v_transfer.student_snapshot->>'email',''),true,nullif(v_transfer.student_snapshot->>'guardian_first_name',''),nullif(v_transfer.student_snapshot->>'guardian_last_name',''),nullif(v_transfer.student_snapshot->>'guardian_phone',''),nullif(v_transfer.student_snapshot->>'guardian_email',''),nullif(v_transfer.student_snapshot->>'guardian_address',''),nullif(v_transfer.student_snapshot->>'guardian_relationship','')) returning id into v_student_id;
 v_enrollment_result:=public.create_student_enrollment_with_schedule(v_transfer.destination_establishment_id,v_active_year,p_class_id,p_tuition_plan_id,current_date,v_student_id,null,null,null,null,null,null,null,'{}'::uuid[]);
 v_enrollment_id:=(v_enrollment_result->>'enrollment_id')::uuid;
 update public.student_transfer_requests set status='accepted',destination_student_id=v_student_id,destination_enrollment_id=v_enrollment_id,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_transfer_id;
 return jsonb_build_object('id',p_transfer_id,'status','accepted','student_id',v_student_id,'enrollment_id',v_enrollment_id,'academic_year_id',v_active_year);
end; $$;

revoke all on function public.create_student_transfer(uuid,uuid,uuid,uuid,text) from public,anon;
revoke all on function public.list_student_transfers(uuid) from public,anon;
revoke all on function public.review_student_transfer(uuid,text,uuid,uuid,text) from public,anon;
grant execute on function public.create_student_transfer(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.list_student_transfers(uuid) to authenticated;
grant execute on function public.review_student_transfer(uuid,text,uuid,uuid,text) to authenticated;
