-- Allow staff who can manage enrollments or finance to read only the sponsor metadata needed by their workflows.
drop policy if exists sponsoring_org_read on public.sponsoring_organizations;
create policy sponsoring_org_read on public.sponsoring_organizations for select to authenticated
using (private.has_permission(establishment_id,'settings.read') or private.has_permission(establishment_id,'students.read') or private.has_permission(establishment_id,'enrollments.manage') or private.has_permission(establishment_id,'payments.read') or private.has_permission(establishment_id,'finance.view'));
drop policy if exists organization_coverage_rules_read on public.organization_coverage_rules;
create policy organization_coverage_rules_read on public.organization_coverage_rules for select to authenticated
using (private.has_permission(establishment_id,'settings.read') or private.has_permission(establishment_id,'students.read') or private.has_permission(establishment_id,'enrollments.manage'));
drop policy if exists family_discount_rules_read on public.family_discount_rules;
create policy family_discount_rules_read on public.family_discount_rules for select to authenticated
using (private.has_permission(establishment_id,'settings.read') or private.has_permission(establishment_id,'students.read') or private.has_permission(establishment_id,'enrollments.manage'));

create or replace function public.search_family_sibling_candidates(p_establishment_id uuid,p_search text)
returns table(student_id uuid,first_name text,last_name text,student_number text,birth_date date,class_name text,family_code text)
language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
begin
  if not (private.has_permission(p_establishment_id,'students.read') or private.has_permission(p_establishment_id,'enrollments.manage')) then raise exception 'Permission refusée'; end if;
  if length(trim(coalesce(p_search,'')))<2 then return; end if;
  return query
  select s.id,s.first_name,s.last_name,s.student_number,s.birth_date,sc.name,sf.family_code
  from public.students s
  left join lateral (select c.name from public.enrollments e join public.school_classes c on c.id=e.class_id
    where e.student_id=s.id and e.establishment_id=s.establishment_id and e.status='active' order by e.created_at desc limit 1) sc on true
  left join public.student_family_members sfm on sfm.student_id=s.id and sfm.establishment_id=s.establishment_id and sfm.active=true
  left join public.school_families sf on sf.id=sfm.family_id
  where s.establishment_id=p_establishment_id and s.active=true and s.merged_into_student_id is null
    and (s.first_name ilike '%'||trim(p_search)||'%' or s.last_name ilike '%'||trim(p_search)||'%' or coalesce(s.student_number,'') ilike '%'||trim(p_search)||'%')
  order by s.last_name,s.first_name limit 20;
end $$;
revoke all on function public.search_family_sibling_candidates(uuid,text) from anon, public;
grant execute on function public.search_family_sibling_candidates(uuid,text) to authenticated;
