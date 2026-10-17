create or replace function private.can_parent_read_published_document_path(
  p_storage_path text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents d
    join public.parent_document_publications p on p.document_id = d.id
    join public.student_guardians sg
      on sg.student_id = p.student_id
     and sg.establishment_id = p.establishment_id
    join public.establishments e on e.id = p.establishment_id
    where d.storage_path = p_storage_path
      and p.active = true
      and sg.guardian_user_id = p_user_id
      and sg.active = true
      and sg.can_view_academic = true
      and e.status = 'active'::public.establishment_status
  );
$$;

revoke all on function private.can_parent_read_published_document_path(text, uuid) from public, anon;
grant execute on function private.can_parent_read_published_document_path(text, uuid) to authenticated;

drop policy if exists "Parents view published school document files" on storage.objects;
create policy "Parents view published school document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'school-documents'
  and private.can_parent_read_published_document_path(name, (select auth.uid()))
);
