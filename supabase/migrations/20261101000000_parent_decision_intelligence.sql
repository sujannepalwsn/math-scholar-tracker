
-- Migration for Parent Decision Intelligence System

-- 1. Skill Taxonomy
CREATE TABLE IF NOT EXISTS public.skill_taxonomy (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    skill_code text NOT NULL, -- e.g., 'algebra_equations'
    skill_name text NOT NULL,
    parent_skill_id uuid REFERENCES public.skill_taxonomy(id),
    subject text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skill_taxonomy_pkey PRIMARY KEY (id),
    CONSTRAINT skill_taxonomy_code_center_unique UNIQUE(center_id, skill_code)
);

-- 2. Academic Performance History
CREATE TABLE IF NOT EXISTS public.academic_performance_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name text, -- Fallback/Direct name
    evaluation_type text NOT NULL, -- 'quiz', 'exam', 'assignment', 'lesson_evaluation'
    score numeric NOT NULL,
    max_score numeric NOT NULL,
    evaluation_date timestamp with time zone NOT NULL,
    evaluation_id uuid, -- Reference to tests.id or homework.id or student_chapters.id
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT academic_performance_history_pkey PRIMARY KEY (id)
);

-- 3. Study Session Logs
CREATE TABLE IF NOT EXISTS public.study_session_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    topic_id uuid, -- Can reference lesson_plans.id
    subject text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    duration_minutes numeric NOT NULL,
    activity_type text NOT NULL, -- 'reading', 'practice', 'quiz', 'video'
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT study_session_logs_pkey PRIMARY KEY (id)
);

-- 4. Question Skill Mapping
CREATE TABLE IF NOT EXISTS public.question_skill_mapping (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id text NOT NULL, -- ID within the JSONB questions array of tests
    skill_id uuid NOT NULL REFERENCES public.skill_taxonomy(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT question_skill_mapping_pkey PRIMARY KEY (id)
);

-- 5. Student Question Attempts
CREATE TABLE IF NOT EXISTS public.student_question_attempts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id text NOT NULL,
    attempt_number integer DEFAULT 1,
    is_correct boolean NOT NULL,
    time_taken_seconds integer,
    attempt_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_question_attempts_pkey PRIMARY KEY (id)
);

-- 6. Predictive Model Results
CREATE TABLE IF NOT EXISTS public.predictive_model_results (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject text,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    prediction_date timestamp with time zone DEFAULT now(),
    predicted_score_range jsonb, -- e.g., {"min": 75, "max": 85}
    risk_level text CHECK (risk_level IN ('Low', 'Medium', 'High')),
    confidence_score numeric, -- 0 to 1
    suggested_interventions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT predictive_model_results_pkey PRIMARY KEY (id)
);

-- 7. Recommendation Engine Rules
CREATE TABLE IF NOT EXISTS public.recommendation_engine_rules (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    rule_code text NOT NULL,
    trigger_condition jsonb NOT NULL,
    action_type text NOT NULL,
    recommendation_text text NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recommendation_engine_rules_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_engine_rules_code_center_unique UNIQUE(center_id, rule_code)
);

-- 8. Parent Action Logs
CREATE TABLE IF NOT EXISTS public.parent_action_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    parent_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    recommendation_id uuid REFERENCES public.recommendation_engine_rules(id) ON DELETE SET NULL,
    action_taken text NOT NULL, -- 'clicked', 'ignored', 'completed', 'viewed'
    timestamp timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parent_action_logs_pkey PRIMARY KEY (id)
);

-- 9. Student Milestones
CREATE TABLE IF NOT EXISTS public.student_milestones (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    milestone_type text NOT NULL, -- 'consistent_study_streak', 'improved_score', 'mastered_difficult_topic'
    description text NOT NULL,
    date_achieved date DEFAULT CURRENT_DATE,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_milestones_pkey PRIMARY KEY (id)
);

-- 10. Positive Reinforcement Logs
CREATE TABLE IF NOT EXISTS public.positive_reinforcement_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    message text NOT NULL,
    sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    timestamp timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT positive_reinforcement_logs_pkey PRIMARY KEY (id)
);

-- 11. Student Goals
CREATE TABLE IF NOT EXISTS public.student_goals (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    goal_description text NOT NULL,
    target_date date NOT NULL,
    required_metrics jsonb NOT NULL, -- e.g., {"subject": "Math", "min_avg": 85}
    status text DEFAULT 'on_track', -- 'on_track', 'behind', 'achieved', 'missed'
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_goals_pkey PRIMARY KEY (id)
);

-- 12. Learning Resource Catalog
CREATE TABLE IF NOT EXISTS public.learning_resource_catalog (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    resource_code text NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL, -- 'video', 'interactive_quiz', 'worksheet', 'article'
    skill_id uuid REFERENCES public.skill_taxonomy(id) ON DELETE SET NULL,
    difficulty_level text CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
    learning_modality text, -- 'visual', 'auditory', 'kinesthetic'
    url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT learning_resource_catalog_pkey PRIMARY KEY (id),
    CONSTRAINT learning_resource_catalog_code_center_unique UNIQUE(center_id, resource_code)
);

-- 13. Student Learning Preferences
CREATE TABLE IF NOT EXISTS public.student_learning_preferences (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    preferred_modality text,
    preferred_difficulty text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_learning_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT student_learning_preferences_student_unique UNIQUE(student_id)
);

-- 14. Communication Logs (Enhanced Contextual Messaging)
CREATE TABLE IF NOT EXISTS public.communication_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    message_body text NOT NULL,
    timestamp timestamp with time zone DEFAULT now(),
    context_data jsonb DEFAULT '{}'::jsonb, -- Stores relevant dashboard metrics
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT communication_logs_pkey PRIMARY KEY (id)
);

-- 15. Enhance existing tables
DO $$
BEGIN
    -- Enhance homework table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'submission_time') THEN
        ALTER TABLE public.homework ADD COLUMN submission_time timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'time_taken_minutes') THEN
        ALTER TABLE public.homework ADD COLUMN time_taken_minutes integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'expected_duration') THEN
        ALTER TABLE public.homework ADD COLUMN expected_duration integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'difficulty_level') THEN
        ALTER TABLE public.homework ADD COLUMN difficulty_level text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'score') THEN
        ALTER TABLE public.homework ADD COLUMN score numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework' AND column_name = 'max_score') THEN
        ALTER TABLE public.homework ADD COLUMN max_score numeric;
    END IF;

    -- Enhance student_homework_records to track detailed metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_homework_records' AND column_name = 'time_taken_minutes') THEN
        ALTER TABLE public.student_homework_records ADD COLUMN time_taken_minutes integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_homework_records' AND column_name = 'score') THEN
        ALTER TABLE public.student_homework_records ADD COLUMN score numeric;
    END IF;
END $$;

-- 16. Enable RLS and add Policies

-- Helper function to enable RLS for a list of tables
DO $$
DECLARE
    t text;
    tables_to_enable text[] := ARRAY[
        'skill_taxonomy', 'academic_performance_history', 'study_session_logs',
        'question_skill_mapping', 'student_question_attempts', 'predictive_model_results',
        'recommendation_engine_rules', 'parent_action_logs', 'student_milestones',
        'positive_reinforcement_logs', 'student_goals', 'learning_resource_catalog',
        'student_learning_preferences', 'communication_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_enable
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Default policy: Center Admins can view all center data
        EXECUTE format('CREATE POLICY "Center admins can view their center %I" ON public.%I FOR SELECT USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()))', t, t);

        -- Policy for Parents: View data for their linked students
        IF t IN ('academic_performance_history', 'study_session_logs', 'student_question_attempts', 'predictive_model_results', 'student_milestones', 'positive_reinforcement_logs', 'student_goals', 'student_learning_preferences') THEN
            EXECUTE format('CREATE POLICY "Parents can view their child %I" ON public.%I FOR SELECT USING (student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid()))', t, t);
        ELSIF t = 'communication_logs' THEN
             EXECUTE format('CREATE POLICY "Users can view their own %I" ON public.%I FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid())', t, t);
        ELSIF t = 'parent_action_logs' THEN
             EXECUTE format('CREATE POLICY "Parents can view their own %I" ON public.%I FOR SELECT USING (parent_id = auth.uid())', t, t);
        ELSE
            -- Global/Center-wide resources (skill_taxonomy, learning_resource_catalog, recommendation_engine_rules)
            EXECUTE format('CREATE POLICY "Parents can view center-wide %I" ON public.%I FOR SELECT USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()))', t, t);
        END IF;
    END LOOP;
END $$;
