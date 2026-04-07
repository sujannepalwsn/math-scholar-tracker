-- Fix for missing RPCs in Production
-- Date: 2026-04-07
-- Description: Re-creating essential RPCs for attendance and finance.

BEGIN;

-- 1. Function to get pending student attendance by grade
CREATE OR REPLACE FUNCTION public.get_pending_attendance_by_grade(p_center_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (grade text, pending_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_teacher_id uuid;
    v_teacher_scope text;
    v_user_center_id uuid;
BEGIN
    -- Security Check: Verify user belongs to the requested center
    SELECT center_id, role, teacher_id INTO v_user_center_id, v_user_role, v_teacher_id
    FROM public.users WHERE id = auth.uid();

    IF v_user_center_id IS NULL OR (v_user_center_id != p_center_id AND v_user_role != 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view data for this center.';
    END IF;

    -- Check if it's a school day
    IF EXISTS (
        SELECT 1 FROM public.calendar_events
        WHERE center_id = p_center_id AND date = p_date AND is_school_day = false
    ) THEN
        RETURN;
    END IF;

    -- Get teacher scope
    SELECT teacher_scope_mode INTO v_teacher_scope
    FROM public.teacher_feature_permissions
    WHERE teacher_id = v_teacher_id;

    RETURN QUERY
    SELECT
        s.grade,
        COUNT(s.id) as pending_count
    FROM
        public.students s
    WHERE
        s.center_id = p_center_id
        AND s.is_active = true
        AND (
            v_user_role IN ('admin', 'center', 'super_admin')
            OR (v_user_role = 'teacher' AND (
                v_teacher_scope = 'full'
                OR s.grade IN (SELECT cta.grade FROM public.class_teacher_assignments cta WHERE cta.teacher_id = v_teacher_id)
            ))
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.attendance a
            WHERE a.student_id = s.id AND a.date = p_date
        )
    GROUP BY
        s.grade;
END;
$$;

-- 2. Function to get pending teacher attendance
CREATE OR REPLACE FUNCTION public.get_pending_teacher_attendance(p_center_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (teacher_id uuid, teacher_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_center_id uuid;
    v_user_role text;
BEGIN
    -- Security Check: Verify user belongs to the requested center
    SELECT center_id, role INTO v_user_center_id, v_user_role
    FROM public.users WHERE id = auth.uid();

    IF v_user_center_id IS NULL OR (v_user_center_id != p_center_id AND v_user_role != 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view data for this center.';
    END IF;

    -- Check if it's a school day
    IF EXISTS (
        SELECT 1 FROM public.calendar_events
        WHERE center_id = p_center_id AND date = p_date AND is_school_day = false
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        t.id,
        t.name
    FROM
        public.teachers t
    WHERE
        t.center_id = p_center_id
        AND t.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM public.teacher_attendance ta
            WHERE ta.teacher_id = t.id AND ta.date = p_date
        );
END;
$$;

-- 3. Atomic RPC to record a payment and update the associated invoice
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_total_amount NUMERIC;
  v_new_paid_amount NUMERIC;
BEGIN
  -- 1. Insert the payment record
  INSERT INTO public.payments (
    invoice_id,
    amount,
    payment_date,
    payment_method,
    reference_number
  ) VALUES (
    p_invoice_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_reference_number
  );

  -- 2. Update the invoice atomically
  -- We use a locked UPDATE to ensure no other process interferes with the balance calculation
  UPDATE public.invoices
  SET
    paid_amount = COALESCE(paid_amount, 0) + p_amount,
    updated_at = NOW(),
    status = CASE
      WHEN (COALESCE(paid_amount, 0) + p_amount) >= total_amount THEN 'paid'
      WHEN (COALESCE(paid_amount, 0) + p_amount) > 0 THEN 'partial'
      ELSE status
    END
  WHERE id = p_invoice_id
  RETURNING paid_amount INTO v_new_paid_amount;

  -- Optional: Log the transition for audit purposes
  RAISE NOTICE 'Invoice % updated. New paid amount: %', p_invoice_id, v_new_paid_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
