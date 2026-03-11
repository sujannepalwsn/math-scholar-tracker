-- Add new columns to center_feature_permissions
ALTER TABLE public.center_feature_permissions
  ADD COLUMN IF NOT EXISTS leave_management boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_results boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS student_id_cards boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS teacher_performance boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS chapter_performance boolean DEFAULT true;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_name TEXT DEFAULT 'AI Solutions',
  contact_info TEXT DEFAULT 'contact@example.com',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (all authenticated users)
CREATE POLICY "Allow read access to all users" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

-- Create policy for service role (full access)
CREATE POLICY "Service role full access" ON public.system_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default row if not exists
INSERT INTO public.system_settings (developer_name, contact_info)
SELECT 'AI Solutions', 'contact@example.com'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
