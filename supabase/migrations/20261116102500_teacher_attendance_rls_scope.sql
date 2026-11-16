-- Allow teachers to record attendance only for their assigned class subjects.
-- The RPC teacher_record_attendance_batch validates the active lesson, date,
-- schedule and active enrollment. These policies keep the table-level RLS scope
-- aligned with that teacher-to-class/subject assignment.

drop policy if exists attendance_teacher_insert_assigned on public.attendance_records;
create policy attendance_teacher_insert_assigned
on public.attendance_records
for insert
to authenticated
with check (
  recorded_by = (select auth.uid())
  and private.is_teacher_for_class_subject(class_id, subject_id)
  and exists (
    select 1
    from public.school_classes c
    where c.id = attendance_records.class_id
      and c.establishment_id = attendance_records.establishment_id
  )
);

drop policy if exists attendance_teacher_update_assigned on public.attendance_records;
create policy attendance_teacher_update_assigned
on public.attendance_records
for update
to authenticated
using (
  private.is_teacher_for_class_subject(class_id, subject_id)
  and exists (
    select 1
    from public.school_classes c
    where c.id = attendance_records.class_id
      and c.establishment_id = attendance_records.establishment_id
  )
)
with check (
  recorded_by = (select auth.uid())
  and private.is_teacher_for_class_subject(class_id, subject_id)
  and exists (
    select 1
    from public.school_classes c
    where c.id = attendance_records.class_id
      and c.establishment_id = attendance_records.establishment_id
  )
);
