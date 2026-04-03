
-- Migration to add context_data to chat_messages for Parent Decision Intelligence System

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'context_data') THEN
        ALTER TABLE public.chat_messages ADD COLUMN context_data jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;
