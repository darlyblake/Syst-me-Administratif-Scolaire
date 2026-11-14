CREATE OR REPLACE FUNCTION public.create_conversation(p_establishment_id uuid, p_subject text, p_class_id uuid DEFAULT NULL::uuid, p_participant_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare cid uuid; uid uuid;
begin
 if not private.has_permission(p_establishment_id,'communication.manage') then raise exception 'Permission refusee'; end if;
 if p_class_id is not null and not exists(select 1 from public.school_classes c where c.id=p_class_id and c.establishment_id=p_establishment_id and c.active=true) then raise exception 'Classe hors etablissement'; end if;
 insert into public.conversations(establishment_id,subject,class_id,created_by) values(p_establishment_id,nullif(trim(p_subject),''),p_class_id,auth.uid()) returning id into cid;
 insert into public.conversation_participants(conversation_id,user_id) values(cid,auth.uid()) on conflict do nothing;
 foreach uid in array p_participant_ids loop
   if exists(select 1 from public.establishment_members where establishment_id=p_establishment_id and user_id=uid and active) then
     insert into public.conversation_participants(conversation_id,user_id) values(cid,uid) on conflict do nothing;
   end if;
 end loop;
 return cid;
end $function$;

CREATE OR REPLACE FUNCTION public.assign_students_to_class(p_establishment_id uuid, p_student_ids uuid[], p_academic_year_id uuid, p_class_id uuid, p_tuition_plan_id uuid, p_enrollment_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ declare v_updated integer := 0; v_created integer := 0; v_id uuid; v_student uuid; begin if p_establishment_id is null or (not private.has_permission(p_establishment_id,'students.manage') and not private.has_permission(p_establishment_id,'enrollments.manage')) then raise exception 'permission_denied'; end if; if coalesce(array_length(p_student_ids,1),0)=0 then raise exception 'no_students'; end if; if p_academic_year_id is null or p_class_id is null or p_tuition_plan_id is null then raise exception 'required_assignment_fields'; end if; if not exists (select 1 from public.school_classes c where c.id=p_class_id and c.establishment_id=p_establishment_id and c.active=true) then raise exception 'class_not_found'; end if; if not exists (select 1 from public.tuition_plans tp where tp.id=p_tuition_plan_id and tp.establishment_id=p_establishment_id and tp.active=true) then raise exception 'tuition_plan_not_found'; end if; if exists (select 1 from public.students s where s.id = any(p_student_ids) and s.establishment_id <> p_establishment_id) then raise exception 'student_establishment_mismatch'; end if; foreach v_student in array p_student_ids loop select id into v_id from public.enrollments where student_id=v_student and academic_year_id=p_academic_year_id; if v_id is not null then update public.enrollments set class_id=p_class_id, tuition_plan_id=p_tuition_plan_id, status='active', updated_at=now() where id=v_id; v_updated:=v_updated+1; else insert into public.enrollments(establishment_id,student_id,academic_year_id,class_id,tuition_plan_id,enrollment_date,status) values(p_establishment_id,v_student,p_academic_year_id,p_class_id,p_tuition_plan_id,coalesce(p_enrollment_date,current_date),'active') returning id into v_id; v_created:=v_created+1; end if; end loop; return jsonb_build_object('updated',v_updated,'created',v_created,'total',v_updated+v_created); end; $function$;