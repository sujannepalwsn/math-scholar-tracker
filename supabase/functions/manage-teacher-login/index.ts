import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, teacherId, username, password } = body;

    if (!action || !teacherId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action and Teacher ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify requesting user and get context
    // We use the authHeader to get the user making the request
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !authUser) throw new Error('Unauthorized');

    const { data: profile } = await supabase.from('users').select('id, role, center_id').eq('id', authUser.id).single();
    if (!profile) throw new Error('Profile not found');
    if (profile.role !== 'center' && profile.role !== 'admin') throw new Error('Forbidden');

    const requesterCenterId = profile.center_id;

    // Verify teacher exists and belongs to the same center (if not global admin)
    const { data: teacher, error: teacherFetchError } = await supabase
      .from('teachers')
      .select('id, center_id, name, contract_end_date, user_id, email')
      .eq('id', teacherId)
      .single();

    if (teacherFetchError || !teacher) {
      return new Response(
        JSON.stringify({ success: false, error: 'Teacher not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (profile.role !== 'admin' && teacher.center_id !== requesterCenterId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Teacher belongs to a different center' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (action === 'create') {
      if (!username || !password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username and password are required for creation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if teacher already has a login
      if (teacher.user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Teacher already has a system access account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if username already exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username already exists' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check for contract expiry
      if (teacher.contract_end_date && new Date(teacher.contract_end_date) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot create login for teacher with expired contract' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // 1. Create user in Supabase Auth (auth.users)
      // We use the teacher's email if available, otherwise we use the username as a placeholder email
      // standard Supabase Auth requires an email or phone.
      const userEmail = username.includes('@') ? username : `${username}@internal.eduflow.com`;

      const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'teacher', center_id: teacher.center_id }
      });

      if (authCreateError) {
        console.error('Auth User Creation Error:', authCreateError);
        return new Response(
          JSON.stringify({ success: false, error: \`Auth creation failed: \${authCreateError.message}\` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const newUserId = authData.user.id;
      const passwordHash = bcrypt.hashSync(password, 10);

      // 2. Create teacher user in public.users
      // We use the same ID as auth.users to maintain consistency for auth.uid()
      const { data: newUser, error: userCreateError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          username,
          password_hash: passwordHash,
          role: 'teacher',
          center_id: teacher.center_id,
          teacher_id: teacher.id,
          is_active: true
        })
        .select()
        .single();

      if (userCreateError) {
        // Rollback Auth User
        await supabase.auth.admin.deleteUser(newUserId);
        throw userCreateError;
      }

      // 3. Link public user to teacher record
      const { error: teacherUpdateError } = await supabase
        .from('teachers')
        .update({ user_id: newUserId })
        .eq('id', teacher.id);

      if (teacherUpdateError) {
        // We don't rollback everything here but we should log it
        console.error('Failed to link user to teacher:', teacherUpdateError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Teacher login created successfully', userId: newUserId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update-password') {
      if (!password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (!teacher.user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Teacher does not have a login account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Update in Supabase Auth
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(teacher.user_id, {
        password: password
      });

      if (authUpdateError) {
        console.error('Auth Password Update Error:', authUpdateError);
      }

      // Update in public.users for the custom auth-login flow
      const passwordHash = bcrypt.hashSync(password, 10);
      const { error: passwordUpdateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', teacher.user_id);

      if (passwordUpdateError) throw passwordUpdateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error: any) {
    console.error(JSON.stringify({ event: 'error', message: 'Manage teacher login error:', details: error }));
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
