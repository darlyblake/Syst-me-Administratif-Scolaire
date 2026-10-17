create or replace function public.get_parent_published_documents()
returns table (
  publication_id uuid,
  student_id uuid,
  document_id uuid,
  published_at timestamptz,
  title_override text,
  name text,
  document_type text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz,
  storage_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.student_id,
    d.id,
    p.published_at,
    p.title_override,
    d.name,
    d.document_type,
    d.mime_type,
    d.size_bytes::bigint,
    d.created_at,
    d.storage_path
  from public.parent_document_publications p
  join public.documents d on d.id = p.document_id
  join public.student_guardians sg
    on sg.student_id = p.student_id
   and sg.establishment_id = p.establishment_id
  join public.establishments e on e.id = p.establishment_id
  where p.active = true
    and sg.guardian_user_id = (select auth.uid())
    and sg.active = true
    and sg.can_view_academic = true
    and e.status = 'active'::public.establishment_status
  order by p.published_at desc;
$$;

revoke all on function public.get_parent_published_documents() from public, anon;
grant execute on function public.get_parent_published_documents() to authenticated;
