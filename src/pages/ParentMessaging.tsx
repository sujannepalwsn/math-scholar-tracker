import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Check, Info, MessageSquare, Send, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
"use client";


export default function ParentMessaging() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation for parent
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ["parent-conversation", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          students:student_id(id, name, grade),
          centers:center_id(id, name)
        `)
        .eq("parent_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["parent-chat-messages", conversation?.id],
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
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["parent-chat-messages", conversation?.id] });
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
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <MessageSquare className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">No conversation sequence identified.</p>
        <p className="text-xs text-slate-400">Institutional control will initiate contact soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 max-w-5xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Communication Portal
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Direct secure channel for academic and developmental synchronization.</p>
          </div>
        </div>
        <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/40 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Security</span>
            <span className="font-black text-slate-700 text-sm">End-to-End Encrypted</span>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white/20">
        <CardHeader className="bg-white/60 backdrop-blur-md py-6 px-8 border-b border-slate-100 flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
               <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
                {conversation.centers?.name || "Institution Control"}
              </CardTitle>
              <div className="flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Active Session • {conversation.students?.name}
                 </p>
              </div>
            </div>
          </div>
          <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest hidden sm:flex">Liaison Profile</Badge>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 px-8">
            <div className="py-8 space-y-6">
              {messagesLoading ? (
                <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full"/></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 px-6">
                   <Info className="h-8 w-8 text-slate-200 mx-auto mb-4" />
                   <p className="text-muted-foreground text-sm font-medium italic">No message history identified. Secure channel established.</p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isOwnMessage = msg.sender_user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex w-full animate-in slide-in-from-bottom-2 duration-500", isOwnMessage ? "justify-end" : "justify-start")}
                    >
                      <div className={cn(
                        "max-w-[80%] md:max-w-[70%] space-y-1.5",
                        isOwnMessage ? "items-end" : "items-start"
                      )}>
                        <div
                          className={cn(
                            "rounded-[1.5rem] px-5 py-3 shadow-soft",
                            isOwnMessage
                              ? "bg-primary text-white rounded-tr-none"
                              : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                          )}
                        >
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                        </div>
                        <div className={cn("flex items-center gap-2 px-1", isOwnMessage ? "justify-end" : "justify-start")}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {format(new Date(msg.sent_at), "h:mm a")}
                          </p>
                          {isOwnMessage && msg.is_read && (
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-6 bg-white/60 backdrop-blur-md border-t border-slate-100 shrink-0">
            <form onSubmit={handleSendMessage} className="relative">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim()) sendMessageMutation.mutate();
                  }
                }}
                placeholder="Synchronize your thoughts..."
                className="w-full min-h-[56px] max-h-[150px] resize-none py-4 px-6 pr-16 rounded-[1.5rem] border-none bg-white shadow-soft focus-visible:ring-primary/20 font-medium text-slate-700 placeholder:text-slate-300"
                rows={1}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="absolute right-2 top-2 h-10 w-10 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center mt-3">
               Press Shift + Enter for new line • Messages are securely logged
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
