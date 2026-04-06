-- Drop problematic RLS policies and replace them with more efficient versions
DROP POLICY IF EXISTS admin_read_visitors ON public.visitors;
DROP POLICY IF EXISTS admin_read_sessions ON public.sessions;
DROP POLICY IF EXISTS admin_read_events ON public.events;
DROP POLICY IF EXISTS admin_read_trial_leads ON public.trial_leads;

-- More efficient RLS policies using auth.jwt() to check role directly
CREATE POLICY admin_read_visitors ON public.visitors FOR SELECT TO authenticated USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY admin_read_sessions ON public.sessions FOR SELECT TO authenticated USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY admin_read_events ON public.events FOR SELECT TO authenticated USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY admin_read_trial_leads ON public.trial_leads FOR SELECT TO authenticated USING (
    (auth.jwt() ->> 'role') = 'admin' OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Ensure service role can do anything (usually default, but let's be explicit for edge functions)
CREATE POLICY service_role_all_visitors ON public.visitors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_sessions ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_events ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Update get_visitor_analytics to be more robust
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
    active_role JSONB;
    visitors_over_time JSONB;
    duration_dist JSONB;
    dau INT;
    mau INT;
    avg_duration INTERVAL;
    bounce_rate FLOAT;
BEGIN
    -- 1. Simple counts & Active Users
    SELECT count(*) INTO total_visitors FROM public.visitors;
    SELECT count(DISTINCT fingerprint_id) INTO unique_visitors FROM public.visitors;
    SELECT count(*) INTO total_sessions FROM public.sessions;

    SELECT count(DISTINCT visitor_id) INTO dau FROM public.sessions
    WHERE session_start >= now() - interval '24 hours';

    SELECT count(DISTINCT visitor_id) INTO mau FROM public.sessions
    WHERE session_start >= now() - interval '30 days';

    -- 1.1 Average Duration & Bounce Rate
    SELECT COALESCE(avg(duration), '0 seconds'::interval) INTO avg_duration FROM public.sessions WHERE duration IS NOT NULL;

    SELECT COALESCE((count(s.id) FILTER (WHERE e_count.cnt = 1))::FLOAT / NULLIF(count(s.id), 0) * 100, 0) INTO bounce_rate
    FROM public.sessions s
    LEFT JOIN (
        SELECT session_id, count(*) as cnt
        FROM public.events
        GROUP BY session_id
    ) e_count ON s.id = e_count.session_id;

    -- 1.2 Visitors Over Time (Last 30 Days)
    SELECT COALESCE(jsonb_agg(v), '[]'::jsonb) INTO visitors_over_time FROM (
        SELECT
            to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as name,
            count(*) as value
        FROM public.visitors
        WHERE created_at >= now() - interval '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
    ) v;

    -- 1.3 Session Duration Distribution (Histogram)
    SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO duration_dist FROM (
        SELECT
            range as name,
            count(*) as value
        FROM (
            SELECT
                CASE
                    WHEN extract(epoch FROM duration) < 30 THEN '0-30s'
                    WHEN extract(epoch FROM duration) < 120 THEN '30s-2m'
                    WHEN extract(epoch FROM duration) < 600 THEN '2m-10m'
                    WHEN extract(epoch FROM duration) < 1800 THEN '10m-30m'
                    ELSE '30m+'
                END as range
            FROM public.sessions
            WHERE duration IS NOT NULL
        ) s
        GROUP BY range
        ORDER BY
            CASE range
                WHEN '0-30s' THEN 1
                WHEN '30s-2m' THEN 2
                WHEN '2m-10m' THEN 3
                WHEN '10m-30m' THEN 4
                ELSE 5
            END
    ) d;

    -- 2. Visitor Type Distribution
    SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO type_dist FROM (
        SELECT visitor_type as name, count(*) as value
        FROM public.visitors
        GROUP BY visitor_type
    ) d;

    -- 3. Feature Usage Ranking
    SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) INTO feature_usage FROM (
        SELECT event_name as name, count(*) as value
        FROM public.events
        WHERE event_type = 'feature_action'
        GROUP BY event_name
        ORDER BY value DESC
        LIMIT 10
    ) f;

    -- 4. Funnel analysis (Landing -> Trial -> Signup -> Active Use)
    SELECT jsonb_build_object(
        'landing', COALESCE((SELECT count(DISTINCT session_id) FROM public.events WHERE event_name = 'view_page' AND metadata->>'path' = '/'), 0),
        'trial', COALESCE((SELECT count(*) FROM public.trial_leads), 0),
        'signup', COALESCE((SELECT count(*) FROM public.users WHERE role != 'admin'), 0),
        'active', COALESCE((SELECT count(DISTINCT session_id) FROM public.events WHERE event_type = 'feature_action'), 0)
    ) INTO funnel_data;

    -- 5. Top Drop-off Pages (Exit Pages)
    SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO top_drop_offs FROM (
        SELECT exit_page as name, count(*) as value
        FROM public.sessions
        WHERE exit_page IS NOT NULL
        GROUP BY exit_page
        ORDER BY value DESC
        LIMIT 5
    ) p;

    -- 6. Peak Usage Time (Hour of day)
    SELECT jsonb_build_object(
        'hour', COALESCE((
            SELECT extract(hour from session_start) as h
            FROM public.sessions
            GROUP BY h
            ORDER BY count(*) DESC
            LIMIT 1
        ), 0),
        'count', COALESCE((
            SELECT count(*)
            FROM public.sessions
            GROUP BY extract(hour from session_start)
            ORDER BY count(*) DESC
            LIMIT 1
        ), 0)
    ) INTO peak_usage;

    -- 7. Most Active Role
    SELECT jsonb_build_object('role', COALESCE(role, 'None'), 'count', count(*)) INTO active_role
    FROM public.visitors v
    JOIN public.users u ON v.user_id = u.id
    GROUP BY role
    ORDER BY count(*) DESC
    LIMIT 1;

    IF active_role IS NULL THEN
        active_role := '{"role": "None", "count": 0}'::jsonb;
    END IF;

    -- Combine results
    result := jsonb_build_object(
        'total_visitors', COALESCE(total_visitors, 0),
        'unique_visitors', COALESCE(unique_visitors, 0),
        'total_sessions', COALESCE(total_sessions, 0),
        'dau', COALESCE(dau, 0),
        'mau', COALESCE(mau, 0),
        'avg_duration', to_char(avg_duration, 'HH24:MI:SS'),
        'bounce_rate', round(bounce_rate::numeric, 2),
        'visitors_over_time', visitors_over_time,
        'duration_dist', duration_dist,
        'active_role', active_role,
        'type_dist', type_dist,
        'feature_usage', feature_usage,
        'funnel', funnel_data,
        'top_drop_offs', top_drop_offs,
        'peak_usage', peak_usage
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
