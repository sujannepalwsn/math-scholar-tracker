-- Create the lesson-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for lesson-files bucket
CREATE POLICY "Center users can upload lesson files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-files');

CREATE POLICY "Anyone can view lesson files"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-files');

CREATE POLICY "Center users can delete their lesson files"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-files');