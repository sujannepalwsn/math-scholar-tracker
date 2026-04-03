import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as bcrypt from "https://esm.sh/bcryptjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user by username
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('*, teachers(contract_end_date, is_active), centers(is_active)')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      console.error(JSON.stringify({ event: 'error', message: 'User not found:', details: userError }));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid username or password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if account is active
    if (!userData.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account deactivated. Please contact administrator.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check if center is active
    if (userData.centers && userData.centers.is_active === false) {
      return new Response(
        JSON.stringify({ success: false, error: 'Institution subscription suspended. Please contact administrator.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check for account expiry (Parent/General)
    if (userData.expiry_date && new Date(userData.expiry_date) < new Date()) {
      // Auto-deactivate in DB
      await supabaseClient
        .from('users')
        .update({ is_active: false })
        .eq('id', userData.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Account expired. Please contact administrator.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check for Teacher specific status
    if (userData.role === 'teacher' && userData.teachers?.[0]) {
      const teacher = userData.teachers[0];

      // 1. Check for manual deactivation in teachers table
      if (teacher.is_active === false) {
        // Ensure the users table is also synced if it wasn't
        await supabaseClient
          .from('users')
          .update({ is_active: false })
          .eq('id', userData.id);

        return new Response(
          JSON.stringify({ success: false, error: 'Teacher account suspended. Please contact administrator.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // 2. Check for contract expiry
      if (teacher.contract_end_date) {
        const contractEndDate = new Date(teacher.contract_end_date);
        if (contractEndDate < new Date()) {
          // Auto-deactivate in DB
          await supabaseClient
            .from('users')
            .update({ is_active: false })
            .eq('id', userData.id);

          return new Response(
            JSON.stringify({ success: false, error: 'Contract expired. Account deactivated.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
      }
    }

    // Verify password using bcrypt (matching how the application stores hashes)
    // Synchronous comparison ensures reliability in Edge environment
    const passwordMatch = bcrypt.compareSync(password, userData.password_hash);
    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid username or password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // AUTHENTICATE IN SUPABASE AUTH TO RESTORE RLS (auth.uid())
    // Note: This assumes the email/password for Supabase Auth matches the username/password
    // OR we manage Supabase Auth sessions separately.
    // In this app, users have both a public.users record and a corresponding auth.users record.
    const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(userData.id);

    let session = null;
    if (authData?.user) {
      // Since we don't have the user's password for Supabase Auth (it might be different from userData.password_hash)
      // We can generate a login link or just create a signed JWT if we're doing custom auth.
      // However, the standard way in this template is using supabase.auth.signInWithPassword.

      // If we are using the Edge Function to bridge, we need to sign them in.
      // We can try to use the user's email if it exists.
      const userEmail = authData.user.email;
      if (userEmail) {
        // Authenticate as the user to get a session
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (signInData?.session) {
          session = signInData.session;
        } else {
          console.error(JSON.stringify({ event: 'error', message: 'Failed to create Supabase session:', details: signInError }));
        }
      }
    }

    // Build user object with related data
    const user: Record<string, any> = {
      id: userData.id,
      username: userData.username,
      role: userData.role,
      center_id: userData.center_id,
      student_id: userData.student_id,
      teacher_id: userData.teacher_id,
    };

    // Fetch center name if center_id exists
    if (userData.center_id) {
      const { data: centerData } = await supabaseClient
        .from('centers')
        .select('name')
        .eq('id', userData.center_id)
        .single();
      
      if (centerData) {
        user.center_name = centerData.name;
      }
    }

    // Fetch student name if student_id exists (for single student)
    if (userData.student_id) {
      const { data: studentData } = await supabaseClient
        .from('students')
        .select('name')
        .eq('id', userData.student_id)
        .single();
      
      if (studentData) {
        user.student_name = studentData.name;
      }
    }

    // Fetch all linked students for parent
    if (userData.role === 'parent') {
      const { data: linkedStudents } = await supabaseClient
        .from('parent_students')
        .select('student_id, students(id, name, grade)')
        .eq('parent_user_id', userData.id);
      
      if (linkedStudents && linkedStudents.length > 0) {
        user.linked_students = linkedStudents.map((ls: any) => ({
          id: ls.students?.id,
          name: ls.students?.name,
          grade: ls.students?.grade,
        }));
      }
    }

    // Fetch teacher name if teacher_id exists
    if (userData.teacher_id) {
      const { data: teacherData } = await supabaseClient
        .from('teachers')
        .select('name')
        .eq('id', userData.teacher_id)
        .single();
      
      if (teacherData) {
        user.teacher_name = teacherData.name;
      }
    }

    // Update last login
    await supabaseClient
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    return new Response(
      JSON.stringify({ success: true, user, session }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error(JSON.stringify({ event: 'error', message: 'Login error:', details: error }));
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
