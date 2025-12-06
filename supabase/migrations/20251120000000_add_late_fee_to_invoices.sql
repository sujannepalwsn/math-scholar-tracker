ALTER TABLE public.invoices
ADD COLUMN late_fee_per_day NUMERIC(10, 2) DEFAULT 0.00;

-- Optional: Add a default value to existing rows if needed, or handle in application logic
-- UPDATE public.invoices SET late_fee_per_day = 0.00 WHERE late_fee_per_day IS NULL;