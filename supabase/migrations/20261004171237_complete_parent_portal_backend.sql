-- Parent portal backend completion: academic content, timetable, finance schedule and published documents.

create table if not exists public.parent_document_publications (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  title_override text,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (student_id, document_id)
);

create index if not exists idx_parent_doc_publications_student
  on public.parent_document_publications(student_id, active);
create index if not exists idx_parent_doc_publications_establishment
  on public.parent_document_publications(establishment_id, active);
create index if not exists idx_parent_doc_publications_document
  on public.parent_document_publications(document_id);

alter table public.parent_document_publications enable row level security;

drop policy if exists "Parents view published documents for linked children" on public.parent_document_publications;
create policy "Parents view published documents for linked children"
on public.parent_document_publications
for select
to authenticated
using (
  active = true
  and exists (
    select 1
    from public.student_guardians sg
    join public.establishments e on e.id = sg.establishment_id
    where sg.student_id = parent_document_publications.student_id
      and sg.establishment_id = parent_document_publications.establishment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "School members manage published parent documents" on public.parent_document_publications;
create policy "School members manage published parent documents"
on public.parent_document_publications
for all
to authenticated
using (
  private.has_permission(establishment_id, 'documents.manage'::text)
  or private.has_permission(establishment_id, 'school.manage'::text)
)
with check (
  private.has_permission(establishment_id, 'documents.manage'::text)
  or private.has_permission(establishment_id, 'school.manage'::text)
);

drop policy if exists "Parents view published school documents" on public.documents;
create policy "Parents view published school documents"
on public.documents
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_document_publications p
    join public.student_guardians sg
      on sg.student_id = p.student_id
     and sg.establishment_id = p.establishment_id
    join public.establishments e on e.id = p.establishment_id
    where p.document_id = documents.id
      and p.active = true
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view linked payment schedules" on public.payment_schedules;
create policy "Parents view linked payment schedules"
on public.payment_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    join public.establishments e on e.id = en.establishment_id
    where en.id = payment_schedules.enrollment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view linked payment allocations" on public.payment_allocations;
create policy "Parents view linked payment allocations"
on public.payment_allocations
for select
to authenticated
using (
  exists (
    select 1
    from public.payments p
    join public.enrollments en on en.id = p.enrollment_id
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    join public.establishments e on e.id = en.establishment_id
    where p.id = payment_allocations.payment_id
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_finance = true
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view linked timetable slots" on public.timetable_slots;
create policy "Parents view linked timetable slots"
on public.timetable_slots
for select
to authenticated
using (
  exists (
    select 1
    from public.class_subjects cs
    join public.enrollments en on en.class_id = cs.class_id
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    join public.establishments e on e.id = en.establishment_id
    where cs.id = timetable_slots.class_subject_id
      and en.status = 'active'::public.enrollment_status
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and sg.establishment_id = timetable_slots.establishment_id
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view linked lesson entries" on public.teacher_lesson_entries;
create policy "Parents view linked lesson entries"
on public.teacher_lesson_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    join public.establishments e on e.id = en.establishment_id
    where en.class_id = (
      select cs.class_id
      from public.timetable_slots ts
      join public.class_subjects cs on cs.id = ts.class_subject_id
      where ts.id = teacher_lesson_entries.timetable_slot_id
        and ts.establishment_id = teacher_lesson_entries.establishment_id
      limit 1
    )
      and en.status = 'active'::public.enrollment_status
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and sg.establishment_id = teacher_lesson_entries.establishment_id
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view linked homework" on public.teacher_homework;
create policy "Parents view linked homework"
on public.teacher_homework
for select
to authenticated
using (
  active = true
  and exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    join public.establishments e on e.id = en.establishment_id
    where en.class_id = teacher_homework.class_id
      and en.status = 'active'::public.enrollment_status
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and sg.establishment_id = teacher_homework.establishment_id
      and e.status = 'active'::public.establishment_status
  )
);

drop policy if exists "Parents view published school document files" on storage.objects;
create policy "Parents view published school document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'school-documents'::text
  and exists (
    select 1
    from public.documents d
    join public.parent_document_publications p on p.document_id = d.id
    join public.student_guardians sg
      on sg.student_id = p.student_id
     and sg.establishment_id = p.establishment_id
    join public.establishments e on e.id = p.establishment_id
    where d.storage_path = objects.name
      and p.active = true
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
      and e.status = 'active'::public.establishment_status
  )
);
