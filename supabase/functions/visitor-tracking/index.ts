import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, payload } = await req.json();
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";

    // Geo from headers (Supabase/Vercel specific)
    const geo = {
      city: req.headers.get("x-vercel-ip-city") || req.headers.get("cf-ipcity") || "unknown",
      country: req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "unknown",
      region: req.headers.get("x-vercel-ip-country-region") || req.headers.get("cf-region") || "unknown",
      browser: req.headers.get("user-agent") || "unknown",
    };

    console.log(\`Visitor tracking action: \${action}\`, { ip, geo });

    if (action === "create-session") {
      const { visitor_type, user_id, fingerprint_id, entry_page } = payload;

      // 1. Find or create visitor
      let visitor;
      if (user_id) {
        const { data } = await supabase.from("visitors").select("id").eq("user_id", user_id).maybeSingle();
        visitor = data;
      } else if (fingerprint_id) {
        const { data } = await supabase.from("visitors").select("id").eq("fingerprint_id", fingerprint_id).maybeSingle();
        visitor = data;
      }

      if (!visitor) {
        const { data, error } = await supabase.from("visitors").insert({
          visitor_type,
          user_id,
          fingerprint_id,
          ip_address: ip,
          location: geo,
        }).select().single();
        if (error) throw error;
        visitor = data;
      }

      // 2. Create session
      const { data: session, error: sessionError } = await supabase.from("sessions").insert({
        visitor_id: visitor.id,
        entry_page: entry_page || '/',
      }).select().single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        throw sessionError;
      }

      return new Response(JSON.stringify({ success: true, sessionId: session.id, visitorId: visitor.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "log-events") {
      const { sessionId, events } = payload;
      if (!sessionId) {
        console.error('Missing sessionId in log-events');
        return new Response(JSON.stringify({ success: false, error: "Missing sessionId" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (!events || !events.length) {
        return new Response(JSON.stringify({ success: true, message: "No events to log" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventsToInsert = events.map((event: any) => ({
        session_id: sessionId,
        event_type: event.type,
        event_name: event.name,
        metadata: event.metadata || {},
        timestamp: event.timestamp || new Date().toISOString(),
      }));

      const { error } = await supabase.from("events").insert(eventsToInsert);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "end-session") {
      const { sessionId, exit_page } = payload;
      const now = new Date();

      const { data: session } = await supabase.from("sessions").select("session_start").eq("id", sessionId).single();

      let duration = null;
      if (session) {
        const start = new Date(session.session_start);
        const diffMs = now.getTime() - start.getTime();
        // Convert ms to Postgres interval format (approximate for duration calculation)
        duration = `${Math.floor(diffMs / 1000)} seconds`;
      }

      const { error } = await supabase.from("sessions").update({
        session_end: now.toISOString(),
        exit_page,
        duration,
      }).eq("id", sessionId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
