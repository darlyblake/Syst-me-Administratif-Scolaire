drop policy if exists "School admins manage finance settings" on public.establishment_finance_settings;
create policy "School admins manage finance settings" on public.establishment_finance_settings for all to authenticated
using (private.has_permission(establishment_id,'payments.manage'))
with check (private.has_permission(establishment_id,'payments.manage'));

drop policy if exists "School members view finance settings" on public.establishment_finance_settings;
create policy "School members view finance settings" on public.establishment_finance_settings for select to authenticated
using (private.has_permission(establishment_id,'payments.view'));
