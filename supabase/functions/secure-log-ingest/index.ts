import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Basic validation
    if (!payload.message || !payload.error_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message and error_type are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Sanitize and limit the payload before insertion
    const logData = {
      message: String(payload.message).substring(0, 1000),
      error_type: String(payload.error_type).substring(0, 50),
      severity: String(payload.severity || 'medium').substring(0, 20),
      stack: payload.stack ? String(payload.stack).substring(0, 5000) : null,
      module: payload.module ? String(payload.module).substring(0, 100) : 'Public',
      component: payload.component ? String(payload.component).substring(0, 100) : 'PublicEntry',
      action: payload.action ? String(payload.action).substring(0, 100) : null,
      user_context: payload.user_context || {},
      device_info: payload.device_info || {},
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from('error_logs')
      .insert(logData);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Logging Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to record log' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
