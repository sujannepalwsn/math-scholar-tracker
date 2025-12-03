import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { senderUserId, centerId, messageText, targetAudience, targetGrade } = await req.json();

    if (!senderUserId || !centerId || !messageText || !targetAudience) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sender, center, message, and target audience are required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert the broadcast message record
    const { data: broadcastMessage, error: broadcastError } = await supabase
      .from('broadcast_messages')
      .insert({
        center_id: centerId,
        sender_user_id: senderUserId,
        message_text: messageText,
        target_audience: targetAudience,
        target_grade: targetGrade || null,
      })
      .select()
      .single();

    if (broadcastError) throw broadcastError;

    let recipientUsers: any[] = [];

    if (targetAudience === 'all_parents' || targetAudience.startsWith('grade_')) {
      // Fetch students based on target audience
      let studentsQuery = supabase
        .from('students')
        .select('id, name, grade')
        .eq('center_id', centerId);

      if (targetAudience.startsWith('grade_') && targetGrade) {
        studentsQuery = studentsQuery.eq('grade', targetGrade);
      }

      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        const { data: parents, error: parentsError } = await supabase
          .from('users')
          .select('id, student_id')
          .eq('role', 'parent')
          .in('student_id', studentIds);
        if (parentsError) throw parentsError;
        recipientUsers = parents || [];
      }
    } else if (targetAudience === 'all_teachers') {
      const { data: teachers, error: teachersError } = await supabase
        .from('users')
        .select('id, teacher_id')
        .eq('role', 'teacher')
        .eq('center_id', centerId);
      if (teachersError) throw teachersError;
      recipientUsers = teachers || [];
    }
    // Add other target audiences (e.g., 'all_students', 'single_student', 'single_teacher') as needed

    const messagesToInsert: any[] = [];
    const conversationUpdates: Promise<any>[] = [];

    for (const recipient of recipientUsers) {
      let conversationId: string | null = null;

      // Find or create a conversation
      if (recipient.student_id) { // Parent-student conversation
        const { data: existingConversation, error: convError } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('center_id', centerId)
          .eq('student_id', recipient.student_id)
          .eq('parent_user_id', recipient.id)
          .maybeSingle();

        if (convError) console.error(`Error finding conversation for student ${recipient.student_id}:`, convError);

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          const { data: newConversation, error: newConvError } = await supabase
            .from('chat_conversations')
            .insert({
              center_id: centerId,
              student_id: recipient.student_id,
              parent_user_id: recipient.id,
            })
            .select('id')
            .single();
          if (newConvError) console.error(`Error creating conversation for student ${recipient.student_id}:`, newConvError);
          conversationId = newConversation?.id || null;
        }
      } else if (recipient.teacher_id) { // Teacher conversation (if applicable, assuming direct chat with center)
        // For now, broadcast to teachers will create a new conversation if not exists, or use existing one with center.
        // This part might need more specific logic depending on how teacher-center chats are structured.
        // For simplicity, we'll assume a direct chat between the sender (center user) and the teacher user.
        const { data: existingConversation, error: convError } = await supabase
          .from('chat_conversations')
          .select('id')
          .or(`(center_id.eq.${centerId},parent_user_id.eq.${recipient.id}),(center_id.eq.${centerId},parent_user_id.eq.${senderUserId})`) // Simplified for now
          .maybeSingle();

        if (convError) console.error(`Error finding conversation for teacher ${recipient.id}:`, convError);

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          // This part needs careful design. For a broadcast to teachers, a new conversation might not be ideal.
          // A dedicated 'broadcast' conversation type or direct messages might be better.
          // For now, I'll skip creating new conversations for teachers in broadcast to avoid complexity.
          // Instead, I'll assume teachers will see broadcast messages via a different mechanism or a dedicated broadcast channel.
          // The current chat_conversations table is designed for student-parent-center.
          console.log(`Skipping direct chat message for teacher ${recipient.id} in broadcast.`);
          continue;
        }
      }

      if (conversationId) {
        messagesToInsert.push({
          conversation_id: conversationId,
          sender_user_id: senderUserId,
          message_text: messageText,
          is_read: false, // Mark as unread for recipient
        });
        // Also update the conversation's updated_at timestamp
        conversationUpdates.push(
          supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
        );
      }
    }

    if (messagesToInsert.length > 0) {
      const { error: messagesError } = await supabase.from('chat_messages').insert(messagesToInsert);
      if (messagesError) throw messagesError;
    }

    // Execute all conversation updates concurrently
    await Promise.all(conversationUpdates);

    return new Response(
      JSON.stringify({
        success: true,
        broadcastId: broadcastMessage.id,
        recipientsCount: recipientUsers.length,
        messagesSent: messagesToInsert.length,
        message: `Broadcast message sent to ${messagesToInsert.length} conversations.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Send broadcast message error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to send broadcast message' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});