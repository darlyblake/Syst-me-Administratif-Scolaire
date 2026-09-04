alter table public.parent_document_requests
  add column if not exists response_message text,
  add column if not exists delivery_method text,
  add column if not exists responded_at timestamptz;

alter table public.parent_document_requests
  drop constraint if exists parent_document_requests_delivery_method_check;
alter table public.parent_document_requests
  add constraint parent_document_requests_delivery_method_check
  check (delivery_method is null or delivery_method in ('digital','pickup'));

create index if not exists parent_document_requests_establishment_status_idx
  on public.parent_document_requests(establishment_id, status, created_at desc);

drop policy if exists "Parents view own response documents" on public.documents;
create policy "Parents view own response documents"
on public.documents for select to authenticated
using (
  exists (
    select 1 from public.parent_document_requests r
    where r.response_document_id = documents.id
      and r.parent_user_id = auth.uid()
  )
);

drop policy if exists "School members upload parent response documents" on storage.objects;
create policy "School members upload parent response documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'parent-documents'
  and name like 'responses/%/%/%'
  and private.is_member(split_part(name, '/', 2)::uuid)
  and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::account_type) <> 'parent'::account_type
);

drop policy if exists "School members view parent response documents" on storage.objects;
create policy "School members view parent response documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'parent-documents'
  and name like 'responses/%/%/%'
  and exists (
    select 1 from public.parent_document_requests r
    where r.id = split_part(name, '/', 3)::uuid
      and r.establishment_id = split_part(name, '/', 2)::uuid
      and private.is_member(r.establishment_id)
      and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::account_type) <> 'parent'::account_type
  )
);

drop policy if exists "Parents view own response documents" on storage.objects;
create policy "Parents view own response documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'parent-documents'
  and name like 'responses/%/%/%'
  and exists (
    select 1
    from public.parent_document_requests r
    join public.documents d on d.id = r.response_document_id
    where r.parent_user_id = auth.uid()
      and d.storage_path = objects.name
      and d.establishment_id = r.establishment_id
  )
);

create or replace function public.guard_parent_document_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.establishment_id <> old.establishment_id
     or new.parent_user_id <> old.parent_user_id
     or new.student_id is distinct from old.student_id
     or new.created_at <> old.created_at then
    raise exception 'Le périmètre de la demande ne peut pas être modifié';
  end if;
  if new.status in ('ready','completed') and new.delivery_method is null then
    raise exception 'Le mode de remise est obligatoire';
  end if;
  if new.delivery_method = 'digital' and new.status in ('ready','completed') and new.response_document_id is null then
    raise exception 'Un document numérique est requis pour une remise numérique';
  end if;
  if new.status <> old.status
     or new.response_document_id is distinct from old.response_document_id
     or new.delivery_method is distinct from old.delivery_method
     or new.response_message is distinct from old.response_message then
    new.responded_at = case when new.status in ('ready','rejected','completed') then coalesce(new.responded_at, now()) else null end;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_guard_parent_document_request_scope on public.parent_document_requests;
create trigger trg_guard_parent_document_request_scope
before update on public.parent_document_requests
for each row execute function public.guard_parent_document_request_scope();

create or replace function public.notify_parent_document_request_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  title_text text;
  body_text text;
begin
  if new.status = old.status
     and new.response_document_id is not distinct from old.response_document_id
     and new.response_message is not distinct from old.response_message then
    return new;
  end if;
  title_text := case new.status
    when 'in_progress' then 'Votre demande est en traitement'
    when 'ready' then case when new.delivery_method = 'pickup' then 'Votre document est prêt à être retiré' else 'Votre document est disponible' end
    when 'rejected' then 'Votre demande de document a été refusée'
    when 'completed' then 'Votre demande est terminée'
    else 'Mise à jour de votre demande'
  end;
  body_text := coalesce(new.response_message, case new.status
    when 'in_progress' then 'L’établissement traite actuellement votre demande.'
    when 'ready' then case when new.delivery_method = 'pickup' then 'Vous pouvez vous rendre à l’établissement pour récupérer le document.' else 'Le document numérique est maintenant disponible dans votre espace parent.' end
    when 'rejected' then 'Consultez le motif indiqué dans votre demande.'
    when 'completed' then 'Votre demande a été clôturée.'
    else 'Le statut de votre demande a été mis à jour.'
  end);
  insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
  values (new.establishment_id, new.parent_user_id, 'document_request', title_text, body_text, 'parent_document_request', new.id);
  return new;
end;
$$;

drop trigger if exists trg_notify_parent_document_request_update on public.parent_document_requests;
create trigger trg_notify_parent_document_request_update
after update on public.parent_document_requests
for each row execute function public.notify_parent_document_request_update();