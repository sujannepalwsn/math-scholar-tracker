import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as bcrypt from "https://esm.sh/bcryptjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    // Check if the requesting user is a super admin
    // Note: Since we are using a custom users table, we check role there
    const { data: userData, error: userError } = await supabaseClient.from('users').select('role').eq('id', user?.id).single();
    if (userError || userData?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { centerName, address, contactNumber, username, password } = await req.json();

    // Server-side validation
    if (!centerName || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Center name, username, and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Email/Username format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters long' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create center
    const { data: center, error: centerError } = await supabaseClient
      .from('centers')
      .insert({
        name: centerName,
        address: address || null,
        phone: contactNumber || null
      })
      .select()
      .single();

    if (centerError) throw centerError;

    // Hash password using bcryptjs
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { data: newUser, error: userError2 } = await supabaseClient
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        role: 'center',
        center_id: center.id,
        is_active: true
      })
      .select()
      .single();

    if (userError2) {
      // Rollback: delete the center if user creation fails
      await supabaseClient.from('centers').delete().eq('id', center.id);
      throw userError2;
    }

    console.log('Center created successfully:', center.id);

    return new Response(
      JSON.stringify({ success: true, center, user: { id: newUser.id, username: newUser.username } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Create center error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});