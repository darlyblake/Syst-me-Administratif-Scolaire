create table if not exists public.school_document_requests (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  document_type text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'rejected', 'completed')),
  rejection_reason text,
  submitted_storage_path text unique,
  submitted_file_name text,
  submitted_mime_type text check (submitted_mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  submitted_size_bytes bigint check (submitted_size_bytes <= 1048576),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.school_document_requests enable row level security;

create policy "School members manage school document requests"
on public.school_document_requests for all to authenticated
using (private.is_member(establishment_id) and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type)
with check (private.is_member(establishment_id) and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type);

create policy "Parents view linked school document requests"
on public.school_document_requests for select to authenticated
using (
  exists (
    select 1 from public.student_guardians sg
    where sg.student_id = school_document_requests.student_id
      and sg.guardian_user_id = auth.uid()
      and sg.active = true
      and sg.can_view_academic = true
  )
);

create policy "Parents update linked school document requests"
on public.school_document_requests for update to authenticated
using (
  exists (
    select 1 from public.student_guardians sg
    where sg.student_id = school_document_requests.student_id
      and sg.guardian_user_id = auth.uid()
      and sg.active = true
      and sg.can_view_academic = true
  )
)
with check (
  status in ('pending', 'submitted', 'rejected') 
);

create policy "School members view parent submissions for school requests"
on storage.objects for select to authenticated
using (
  bucket_id = 'parent-documents' 
  and exists (
    select 1 from public.school_document_requests r 
    where r.submitted_storage_path = name 
    and private.is_member(r.establishment_id) 
    and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type
  )
);

-- Trigger for notifications to parents when a request is made or updated
create or replace function public.notify_school_document_request_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  guardian record;
  title_text text;
  body_text text;
begin
  if tg_op = 'INSERT' then
    title_text := 'L''établissement demande un document';
    body_text := 'Veuillez fournir : ' || new.document_type || coalesce(' (' || new.message || ')', '');
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    if new.status = 'completed' then
      title_text := 'Document validé';
      body_text := 'Le document ' || new.document_type || ' a été accepté.';
    elsif new.status = 'rejected' then
      title_text := 'Document refusé';
      body_text := 'Le document ' || new.document_type || ' a été refusé. Motif : ' || coalesce(new.rejection_reason, 'Non conforme');
    else
      return new;
    end if;
  else
    return new;
  end if;

  for guardian in
    select guardian_user_id from public.student_guardians
    where student_id = new.student_id and establishment_id = new.establishment_id and active = true and can_view_academic = true
  loop
    insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
    values (new.establishment_id, guardian.guardian_user_id, 'school_document_request', title_text, body_text, 'school_document_request', new.id);
  end loop;

  if tg_op = 'UPDATE' and new.status = 'submitted' and old.status <> 'submitted' then
    insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
    select new.establishment_id, em.user_id, 'school_document_submission',
      'Document reçu',
      'Le parent a transmis : ' || new.document_type,
      'school_document_request', new.id
    from public.establishment_members em
    where em.establishment_id = new.establishment_id
      and em.active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_school_document_request_update on public.school_document_requests;
create trigger trg_notify_school_document_request_update
after insert or update on public.school_document_requests
for each row execute function public.notify_school_document_request_update();


-- Notify parents when the school publishes a document for their child.
create or replace function public.notify_parent_on_document_publication()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare guardian record;
begin
  if new.active = true and (tg_op = 'INSERT' or old.active = false) then
    for guardian in
      select guardian_user_id
      from public.student_guardians
      where student_id = new.student_id
        and establishment_id = new.establishment_id
        and active = true
        and can_view_academic = true
    loop
      insert into public.notifications(establishment_id, recipient_user_id, type, title, body, entity_type, entity_id)
      select new.establishment_id, guardian.guardian_user_id, 'school_document_published',
        'Nouveau document disponible',
        coalesce(new.title_override, d.name) || ' est disponible dans votre espace parent.',
        'parent_document_publication', new.id
      from public.documents d
      where d.id = new.document_id
      on conflict do nothing;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_parent_on_document_publication on public.parent_document_publications;
create trigger trg_notify_parent_on_document_publication
after insert or update of active on public.parent_document_publications
for each row execute function public.notify_parent_on_document_publication();
