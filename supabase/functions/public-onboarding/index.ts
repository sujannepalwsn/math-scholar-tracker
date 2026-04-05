import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import * as bcrypt from "https://esm.sh/bcryptjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const {
      schoolName,
      location,
      adminName,
      adminPhone,
      adminEmail,
      adminPassword,
      modules,
      plan,
      referralSource
    } = body;

    if (!schoolName || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Required fields missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', adminEmail)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email already registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create center
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .insert({
        name: schoolName,
        address: location || null,
        is_active: true,
        header_config: { layout: 'classic', elements: [] },
        phone: adminPhone || null
      })
      .select()
      .single();

    if (centerError) throw centerError;

    // Hash password using bcryptjs (consistent with auth-login)
    // Using 10 rounds for balance between security and performance in Edge environment
    // Synchronous hashing ensures reliability in Edge environment
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    // Create user in public.users
    const { data: userCreated, error: userCreatedError } = await supabase
      .from('users')
      .insert({
        username: adminEmail,
        password_hash: passwordHash,
        role: 'center',
        center_id: center.id,
        is_active: true
      })
      .select()
      .single();

    if (userCreatedError) {
      await supabase.from('centers').delete().eq('id', center.id);
      throw userCreatedError;
    }

    // Provision default permissions
    if (modules && modules.length > 0) {
        // Map the selected modules to the actual database columns
        await supabase.from('center_feature_permissions').upsert({
            center_id: center.id,
            lesson_plans: modules.includes('academic'),
            lesson_tracking: modules.includes('academic'),
            test_management: modules.includes('academic'),
            exams_results: modules.includes('academic'),
            take_attendance: modules.includes('attendance'),
            attendance_summary: modules.includes('attendance'),
            finance: modules.includes('finance'),
            messaging: modules.includes('comm'),
            meetings_management: modules.includes('comm'),
            calendar_events: modules.includes('comm'),
            inventory_assets: modules.includes('inventory'),
            hr_management: modules.includes('hr'),
            leave_management: modules.includes('hr'),
            dashboard_access: true,
            about_institution: true
        });
    }

    // Log the onboarding event
    console.log('New Onboarding Success:', center.id, adminEmail);

    return new Response(
      JSON.stringify({
          success: true,
          message: 'Account created successfully',
          centerId: center.id,
          username: adminEmail
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(JSON.stringify({ event: 'error', message: 'Onboarding error:', details: error }));
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
