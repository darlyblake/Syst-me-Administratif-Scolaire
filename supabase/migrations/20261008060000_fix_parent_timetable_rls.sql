-- Correction des policies RLS pour l'emploi du temps côté portail parent.
-- Problème : les policies précédentes utilisaient 'active'::public.enrollment_status
-- qui peut échouer si le type enum n'est pas résolu correctement dans le contexte RLS.
-- On utilise maintenant une comparaison texte simple via ::text pour éviter ce problème.

-- ─── timetable_slots ────────────────────────────────────────────────────────

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
    where cs.id = timetable_slots.class_subject_id
      and en.status::text = 'active'
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
  )
);

-- ─── class_subjects ─────────────────────────────────────────────────────────

drop policy if exists "Parents view linked class subjects" on public.class_subjects;

create policy "Parents view linked class subjects"
on public.class_subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments en
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    where en.class_id = class_subjects.class_id
      and en.status::text = 'active'
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
  )
);

-- ─── subjects ───────────────────────────────────────────────────────────────

drop policy if exists "Parents view linked subjects" on public.subjects;

create policy "Parents view linked subjects"
on public.subjects
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
    where cs.subject_id = subjects.id
      and en.status::text = 'active'
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
  )
);

-- ─── teacher_lesson_entries ─────────────────────────────────────────────────

drop policy if exists "Parents view linked lesson entries" on public.teacher_lesson_entries;

create policy "Parents view linked lesson entries"
on public.teacher_lesson_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.timetable_slots ts
    join public.class_subjects cs on cs.id = ts.class_subject_id
    join public.enrollments en on en.class_id = cs.class_id
    join public.student_guardians sg
      on sg.student_id = en.student_id
     and sg.establishment_id = en.establishment_id
    where ts.id = teacher_lesson_entries.timetable_slot_id
      and en.status::text = 'active'
      and sg.guardian_user_id = (select auth.uid())
      and sg.active = true
      and sg.can_view_academic = true
  )
);
