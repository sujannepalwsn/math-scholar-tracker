-- Create center_events table for calendar events and holidays
CREATE TABLE public.center_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  is_holiday BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.center_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view events from their center"
ON public.center_events
FOR SELECT
USING (public.is_same_center(center_id));

CREATE POLICY "Users can create events in their center"
ON public.center_events
FOR INSERT
WITH CHECK (public.is_same_center(center_id));

CREATE POLICY "Users can update events in their center"
ON public.center_events
FOR UPDATE
USING (public.is_same_center(center_id));

CREATE POLICY "Users can delete events in their center"
ON public.center_events
FOR DELETE
USING (public.is_same_center(center_id));

-- Add index for faster queries
CREATE INDEX idx_center_events_center_date ON public.center_events(center_id, event_date);

-- Add trigger for updated_at
CREATE TRIGGER update_center_events_updated_at
  BEFORE UPDATE ON public.center_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();