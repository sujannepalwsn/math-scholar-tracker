-- RPC for Visitor Analytics

CREATE OR REPLACE FUNCTION public.get_visitor_analytics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_visitors INT;
    unique_visitors INT;
    total_sessions INT;
    type_dist JSONB;
    feature_usage JSONB;
    funnel_data JSONB;
    top_drop_offs JSONB;
    peak_usage JSONB;
BEGIN
    -- 1. Simple counts
    SELECT count(*) INTO total_visitors FROM public.visitors;
    SELECT count(DISTINCT fingerprint_id) INTO unique_visitors FROM public.visitors;
    SELECT count(*) INTO total_sessions FROM public.sessions;

    -- 2. Visitor Type Distribution
    SELECT jsonb_agg(d) INTO type_dist FROM (
        SELECT visitor_type as name, count(*) as value
        FROM public.visitors
        GROUP BY visitor_type
    ) d;

    -- 3. Feature Usage Ranking
    SELECT jsonb_agg(f) INTO feature_usage FROM (
        SELECT event_name as name, count(*) as value
        FROM public.events
        WHERE event_type = 'feature_action'
        GROUP BY event_name
        ORDER BY value DESC
        LIMIT 10
    ) f;

    -- 4. Funnel analysis (Landing -> Trial -> Signup)
    -- Simplified: count unique fingerprints reaching these stages
    SELECT jsonb_build_object(
        'landing', (SELECT count(DISTINCT session_id) FROM public.events WHERE event_name = 'view_page' AND metadata->>'path' = '/'),
        'trial', (SELECT count(*) FROM public.trial_leads),
        'signup', (SELECT count(*) FROM public.users WHERE role != 'admin')
    ) INTO funnel_data;

    -- 5. Top Drop-off Pages (Exit Pages)
    SELECT jsonb_agg(p) INTO top_drop_offs FROM (
        SELECT exit_page as name, count(*) as value
        FROM public.sessions
        WHERE exit_page IS NOT NULL
        GROUP BY exit_page
        ORDER BY value DESC
        LIMIT 5
    ) p;

    -- 6. Peak Usage Time (Hour of day)
    SELECT jsonb_build_object(
        'hour', (
            SELECT extract(hour from session_start) as h
            FROM public.sessions
            GROUP BY h
            ORDER BY count(*) DESC
            LIMIT 1
        ),
        'count', (
            SELECT count(*)
            FROM public.sessions
            GROUP BY extract(hour from session_start)
            ORDER BY count(*) DESC
            LIMIT 1
        )
    ) INTO peak_usage;

    -- Combine results
    result := jsonb_build_object(
        'total_visitors', total_visitors,
        'unique_visitors', unique_visitors,
        'total_sessions', total_sessions,
        'type_dist', type_dist,
        'feature_usage', feature_usage,
        'funnel', funnel_data,
        'top_drop_offs', top_drop_offs,
        'peak_usage', peak_usage
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
