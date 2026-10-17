-- Repair references to records already marked as merged and prevent new duplicates.
-- Identity is scoped by establishment + normalized first/last name + birth date.
create or replace function private.prevent_duplicate_active_student()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity_key text;
begin
  if new.active is distinct from true
     or new.merged_into_student_id is not null
     or new.birth_date is null
     or new.establishment_id is null
     or nullif(trim(new.first_name), '') is null
     or nullif(trim(new.last_name), '') is null then
    return new;
  end if;

  v_identity_key := concat_ws(
    '|', new.establishment_id::text,
    private.normalize_student_name(new.first_name),
    private.normalize_student_name(new.last_name),
    new.birth_date::text
  );
  perform pg_advisory_xact_lock(hashtextextended(v_identity_key, 0));

  if exists (
    select 1 from public.students s
    where s.establishment_id = new.establishment_id
      and s.active = true
      and s.merged_into_student_id is null
      and s.birth_date = new.birth_date
      and private.normalize_student_name(s.first_name) = private.normalize_student_name(new.first_name)
      and private.normalize_student_name(s.last_name) = private.normalize_student_name(new.last_name)
      and s.id is distinct from new.id
  ) then
    raise exception using errcode = '23505',
      message = 'Un élève actif portant le même nom, prénom et la même date de naissance existe déjà. Sélectionnez son dossier existant au lieu de créer un doublon.';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_duplicate_active_student() from public, anon, authenticated;
drop trigger if exists trg_prevent_duplicate_active_student on public.students;
create trigger trg_prevent_duplicate_active_student
before insert on public.students
for each row execute function private.prevent_duplicate_active_student();

-- Only follow explicit merged_into_student_id links where both records still
-- match on establishment, normalized names and birth date.
create temporary table _merged_student_map on commit drop as
select old_student.id old_id, canonical.id canonical_id
from public.students old_student
join public.students canonical on canonical.id = old_student.merged_into_student_id
where old_student.merged_into_student_id is not null
  and canonical.establishment_id = old_student.establishment_id
  and canonical.birth_date is not distinct from old_student.birth_date
  and private.normalize_student_name(canonical.first_name) = private.normalize_student_name(old_student.first_name)
  and private.normalize_student_name(canonical.last_name) = private.normalize_student_name(old_student.last_name);

-- A publication for the same document only needs one row on the canonical child.
delete from public.parent_document_publications source
using _merged_student_map m
where source.student_id = m.old_id
  and exists (select 1 from public.parent_document_publications target
              where target.student_id = m.canonical_id and target.document_id = source.document_id);
update public.parent_document_publications source
set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;

update public.school_document_requests source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;
update public.parent_document_requests source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;
update public.parent_student_association_history source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;

-- Consolidate guardian links if the same parent is linked to both records.
update public.student_guardians target
set active = target.active or source.active,
    can_view_academic = target.can_view_academic or source.can_view_academic,
    can_view_finance = target.can_view_finance or source.can_view_finance,
    is_primary = target.is_primary or source.is_primary
from public.student_guardians source
join _merged_student_map m on source.student_id = m.old_id
where target.student_id = m.canonical_id
  and target.guardian_user_id = source.guardian_user_id
  and target.establishment_id = source.establishment_id;

delete from public.student_guardians source
using _merged_student_map m
where source.student_id = m.old_id
  and exists (select 1 from public.student_guardians target
              where target.student_id = m.canonical_id
                and target.guardian_user_id = source.guardian_user_id
                and target.establishment_id = source.establishment_id);
update public.student_guardians source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;

-- Avoid duplicate lesson/date records; the canonical row wins when a collision exists.
delete from public.attendance_records source
using _merged_student_map m
where source.student_id = m.old_id
  and exists (select 1 from public.attendance_records target
              where target.student_id = m.canonical_id
                and target.attendance_date = source.attendance_date
                and target.lesson_key = source.lesson_key);
update public.attendance_records source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;

-- Move non-conflicting enrollments only. Conflicting yearly enrollments remain as
-- historical records so financial data is not overwritten.
update public.enrollments source set student_id = m.canonical_id
from _merged_student_map m
where source.student_id = m.old_id
  and not exists (select 1 from public.enrollments target
                  where target.student_id = m.canonical_id
                    and target.academic_year_id = source.academic_year_id);

delete from public.grades source
using _merged_student_map m
where source.student_id = m.old_id
  and exists (select 1 from public.grades target
              where target.student_id = m.canonical_id
                and target.assessment_id = source.assessment_id);
update public.grades source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;

delete from public.student_family_members source
using _merged_student_map m
where source.student_id = m.old_id
  and exists (select 1 from public.student_family_members target
              where target.student_id = m.canonical_id and target.family_id = source.family_id);
update public.student_family_members source set student_id = m.canonical_id
from _merged_student_map m where source.student_id = m.old_id;
