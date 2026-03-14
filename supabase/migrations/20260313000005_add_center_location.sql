-- Add location tracking to centers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='centers' AND column_name='latitude') THEN
    ALTER TABLE public.centers ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='centers' AND column_name='longitude') THEN
    ALTER TABLE public.centers ADD COLUMN longitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='centers' AND column_name='radius_meters') THEN
    ALTER TABLE public.centers ADD COLUMN radius_meters INTEGER DEFAULT 100;
  END IF;
END $$;
