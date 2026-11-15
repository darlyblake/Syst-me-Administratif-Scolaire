drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner"
on public.notifications
for select
to authenticated
using (
  recipient_user_id = (select auth.uid())
  and private.can_view_notification(establishment_id, type, entity_type, entity_id, (select auth.uid()))
);

drop policy if exists "Parents update own notifications" on public.notifications;
create policy "Parents update own notifications"
on public.notifications
for update
to authenticated
using (
  recipient_user_id = (select auth.uid())
  and private.can_view_notification(establishment_id, type, entity_type, entity_id, (select auth.uid()))
)
with check (
  recipient_user_id = (select auth.uid())
  and private.can_view_notification(establishment_id, type, entity_type, entity_id, (select auth.uid()))
);