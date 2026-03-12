-- Fix Messaging System Schema and Restrictions
-- Requirements 6 & 7: Admin–Teacher Messaging and Broadcast Messages

-- 1. Extend chat_conversations to support teachers and better isolation
ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS teacher_user_id uuid REFERENCES public.users(id),
ALTER COLUMN parent_user_id DROP NOT NULL,
ALTER COLUMN student_id DROP NOT NULL;

-- 2. Clean up existing chat policies to be more restrictive
DROP POLICY IF EXISTS "Service role full access on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Service role full access on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Center Isolation Policy" ON public.chat_conversations;
DROP POLICY IF EXISTS "Center Isolation Policy" ON public.chat_messages;

-- 3. New stricter policies for chat_conversations
-- Center admins can see all conversations in their center
CREATE POLICY "Center admins can manage all chats"
ON public.chat_conversations
FOR ALL
USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()) AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'center');

-- Parents can only see conversations involving them
CREATE POLICY "Parents can view their own chats"
ON public.chat_conversations
FOR SELECT
USING (parent_user_id = auth.uid());

-- Teachers can only see conversations involving them
CREATE POLICY "Teachers can view their own chats"
ON public.chat_conversations
FOR SELECT
USING (teacher_user_id = auth.uid());

-- 4. New stricter policies for chat_messages
-- Matching conversations they have access to
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (
      c.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid() AND role = 'center')
      OR c.parent_user_id = auth.uid()
      OR c.teacher_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (
      c.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid() AND role = 'center')
      OR c.parent_user_id = auth.uid()
      OR c.teacher_user_id = auth.uid()
    )
  )
  AND sender_user_id = auth.uid()
);

-- 5. Broadcast message visibility fix
-- Ensure teachers and parents can view broadcast messages directed at them
DROP POLICY IF EXISTS "Center Isolation Policy" ON public.broadcast_messages;
CREATE POLICY "Users can view relevant broadcast messages"
ON public.broadcast_messages
FOR SELECT
USING (
  center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'center'
    OR (target_audience = 'all_parents' AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent')
    OR (target_audience = 'all_teachers' AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher')
    OR (target_audience LIKE 'grade_%' AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent' AND (SELECT grade FROM public.students s JOIN public.users u ON s.id = u.student_id WHERE u.id = auth.uid()) = split_part(target_audience, '_', 2))
  )
);
