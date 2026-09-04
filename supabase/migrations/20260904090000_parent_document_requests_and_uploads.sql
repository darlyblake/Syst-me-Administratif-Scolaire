create table if not exists public.parent_document_requests (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  document_type text not null,
  message text,
  status text not null default 'pending' check (status in ('pending','in_progress','ready','rejected','cancelled','completed')),
  response_document_id uuid references public.documents(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_document_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.parent_document_requests(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 1048576),
  created_at timestamptz not null default now()
);

create index if not exists parent_document_requests_parent_idx on public.parent_document_requests(parent_user_id, created_at desc);
create index if not exists parent_document_requests_establishment_idx on public.parent_document_requests(establishment_id, status, created_at desc);
create index if not exists parent_document_requests_student_idx on public.parent_document_requests(student_id);
create index if not exists parent_document_request_attachments_request_idx on public.parent_document_request_attachments(request_id);

alter table public.parent_document_requests enable row level security;
alter table public.parent_document_request_attachments enable row level security;

create policy "Parents view own document requests"
on public.parent_document_requests for select to authenticated
using (parent_user_id = auth.uid());

create policy "Parents create linked document requests"
on public.parent_document_requests for insert to authenticated
with check (
  parent_user_id = auth.uid()
  and exists (
    select 1 from public.student_guardians sg
    join public.establishments e on e.id = sg.establishment_id
    where sg.guardian_user_id = auth.uid()
      and sg.active = true
      and sg.establishment_id = parent_document_requests.establishment_id
      and e.status = 'active'::public.establishment_status
      and (parent_document_requests.student_id is null or sg.student_id = parent_document_requests.student_id)
  )
);

create policy "Parents update own pending document requests"
on public.parent_document_requests for update to authenticated
using (parent_user_id = auth.uid() and status = 'pending')
with check (parent_user_id = auth.uid() and status in ('pending','cancelled'));

create policy "School members manage document requests"
on public.parent_document_requests for all to authenticated
using (private.is_member(establishment_id) and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type)
with check (private.is_member(establishment_id) and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type);

create policy "Parents view own document request attachments"
on public.parent_document_request_attachments for select to authenticated
using (parent_user_id = auth.uid() and exists (select 1 from public.parent_document_requests r where r.id = parent_document_request_attachments.request_id and r.parent_user_id = auth.uid()));

create policy "Parents create own document request attachments"
on public.parent_document_request_attachments for insert to authenticated
with check (parent_user_id = auth.uid() and size_bytes <= 1048576 and mime_type in ('application/pdf','image/jpeg','image/png','image/webp') and exists (select 1 from public.parent_document_requests r join public.student_guardians sg on sg.guardian_user_id = auth.uid() and sg.establishment_id = r.establishment_id and sg.active = true where r.id = parent_document_request_attachments.request_id and r.parent_user_id = auth.uid() and r.status = 'pending'));

create policy "School members view document request attachments"
on public.parent_document_request_attachments for select to authenticated
using (exists (select 1 from public.parent_document_requests r where r.id = parent_document_request_attachments.request_id and private.is_member(r.establishment_id) and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parent-documents', 'parent-documents', false, 1048576, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=1048576, allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];

create policy "Parents upload own request documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'parent-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Parents view own request documents"
on storage.objects for select to authenticated
using (bucket_id = 'parent-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "School members view parent request documents"
on storage.objects for select to authenticated
using (bucket_id = 'parent-documents' and exists (select 1 from public.parent_document_request_attachments a join public.parent_document_requests r on r.id = a.request_id where a.storage_path = name and private.is_member(r.establishment_id) and coalesce((select p.account_type from public.profiles p where p.id = auth.uid()), 'school_member'::public.account_type) <> 'parent'::public.account_type));

create or replace function public.parent_create_document_request(p_establishment_id uuid,p_document_type text,p_student_id uuid default null,p_message text default null)
returns uuid language plpgsql security invoker set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if nullif(trim(p_document_type), '') is null then raise exception 'document_type_required'; end if;
  insert into public.parent_document_requests(establishment_id,parent_user_id,student_id,document_type,message)
  values(p_establishment_id,auth.uid(),p_student_id,trim(p_document_type),nullif(trim(p_message),'')) returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.parent_create_document_request(uuid,text,uuid,text) to authenticated;

create or replace function public.parent_cancel_document_request(p_request_id uuid)
returns boolean language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  update public.parent_document_requests set status='cancelled', updated_at=now() where id=p_request_id and parent_user_id=auth.uid() and status='pending';
  return found;
end;
$$;
grant execute on function public.parent_cancel_document_request(uuid) to authenticated;
