-- Parent notifications: payments, enrollments, attendance, options, school events and overdue tuition.
create or replace function private.notify_guardians_for_student(p_establishment_id uuid,p_student_id uuid,p_type text,p_title text,p_body text,p_entity_type text,p_entity_id uuid) returns integer language plpgsql security invoker set search_path=public,private as $fn$
declare v_count integer:=0;
begin
 insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
 select distinct p_establishment_id,sg.guardian_user_id,p_type,p_title,p_body,p_entity_type,p_entity_id
 from public.student_guardians sg where sg.student_id=p_student_id and sg.establishment_id=p_establishment_id and sg.active=true
 on conflict do nothing;
 get diagnostics v_count=row_count; return v_count;
end $fn$;

create or replace function private.notify_parent_on_payment() returns trigger language plpgsql security invoker set search_path=public,private as $fn$
declare v_student_id uuid; v_student_name text;
begin
 select e.student_id,trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) into v_student_id,v_student_name from public.enrollments e join public.students s on s.id=e.student_id where e.id=new.enrollment_id limit 1;
 if v_student_id is not null then perform private.notify_guardians_for_student(new.establishment_id,v_student_id,'payment_received','Paiement enregistré',format('Un paiement de %s FCFA a été enregistré pour %s.',to_char(new.amount,'FM999G999G999'),nullif(v_student_name,'')),'payment',new.id); end if;
 return new;
end $fn$;

create or replace function private.notify_parent_on_enrollment() returns trigger language plpgsql security invoker set search_path=public,private as $fn$
declare v_student_name text; v_class_name text;
begin
 select trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')),c.name into v_student_name,v_class_name from public.students s left join public.school_classes c on c.id=new.class_id where s.id=new.student_id;
 perform private.notify_guardians_for_student(new.establishment_id,new.student_id,'enrollment_created','Inscription enregistrée',format('%s est maintenant inscrit%s dans l’établissement.',nullif(v_student_name,''),case when v_class_name is null then '' else format(' en %s',v_class_name) end),'enrollment',new.id);
 return new;
end $fn$;

create or replace function private.notify_parent_on_attendance() returns trigger language plpgsql security invoker set search_path=public,private as $fn$
declare v_student_name text; v_subject_name text; v_title text; v_body text;
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
 select trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) into v_student_name from public.students where id=new.student_id;
 select name into v_subject_name from public.subjects where id=new.subject_id;
 if lower(new.status)='absent' then
   v_title:='Absence signalée'; v_body:=format('%s a été signalé absent%s le %s.',nullif(v_student_name,''),case when v_subject_name is null then '' else format(' au cours de %s',v_subject_name) end,to_char(new.attendance_date,'DD/MM/YYYY'));
 elsif lower(new.status)='present' then
   v_title:='Présence enregistrée'; v_body:=format('%s a été enregistré présent%s le %s.',nullif(v_student_name,''),case when v_subject_name is null then '' else format(' au cours de %s',v_subject_name) end,to_char(new.attendance_date,'DD/MM/YYYY'));
 else
   v_title:='Pointage scolaire mis à jour'; v_body:=format('Le statut de présence de %s a été mis à jour le %s.',nullif(v_student_name,''),to_char(new.attendance_date,'DD/MM/YYYY'));
 end if;
 perform private.notify_guardians_for_student(new.establishment_id,new.student_id,case when lower(new.status)='absent' then 'attendance_absent' when lower(new.status)='present' then 'attendance_present' else 'attendance_updated' end,v_title,v_body,'attendance',new.id);
 return new;
end $fn$;

create or replace function private.notify_parent_on_option() returns trigger language plpgsql security invoker set search_path=public,private as $fn$
declare v_student_id uuid; v_option_name text;
begin
 select e.student_id into v_student_id from public.enrollments e where e.id=new.enrollment_id;
 select name into v_option_name from public.student_options where id=new.option_id;
 if v_student_id is not null then perform private.notify_guardians_for_student(new.establishment_id,v_student_id,'option_added','Nouvelle option ajoutée',format('L’option %s a été ajoutée au dossier scolaire.',coalesce(v_option_name,'scolaire')),'enrollment_option',new.id); end if;
 return new;
end $fn$;

create or replace function private.notify_parents_on_school_event() returns trigger language plpgsql security invoker set search_path=public,private as $fn$
begin
 insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
 select distinct new.establishment_id,sg.guardian_user_id,'school_event','Événement scolaire',format('%s%s',new.title,case when new.starts_at is null then '' else format(' — %s',to_char(new.starts_at at time zone 'Africa/Libreville','DD/MM/YYYY HH24:MI')) end),'school_event',new.id
 from public.student_guardians sg where sg.establishment_id=new.establishment_id and sg.active=true on conflict do nothing;
 return new;
end $fn$;

drop trigger if exists trg_parent_notification_payment on public.payments;
create trigger trg_parent_notification_payment after insert on public.payments for each row execute function private.notify_parent_on_payment();
drop trigger if exists trg_parent_notification_enrollment on public.enrollments;
create trigger trg_parent_notification_enrollment after insert on public.enrollments for each row execute function private.notify_parent_on_enrollment();
drop trigger if exists trg_parent_notification_attendance on public.attendance_records;
create trigger trg_parent_notification_attendance after insert or update of status on public.attendance_records for each row execute function private.notify_parent_on_attendance();
drop trigger if exists trg_parent_notification_option on public.enrollment_options;
create trigger trg_parent_notification_option after insert on public.enrollment_options for each row execute function private.notify_parent_on_option();
drop trigger if exists trg_parent_notification_school_event on public.school_events;
create trigger trg_parent_notification_school_event after insert on public.school_events for each row execute function private.notify_parents_on_school_event();

create or replace function private.generate_overdue_parent_notifications() returns integer language plpgsql security definer set search_path=public,private as $fn$
declare v_count integer:=0;
begin
 insert into public.notifications(establishment_id,recipient_user_id,type,title,body,entity_type,entity_id)
 select distinct e.establishment_id,sg.guardian_user_id,'payment_overdue','Paiement en retard',
 format('L’échéance « %s » de %s est en retard. Montant restant : %s FCFA.',ps.label,trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')),to_char(greatest(coalesce(ps.amount_due,0)-coalesce(ps.amount_paid,0),0),'FM999G999G999')),
 'payment_schedule',ps.id
 from public.payment_schedules ps
 join public.enrollments e on e.id=ps.enrollment_id
 join public.students s on s.id=e.student_id
 join public.student_guardians sg on sg.student_id=e.student_id and sg.establishment_id=e.establishment_id and sg.active=true
 where ps.due_date<current_date and coalesce(ps.amount_paid,0)<coalesce(ps.amount_due,0) and coalesce(ps.status,'pending')<>'paid'
 and not exists(select 1 from public.notifications n where n.recipient_user_id=sg.guardian_user_id and n.entity_type='payment_schedule' and n.entity_id=ps.id and n.type='payment_overdue')
 on conflict do nothing;
 get diagnostics v_count=row_count; return v_count;
end $fn$;
revoke all on function private.generate_overdue_parent_notifications() from public,anon,authenticated;

do $do$
begin
 if not exists(select 1 from cron.job where jobname='parent-overdue-payment-notifications') then
   perform cron.schedule('parent-overdue-payment-notifications','15 5 * * *',$cron$select private.generate_overdue_parent_notifications();$cron$);
 end if;
end $do$;

alter publication supabase_realtime add table public.notifications;