"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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
    enabled: !!user.id && !!user.center_id,
  });

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
    refetchInterval: 5000,
  });

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
        message_text: newMessage.trim(),
      });
      if (error) throw error;

      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["teacher-chat-messages", conversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-conversation", user.id, user.center_id] }); // Invalidate conversation to update 'updated_at'
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send message");
    },
  });

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Messages</h1>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Chat with {conversation.centers?.name || "Center"}
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
                        <p className="text-sm">{msg.message_text}</p>
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
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
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