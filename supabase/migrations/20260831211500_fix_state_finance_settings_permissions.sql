drop policy if exists "School members view finance settings" on public.establishment_finance_settings;
create policy "School members view finance settings" on public.establishment_finance_settings for select to authenticated using (private.has_permission(establishment_id, 'school.manage'));
drop policy if exists "School admins manage finance settings" on public.establishment_finance_settings;
create policy "School admins manage finance settings" on public.establishment_finance_settings for all to authenticated using (private.has_permission(establishment_id, 'school.manage')) with check (private.has_permission(establishment_id, 'school.manage'));

create or replace function public.get_state_finance_settings(p_establishment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp' as $$
declare r public.establishment_finance_settings;
begin
  if not private.has_permission(p_establishment_id, 'school.manage') then raise exception 'Permission refusee'; end if;
  select * into r from public.establishment_finance_settings where establishment_id = p_establishment_id;
  if r.id is null then return jsonb_build_object('establishment_id',p_establishment_id,'state_students_enabled',false,'state_covers_registration',true,'state_covers_tuition',true,'state_allows_family_options',true,'state_allows_caution',false,'state_caution_default_amount',0,'state_caution_refundable',true); end if;
  return to_jsonb(r);
end; $$;

create or replace function public.upsert_state_finance_settings(
  p_establishment_id uuid,
  p_state_students_enabled boolean,
  p_state_covers_registration boolean,
  p_state_covers_tuition boolean,
  p_state_allows_family_options boolean,
  p_state_allows_caution boolean,
  p_state_caution_default_amount numeric,
  p_state_caution_refundable boolean
) returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare r public.establishment_finance_settings;
begin
  if not private.has_permission(p_establishment_id, 'school.manage') then raise exception 'Permission refusee'; end if;
  insert into public.establishment_finance_settings(establishment_id,state_students_enabled,state_covers_registration,state_covers_tuition,state_allows_family_options,state_allows_caution,state_caution_default_amount,state_caution_refundable,updated_at)
  values(p_establishment_id,p_state_students_enabled,p_state_covers_registration,p_state_covers_tuition,p_state_allows_family_options,p_state_allows_caution,greatest(coalesce(p_state_caution_default_amount,0),0),p_state_caution_refundable,now())
  on conflict (establishment_id) do update set state_students_enabled=excluded.state_students_enabled,state_covers_registration=excluded.state_covers_registration,state_covers_tuition=excluded.state_covers_tuition,state_allows_family_options=excluded.state_allows_family_options,state_allows_caution=excluded.state_allows_caution,state_caution_default_amount=excluded.state_caution_default_amount,state_caution_refundable=excluded.state_caution_refundable,updated_at=now()
  returning * into r;
  return to_jsonb(r);
end; $$;
