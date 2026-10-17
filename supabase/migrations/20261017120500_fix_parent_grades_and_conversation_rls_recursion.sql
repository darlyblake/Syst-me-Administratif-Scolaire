-- Break the grades <-> assessments RLS cycle for parent access.
create or replace function private.parent_can_view_assessment(
  p_assessment_id uuid,
  p_establishment_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grades g
    join public.student_guardians sg on sg.student_id = g.student_id
    join public.establishments e on e.id = sg.establishment_id
    where g.assessment_id = p_assessment_id
      and sg.establishment_id = p_establishment_id
      and sg.guardian_user_id = p_user_id
      and sg.active = true
      and sg.can_view_academic = true
      and e.status = 'active'::public.establishment_status
  );
$$;
revoke all on function private.parent_can_view_assessment(uuid, uuid, uuid) from public, anon;
grant execute on function private.parent_can_view_assessment(uuid, uuid, uuid) to authenticated;

drop policy if exists "Parents view assessments for linked children" on public.assessments;
create policy "Parents view assessments for linked children"
on public.assessments
for select
to authenticated
using (private.parent_can_view_assessment(id, establishment_id, (select auth.uid())));

-- Break the conversations <-> conversation_participants RLS cycle using
-- narrowly scoped SECURITY DEFINER checks with explicit user identity.
create or replace function private.can_manage_conversation_participants(
  p_conversation_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.created_by = p_actor_id
      and private.is_member(c.establishment_id)
  );
$$;

create or replace function private.can_add_conversation_participant(
  p_conversation_id uuid,
  p_participant_user_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.establishment_members em
      on em.establishment_id = c.establishment_id
     and em.user_id = p_participant_user_id
     and em.active = true
    where c.id = p_conversation_id
      and c.created_by = p_actor_id
      and private.is_member(c.establishment_id)
  );
$$;

create or replace function private.can_view_conversation_participant(
  p_conversation_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and private.is_member(c.establishment_id)
      and coalesce(
        (select p.account_type from public.profiles p where p.id = p_actor_id),
        'school_member'::public.account_type
      ) <> 'parent'::public.account_type
  );
$$;

revoke all on function private.can_manage_conversation_participants(uuid, uuid) from public, anon;
revoke all on function private.can_add_conversation_participant(uuid, uuid, uuid) from public, anon;
revoke all on function private.can_view_conversation_participant(uuid, uuid) from public, anon;
grant execute on function private.can_manage_conversation_participants(uuid, uuid) to authenticated;
grant execute on function private.can_add_conversation_participant(uuid, uuid, uuid) to authenticated;
grant execute on function private.can_view_conversation_participant(uuid, uuid) to authenticated;

drop policy if exists "conversation_creator_manages_participants" on public.conversation_participants;
create policy "conversation_creator_manages_participants"
on public.conversation_participants
for all
to authenticated
using (private.can_manage_conversation_participants(conversation_id, (select auth.uid())))
with check (private.can_add_conversation_participant(conversation_id, user_id, (select auth.uid())));

drop policy if exists "conversation_participant_member_non_parent" on public.conversation_participants;
create policy "conversation_participant_member_non_parent"
on public.conversation_participants
for select
to authenticated
using (private.can_view_conversation_participant(conversation_id, (select auth.uid())));
