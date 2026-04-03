
-- Seed high-fidelity demonstration data for Parent Decision Intelligence System

DO $$
DECLARE
    v_center_id uuid;
    v_student_id uuid;
    v_parent_id uuid;
    v_math_id uuid;
    v_skill_id uuid;
    v_rec_id uuid;
BEGIN
    -- 1. Identify Demo Entities
    SELECT id INTO v_center_id FROM public.centers LIMIT 1;
    SELECT id INTO v_student_id FROM public.students WHERE center_id = v_center_id LIMIT 1;
    SELECT parent_user_id INTO v_parent_id FROM public.parent_students WHERE student_id = v_student_id LIMIT 1;

    IF v_center_id IS NULL OR v_student_id IS NULL OR v_parent_id IS NULL THEN
        RAISE NOTICE 'Demo entities not found. Ensure demo data exists.';
        RETURN;
    END IF;

    -- 2. Seed Skill Taxonomy
    INSERT INTO public.skill_taxonomy (center_id, skill_code, skill_name, subject)
    VALUES (v_center_id, 'math_algebra_1', 'Basic Algebra', 'Math')
    ON CONFLICT DO NOTHING RETURNING id INTO v_skill_id;

    -- 3. Seed Performance History
    INSERT INTO public.academic_performance_history (center_id, student_id, evaluation_type, score, max_score, evaluation_date, subject_name)
    VALUES
    (v_center_id, v_student_id, 'quiz', 85, 100, now() - interval '30 days', 'Math'),
    (v_center_id, v_student_id, 'quiz', 78, 100, now() - interval '20 days', 'Math'),
    (v_center_id, v_student_id, 'exam', 82, 100, now() - interval '10 days', 'Math'),
    (v_center_id, v_student_id, 'quiz', 65, 100, now() - interval '1 day', 'Math')
    ON CONFLICT DO NOTHING;

    -- 4. Seed Study Logs
    INSERT INTO public.study_session_logs (center_id, student_id, start_time, end_time, duration_minutes, activity_type, subject)
    VALUES
    (v_center_id, v_student_id, now() - interval '2 days 2 hours', now() - interval '2 days 1 hour', 60, 'reading', 'Math'),
    (v_center_id, v_student_id, now() - interval '1 day 3 hours', now() - interval '1 day 2 hours', 60, 'practice', 'Math')
    ON CONFLICT DO NOTHING;

    -- 5. Seed Milestones
    INSERT INTO public.student_milestones (center_id, student_id, milestone_type, description, date_achieved, metadata)
    VALUES
    (v_center_id, v_student_id, 'streak', 'Unstoppable Momentum: 21-day homework streak!', CURRENT_DATE - 2, '{"days": 21}'),
    (v_center_id, v_student_id, 'improvement', 'Calculus Breakthrough: Improved from 60% to 85%', CURRENT_DATE - 15, '{}')
    ON CONFLICT DO NOTHING;

    -- 6. Seed Recommendation Rules & Action Logs
    INSERT INTO public.recommendation_engine_rules (center_id, rule_code, trigger_condition, action_type, recommendation_text, priority)
    VALUES (v_center_id, 'math_drop_15', '{"metric": "score_drop", "threshold": 15}', 'Pedagogical', 'Schedule Math Review: Algebra performance dropped by 15%. Focus on quadratic equations.', 10)
    ON CONFLICT DO NOTHING RETURNING id INTO v_rec_id;

    IF v_rec_id IS NOT NULL THEN
        INSERT INTO public.parent_action_logs (center_id, parent_id, student_id, recommendation_id, action_taken)
        VALUES (v_center_id, v_parent_id, v_student_id, v_rec_id, 'viewed')
        ON CONFLICT DO NOTHING;
    END IF;

    -- 7. Seed Learning Resources
    INSERT INTO public.learning_resource_catalog (center_id, resource_code, title, type, skill_id, difficulty_level, url)
    VALUES (v_center_id, 'vid_alg_01', 'Mastering Quadratic Equations', 'video', v_skill_id, 'Intermediate', 'https://example.com/quadratic')
    ON CONFLICT DO NOTHING;

    -- 8. Seed Predictive Results (AI Insights)
    INSERT INTO public.predictive_model_results (center_id, student_id, risk_level, confidence_score, suggested_interventions, prediction_date)
    VALUES
    (v_center_id, v_student_id, 'Low', 0.95, '["Maintain consistency"]', now()),
    (v_center_id, v_student_id, 'Medium', 0.82, '["Review recent algebra quiz"]', now() - interval '7 days')
    ON CONFLICT DO NOTHING;

END $$;
