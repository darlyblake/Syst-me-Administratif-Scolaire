create or replace function public.request_attendance_justification(p_attendance_id uuid)
returns public.attendance_justification_requests
language plpgsql security invoker set search_path=public as $$
declare v_ar public.attendance_records; v_guardian uuid; v_req public.attendance_justification_requests;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 select * into v_ar from public.attendance_records where id=p_attendance_id for update;
 if not found then raise exception 'Présence introuvable'; end if;
 if not private.is_member(v_ar.establishment_id) then raise exception 'Accès refusé'; end if;
 select sg.guardian_user_id into v_guardian from public.student_guardians sg where sg.student_id=v_ar.student_id and sg.establishment_id=v_ar.establishment_id and sg.active=true and sg.can_view_academic=true and sg.guardian_user_id is not null order by sg.created_at asc limit 1;
 if v_guardian is null then raise exception 'Aucun compte parent associé à cet élève'; end if;
 select * into v_req from public.attendance_justification_requests where attendance_id=p_attendance_id and status='pending' limit 1;
 if found then return v_req; end if;
 insert into public.attendance_justification_requests(attendance_id,student_id,establishment_id,parent_user_id,reason,status)
 values(p_attendance_id,v_ar.student_id,v_ar.establishment_id,v_guardian,'Demande de justification initiée par l’administration.','pending') returning * into v_req;
 insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
 values(v_ar.establishment_id,v_guardian,'attendance_justification_requested','Justification demandée','L’administration demande une justification pour une absence ou un retard de votre enfant.','attendance_justification_request',v_req.id);
 return v_req;
end;
$$;
revoke all on function public.request_attendance_justification(uuid) from public;
grant execute on function public.request_attendance_justification(uuid) to authenticated;