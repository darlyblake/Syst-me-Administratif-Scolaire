-- Keep the enrollment listing RPC aligned with the frontend search contract.
-- The previous function accepted 6 parameters while the frontend supplied p_search,
-- which PostgREST correctly exposed as a 404 for the 7-argument signature.
create or replace function public.list_enrollments_paginated(
  p_establishment_id uuid,
  p_page integer default 1,
  p_page_size integer default 25,
  p_academic_year_id uuid default null,
  p_class_id uuid default null,
  p_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_total bigint;
  v_rows jsonb;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not (
    private.has_permission(p_establishment_id, 'enrollments.read')
    or private.has_permission(p_establishment_id, 'students.read')
  ) then
    raise exception 'Permission refusee';
  end if;

  select count(*)
  into v_total
  from public.enrollments e
  join public.students s on s.id = e.student_id
  where e.establishment_id = p_establishment_id
    and (p_academic_year_id is null or e.academic_year_id = p_academic_year_id)
    and (p_class_id is null or e.class_id = p_class_id)
    and (p_status is null or e.status::text = p_status)
    and (
      v_search is null
      or concat_ws(' ', s.first_name, s.last_name, s.student_number)
         ilike '%' || v_search || '%'
    );

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  into v_rows
  from (
    select
      e.id,
      e.student_id,
      e.academic_year_id,
      e.class_id,
      e.tuition_plan_id,
      e.enrollment_date,
      e.status,
      e.created_at,
      s.student_number,
      s.first_name,
      s.last_name
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.establishment_id = p_establishment_id
      and (p_academic_year_id is null or e.academic_year_id = p_academic_year_id)
      and (p_class_id is null or e.class_id = p_class_id)
      and (p_status is null or e.status::text = p_status)
      and (
        v_search is null
        or concat_ws(' ', s.first_name, s.last_name, s.student_number)
           ilike '%' || v_search || '%'
      )
    order by e.created_at desc, e.id desc
    limit v_size
    offset ((v_page - 1) * v_size)
  ) x;

  return jsonb_build_object(
    'data', v_rows,
    'page', v_page,
    'page_size', v_size,
    'total', v_total,
    'total_pages', case
      when v_total = 0 then 0
      else ceil(v_total::numeric / v_size)::int
    end
  );
end;
$$;

grant execute on function public.list_enrollments_paginated(uuid, integer, integer, uuid, uuid, text, text)
to authenticated;

notify pgrst;
