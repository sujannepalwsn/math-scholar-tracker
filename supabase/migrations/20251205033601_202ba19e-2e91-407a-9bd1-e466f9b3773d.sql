-- Create security definer functions to avoid RLS recursion

-- Function to get current user's center_id safely
CREATE OR REPLACE FUNCTION public.get_user_center_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT center_id FROM public.users WHERE id = user_id LIMIT 1
$$;

-- Function to get current user's role safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_id LIMIT 1
$$;

-- Function to check if user is in same center
CREATE OR REPLACE FUNCTION public.is_same_center(target_center_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND center_id = target_center_id
  )
$$;

-- Drop problematic policies on users table that cause recursion
DROP POLICY IF EXISTS "Center users can view other users in their center" ON public.users;

-- Create new non-recursive policy for users table
CREATE POLICY "Users can view users in their center"
ON public.users
FOR SELECT
USING (
  center_id = public.get_user_center_id(auth.uid())
  OR id = auth.uid()
);

-- Drop and recreate chat_conversations policies to avoid recursion
DROP POLICY IF EXISTS "Allow center users to manage their conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow parents to view and update their conversations" ON public.chat_conversations;

CREATE POLICY "Center users can manage conversations"
ON public.chat_conversations
FOR ALL
USING (
  center_id = public.get_user_center_id(auth.uid())
  AND public.get_user_role(auth.uid()) = 'center'
)
WITH CHECK (
  center_id = public.get_user_center_id(auth.uid())
  AND public.get_user_role(auth.uid()) = 'center'
);

CREATE POLICY "Parents can access their conversations"
ON public.chat_conversations
FOR ALL
USING (parent_user_id = auth.uid())
WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Teachers can view center conversations"
ON public.chat_conversations
FOR SELECT
USING (
  center_id = public.get_user_center_id(auth.uid())
  AND public.get_user_role(auth.uid()) = 'teacher'
);

-- Drop and recreate chat_messages policies
DROP POLICY IF EXISTS "Allow users to insert messages into their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow users to update their own messages (e.g., read status)" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow users to view messages in their conversations" ON public.chat_messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = chat_messages.conversation_id
    AND (
      cc.parent_user_id = auth.uid()
      OR (cc.center_id = public.get_user_center_id(auth.uid()) 
          AND public.get_user_role(auth.uid()) IN ('center', 'teacher'))
    )
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = chat_messages.conversation_id
    AND (
      cc.parent_user_id = auth.uid()
      OR (cc.center_id = public.get_user_center_id(auth.uid()) 
          AND public.get_user_role(auth.uid()) IN ('center', 'teacher'))
    )
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = chat_messages.conversation_id
    AND (
      cc.parent_user_id = auth.uid()
      OR (cc.center_id = public.get_user_center_id(auth.uid()) 
          AND public.get_user_role(auth.uid()) IN ('center', 'teacher'))
    )
  )
);