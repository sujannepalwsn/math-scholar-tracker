
-- Backend Intelligence Functions for Parent Decision Intelligence System

-- 1. Calculate Effort Index
CREATE OR REPLACE FUNCTION public.calculate_effort_index(p_student_id uuid, p_start_date date, p_end_date date)
RETURNS numeric AS $$
DECLARE
    avg_study_time numeric;
    homework_completion_rate numeric;
    engagement_score numeric;
    total_effort numeric;
BEGIN
    -- Average study time (normalized to 100, assuming 60 mins/day is ideal)
    SELECT COALESCE(AVG(duration_minutes), 0) / 60 * 100 INTO avg_study_time
    FROM public.study_session_logs
    WHERE student_id = p_student_id AND start_time::date >= p_start_date AND start_time::date <= p_end_date;

    -- Homework completion rate
    SELECT COALESCE(COUNT(*) FILTER (WHERE status IN ('completed', 'checked'))::numeric / NULLIF(COUNT(*), 0) * 100, 0)
    INTO homework_completion_rate
    FROM public.student_homework_records shr
    JOIN public.homework h ON shr.homework_id = h.id
    WHERE shr.student_id = p_student_id AND h.due_date >= p_start_date AND h.due_date <= p_end_date;

    -- Final effort index (weighted average)
    total_effort := (avg_study_time * 0.4) + (homework_completion_rate * 0.6);
    RETURN LEAST(ROUND(total_effort, 2), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Calculate Outcome Index
CREATE OR REPLACE FUNCTION public.calculate_outcome_index(p_student_id uuid, p_start_date date, p_end_date date)
RETURNS numeric AS $$
DECLARE
    avg_test_score numeric;
    avg_evaluation_rating numeric;
    total_outcome numeric;
BEGIN
    -- Average test score %
    SELECT COALESCE(AVG(score / NULLIF(max_score, 0)) * 100, 0) INTO avg_test_score
    FROM public.academic_performance_history
    WHERE student_id = p_student_id AND evaluation_date::date >= p_start_date AND evaluation_date::date <= p_end_date;

    -- Final outcome index
    total_outcome := avg_test_score; -- Simplified for now
    RETURN LEAST(ROUND(total_outcome, 2), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Detect Performance Trends (Recommendation 1 & 14)
CREATE OR REPLACE FUNCTION public.get_student_performance_trends(p_student_id uuid, p_subject text)
RETURNS TABLE (
    evaluation_date timestamp with time zone,
    score numeric,
    max_score numeric,
    percentage numeric,
    trend_status text,
    risk_level text
) AS $$
DECLARE
    last_score numeric;
    prev_score numeric;
    trend text;
    risk text;
BEGIN
    RETURN QUERY
    WITH scores AS (
        SELECT
            aph.evaluation_date,
            aph.score,
            aph.max_score,
            (aph.score / NULLIF(aph.max_score, 0) * 100) as pct
        FROM public.academic_performance_history aph
        WHERE aph.student_id = p_student_id AND (p_subject IS NULL OR aph.subject_name = p_subject)
        ORDER BY aph.evaluation_date ASC
    )
    SELECT
        s.evaluation_date,
        s.score,
        s.max_score,
        s.pct,
        CASE
            WHEN LAG(s.pct) OVER (ORDER BY s.evaluation_date) IS NULL THEN 'Stable'
            WHEN s.pct > LAG(s.pct) OVER (ORDER BY s.evaluation_date) THEN 'Improving'
            WHEN s.pct < LAG(s.pct) OVER (ORDER BY s.evaluation_date) THEN 'Declining'
            ELSE 'Stable'
        END as trend_status,
        CASE
            WHEN s.pct < 50 THEN 'High'
            WHEN s.pct < 75 THEN 'Medium'
            ELSE 'Low'
        END as risk_level
    FROM scores s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Skill Mastery (Recommendation 4)
CREATE OR REPLACE FUNCTION public.get_student_skill_mastery(p_student_id uuid, p_subject text)
RETURNS TABLE (
    skill_name text,
    mastery_score numeric,
    status text,
    parent_skill_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.skill_name,
        COALESCE(AVG(CASE WHEN sqa.is_correct THEN 100 ELSE 0 END), 0) as mastery_score,
        CASE
            WHEN AVG(CASE WHEN sqa.is_correct THEN 100 ELSE 0 END) >= 75 THEN 'Mastered'
            WHEN AVG(CASE WHEN sqa.is_correct THEN 100 ELSE 0 END) >= 50 THEN 'Learning'
            ELSE 'Struggling'
        END as status,
        pst.skill_name as parent_skill_name
    FROM public.skill_taxonomy st
    LEFT JOIN public.question_skill_mapping qsm ON qsm.skill_id = st.id
    LEFT JOIN public.student_question_attempts sqa ON sqa.question_id = qsm.question_id AND sqa.student_id = p_student_id
    LEFT JOIN public.skill_taxonomy pst ON st.parent_skill_id = pst.id
    WHERE st.subject = p_subject
    GROUP BY st.id, st.skill_name, pst.skill_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
