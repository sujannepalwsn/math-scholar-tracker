-- RPC to get system-wide statistics for cost engine

CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_centers INT;
    total_teachers INT;
    total_students INT;
    total_parents INT;
    total_admins INT;
    table_stats JSONB;
BEGIN
    -- Basic Counts
    SELECT count(*) INTO total_centers FROM public.centers;
    SELECT count(*) INTO total_teachers FROM public.teachers;
    SELECT count(*) INTO total_students FROM public.students;
    SELECT count(*) INTO total_parents FROM public.parents;
    SELECT count(*) INTO total_admins FROM public.users WHERE role = 'admin';

    -- Center Breakdown (Enhanced with correct column names for current schema)
    SELECT jsonb_agg(c) INTO result FROM (
        SELECT
            c.id,
            c.name,
            (SELECT count(*) FROM public.students s WHERE s.center_id = c.id) as student_count,
            (SELECT count(*) FROM public.teachers t WHERE t.center_id = c.id) as teacher_count,
            (SELECT count(*) FROM public.attendance a WHERE a.center_id = c.id) as activity_row_count
        FROM public.centers c
        WHERE c.is_active = true
    ) c;

    -- Table Stats (Estimated row counts and sizes)
    -- We use pg_class for efficient estimation
    SELECT jsonb_agg(t) INTO table_stats FROM (
        SELECT
            relname as table_name,
            reltuples::bigint as estimated_rows,
            pg_total_relation_size(oid) as total_size_bytes
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE nspname = 'public'
          AND relkind = 'r'
          AND relname NOT IN ('visitors', 'sessions', 'events') -- Handled by visitor logs
        ORDER BY pg_total_relation_size(oid) DESC
    ) t;

    result := jsonb_build_object(
        'counts', jsonb_build_object(
            'centers', total_centers,
            'teachers', total_teachers,
            'students', total_students,
            'parents', total_parents,
            'admins', total_admins
        ),
        'center_breakdown', result,
        'table_stats', table_stats,
        'timestamp', now()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
