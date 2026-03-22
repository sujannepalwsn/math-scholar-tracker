import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the requesting user is a center admin or super admin
    const { data: userData, error: userLookupError } = await supabaseClient.from('users').select('role, center_id').eq('id', authUser.id).single();
    if (userLookupError || !['admin', 'center'].includes(userData?.role || '')) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { teacherId, featureName, isEnabled } = await req.json();

    if (!teacherId || !featureName || typeof isEnabled !== 'boolean') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // If center admin, verify the teacher belongs to the same center
    if (userData.role === 'center') {
      const { data: teacherData, error: teacherError } = await supabaseClient
        .from('teachers')
        .select('center_id')
        .eq('id', teacherId)
        .single();

      if (teacherError || teacherData?.center_id !== userData.center_id) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: Teacher does not belong to your center' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Upsert permission record
    const { data, error } = await supabaseClient
      .from("teacher_feature_permissions")
      .upsert({
        teacher_id: teacherId,
        [featureName]: isEnabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'teacher_id' })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in center-toggle-teacher-feature:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});