-- Explicitly remove anonymous RPC access; these functions contain school and family data.
revoke execute on function public.search_family_sibling_candidates(uuid,text) from anon, public;
revoke execute on function public.create_student_enrollment_with_family_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid) from anon, public;
revoke execute on function public.refresh_enrollment_payer_totals(uuid) from anon, public;
grant execute on function public.search_family_sibling_candidates(uuid,text) to authenticated;
grant execute on function public.create_student_enrollment_with_family_funding(uuid,uuid,uuid,uuid,date,uuid,text,text,text,date,text,text,text,uuid[],uuid[],boolean,text,boolean,boolean,uuid,text,uuid) to authenticated;
grant execute on function public.refresh_enrollment_payer_totals(uuid) to authenticated;
