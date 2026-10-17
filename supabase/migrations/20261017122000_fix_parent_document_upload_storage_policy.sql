-- The parent upload path is school-requests/{establishment_id}/{student_id}/...
-- Previous policies incorrectly expected the parent's user ID as the first folder,
-- so every valid upload from the parent portal was rejected with HTTP 400.
drop policy if exists "Parents upload own request documents" on storage.objects;
create policy "Parents upload own request documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'parent-documents'
  and split_part(name, '/', 1) = 'school-requests'
  and exists (
    select 1
    from public.school_document_requests r
    join public.student_guardians sg
      on sg.student_id = r.student_id
     and sg.establishment_id = r.establishment_id
    where r.establishment_id::text = split_part(name, '/', 2)
      and r.student_id::text = split_part(name, '/', 3)
      and r.status in ('pending', 'rejected')
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
  )
);

drop policy if exists "Parents view own request documents" on storage.objects;
create policy "Parents view own request documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'parent-documents'
  and split_part(name, '/', 1) = 'school-requests'
  and exists (
    select 1
    from public.school_document_requests r
    join public.student_guardians sg
      on sg.student_id = r.student_id
     and sg.establishment_id = r.establishment_id
    where r.establishment_id::text = split_part(name, '/', 2)
      and r.student_id::text = split_part(name, '/', 3)
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
  )
);
