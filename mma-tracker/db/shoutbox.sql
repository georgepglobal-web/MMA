-- Create shoutbox_messages table
CREATE TABLE IF NOT EXISTS public.shoutbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('system','user')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shoutbox_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read messages
CREATE POLICY "select_authenticated" ON public.shoutbox_messages
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert messages only as themselves (user_id must equal auth.uid())
CREATE POLICY "insert_own" ON public.shoutbox_messages
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND new.user_id = auth.uid());

-- Allow owners to delete their own messages
CREATE POLICY "delete_owner" ON public.shoutbox_messages
  FOR DELETE
  USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Prevent updates (no editing of messages)
CREATE POLICY "no_update" ON public.shoutbox_messages
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Index for efficient ordering by newest messages
CREATE INDEX IF NOT EXISTS idx_shoutbox_created_at ON public.shoutbox_messages (created_at DESC);
