-- Create center_events table for holidays and special events
CREATE TABLE public.center_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_type text DEFAULT 'holiday', -- 'holiday', 'event', 'exam', 'meeting'
  is_holiday boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.center_events ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on center_events" 
ON public.center_events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Center users can manage their events
CREATE POLICY "Center users can manage their events" 
ON public.center_events 
FOR ALL 
USING (center_id = (SELECT center_id FROM users WHERE id = auth.uid()))
WITH CHECK (center_id = (SELECT center_id FROM users WHERE id = auth.uid()));

-- Create index
CREATE INDEX idx_center_events_center_date ON public.center_events(center_id, event_date);