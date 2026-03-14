"use client";
import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { format } from "date-fns"

export default function TeacherMessaging() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!user || user.role !== 'teacher' || !user.id || !user.center_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a teacher to view messages.</div>;
  }

  // Fetch conversation for teacher with their center
  // This assumes a conversation exists where the teacher's user_id is treated as a 'parent_user_id'
  // in a conversation with their center. This is a workaround given the current schema.
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ["teacher-conversation", user.id, user.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          centers:center_id(id, name)
        `)
        .eq("parent_user_id", user.id) // Teacher's user ID
        .eq("center_id", user.center_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user.id && !!user.center_id });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["teacher-chat-messages", conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          sender:sender_user_id(id, username, role)
        `)
        .eq("conversation_id", conversation.id)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversation?.id,
    refetchInterval: 5000 });

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!conversation?.id || !user?.id) return;
      const unreadMessages = messages.filter(
        (m: any) => !m.is_read && m.sender_user_id !== user.id
      );
      if (unreadMessages.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in("id", unreadMessages.map((m: any) => m.id));
      }
    };
    markAsRead();
  }, [messages, conversation?.id, user?.id]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!conversation?.id || !user?.id || !newMessage.trim()) {
        throw new Error("Missing required data");
      }
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        sender_user_id: user.id,
        message_text: newMessage.trim() });
      if (error) throw error;

      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

      // Notify Center Admin
      await supabase.from('notifications').insert({
        center_id: user.center_id,
        user_id: null, // Broadcast to center
        title: `New message from teacher: ${user.username}`,
        message: newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? '...' : ''),
        type: 'info',
        link: '/messages'
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["teacher-chat-messages", conversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-conversation", user.id, user.center_id] }); // Invalidate conversation to update 'updated_at'
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send message");
    } });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate();
    }
  };

  if (conversationLoading) {
    return <div className="p-6 text-center">Loading messages...</div>;
  }

  if (!conversation) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversation started yet.</p>
            <p className="text-sm">The center will initiate a conversation with you soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Administrative Liaison
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Secure communication link with institutional leadership.</p>
          </div>
        </div>
      </div>

      <Card className="h-[700px] flex flex-col border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="bg-gradient-to-r from-primary to-violet-600 text-primary-foreground py-6 shadow-strong relative z-10 border-b border-border/10">
          <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
             <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                <MessageSquare className="h-6 w-6 text-white" />
             </div>
             <div className="space-y-0.5">
               <span>Institution Command</span>
               <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Official channel for {conversation.centers?.name || "Center"}</p>
             </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <p className="text-center text-muted-foreground">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg: any) => {
                  const isOwnMessage = msg.sender_user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                        <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {format(new Date(msg.sent_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim()) sendMessageMutation.mutate();
                }
              }}
              placeholder="Type a message... (Shift+Enter for new line)"
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button type="submit" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}