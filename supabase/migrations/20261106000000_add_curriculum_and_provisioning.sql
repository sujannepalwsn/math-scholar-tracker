-- Add curriculum_type to centers table
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS curriculum_type TEXT;

-- Create default grades and subjects function for CDC Nepal
CREATE OR REPLACE FUNCTION public.provision_cdc_nepal_data(p_center_id uuid)
RETURNS void AS $$
DECLARE
    v_grades text[] := ARRAY['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    v_subjects text[] := ARRAY['Nepali', 'English', 'Mathematics', 'Science and Technology', 'Social Studies', 'Health, Physical and Creative Arts', 'Moral Education'];
    v_grade text;
    v_subject text;
BEGIN
    -- This function is intended to be called by the onboarding edge function

    -- In this schema, subjects are per center
    FOR v_subject IN SELECT unnest(v_subjects) LOOP
        INSERT INTO public.subjects (center_id, name)
        VALUES (p_center_id, v_subject)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Grades are often just a text field in 'students' and 'tests',
    -- but if there was a grade_levels table, we would insert there.
    -- Currently 'students' table has a 'grade' text column.
    -- 'academic_years' might also need to be provisioned.

    INSERT INTO public.academic_years (center_id, name, start_date, end_date, is_current)
    VALUES (p_center_id, '2081/2082', CURRENT_DATE, CURRENT_DATE + interval '1 year', true)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
