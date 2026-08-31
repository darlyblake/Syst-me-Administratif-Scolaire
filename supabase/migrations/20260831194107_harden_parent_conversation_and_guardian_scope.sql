-- Keep parent accounts restricted to their own guardian links and conversations.
-- RLS remains the authoritative authorization boundary.

drop policy if exists "student_guardians_member" on public.student_guardians;
create policy "student_guardians_member_non_parent"
on public.student_guardians
for select
to authenticated
using (
  private.is_member(establishment_id)
  and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

drop policy if exists "conversation_participant_member" on public.conversation_participants;
create policy "conversation_participant_member_non_parent"
on public.conversation_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_participants.conversation_id
      and private.is_member(c.establishment_id)
      and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
  )
);

create policy "Parents view own conversation participants"
on public.conversation_participants
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "conversations_member" on public.conversations;
create policy "conversations_member_non_parent"
on public.conversations
for select
to authenticated
using (
  private.is_member(establishment_id)
  and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);

create policy "Parents view participating conversations"
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversations.id
      and cp.user_id = (select auth.uid())
  )
);

drop policy if exists "conversations_manage" on public.conversations;
create policy "conversations_manage_non_parent"
on public.conversations
for all
to authenticated
using (
  private.is_member(establishment_id)
  and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
)
with check (
  private.is_member(establishment_id)
  and coalesce((select p.account_type from public.profiles p where p.id = (select auth.uid())), 'school_member'::account_type) <> 'parent'::account_type
);
