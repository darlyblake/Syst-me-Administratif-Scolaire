-- Harden the parent portal: data access must be enforced by Supabase RLS,
-- not only by frontend filtering.

-- Notifications are personal to the authenticated recipient.
DROP POLICY IF EXISTS "Parents view own notifications" ON public.notifications;
CREATE POLICY "Parents view own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (recipient_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Parents update own notifications" ON public.notifications;
CREATE POLICY "Parents update own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (recipient_user_id = (select auth.uid()))
WITH CHECK (recipient_user_id = (select auth.uid()));

-- A parent can only discover conversations in which they participate.
DROP POLICY IF EXISTS "Parents view participating conversations" ON public.conversations;
CREATE POLICY "Parents view participating conversations" ON public.conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = (select auth.uid())
  )
);

-- A parent may create a conversation only for an establishment linked to one
-- of their children. Participant membership is still required to read it.
DROP POLICY IF EXISTS "Parents create linked conversations" ON public.conversations;
CREATE POLICY "Parents create linked conversations" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_guardians sg
    WHERE sg.establishment_id = conversations.establishment_id
      AND sg.guardian_user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users view own conversation membership" ON public.conversation_participants;
CREATE POLICY "Users view own conversation membership" ON public.conversation_participants
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users join linked conversations" ON public.conversation_participants;
CREATE POLICY "Users join linked conversations" ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND EXISTS (
        SELECT 1 FROM public.student_guardians sg
        WHERE sg.establishment_id = c.establishment_id
          AND sg.guardian_user_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Users update own conversation membership" ON public.conversation_participants;
CREATE POLICY "Users update own conversation membership" ON public.conversation_participants
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Participants view conversation messages" ON public.messages;
CREATE POLICY "Participants view conversation messages" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Participants send conversation messages" ON public.messages;
CREATE POLICY "Participants send conversation messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = (select auth.uid())
  )
);
