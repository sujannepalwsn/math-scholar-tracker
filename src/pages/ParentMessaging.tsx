"use client";
import React, { useEffect, useRef, useState } from "react";
import { Check, Info, MessageSquare, Send, Shield } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import { ArrowLeft, Check, Info, MessageSquare, Radio, Search, Send, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ParentMessaging() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations for parent
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["parent-chat-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`*, students:student_id(id, name, grade), centers:center_id(id, name)`)
        .eq("parent_user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id });

  // Fetch unread counts per conversation
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["unread-counts", user?.id, conversations.map((c: any) => c.id).join(",")],
    queryFn: async () => {
      if (!user?.id || conversations.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const conv of conversations) {
        const { count, error } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_user_id", user.id);
        if (!error) counts[conv.id] = count || 0;
      }
      return counts;
    },
    enabled: !!user?.id && conversations.length > 0,
    refetchInterval: 10000,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["parent-chat-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`*, sender:sender_user_id(id, username, role)`)
        .eq("conversation_id", selectedConversation.id)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation?.id,
    refetchInterval: 3000 });

  // Real-time subscription
  useEffect(() => {
    if (!selectedConversation?.id) return;
    const channel = supabase
      .channel(`chat-${selectedConversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selectedConversation.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["parent-chat-messages", selectedConversation.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation?.id || !user?.id) return;
      const unread = messages.filter((m: any) => !m.is_read && m.sender_user_id !== user.id);
      if (unread.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in("id", unread.map((m: any) => m.id));
        queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
      }
    };
    markAsRead();
  }, [messages, selectedConversation?.id, user?.id]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.id || !user?.id || !newMessage.trim()) {
        throw new Error("Missing required data");
      }
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation.id,
        sender_user_id: user.id,
        message_text: newMessage.trim() });
      if (error) throw error;

      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["parent-chat-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["parent-chat-conversations"] });
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

  const filteredConversations = conversations.filter((conv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.students?.name?.toLowerCase().includes(q) ||
      conv.centers?.name?.toLowerCase().includes(q)
    );
  });

  const getConversationName = (conv: any) => conv.centers?.name || "Institution Control";
  const getConversationSub = (conv: any) => `Student: ${conv.students?.name}`;

  const showChatView = isMobile && selectedConversation;

  const ConversationList = () => (
    <div className="flex flex-col h-full bg-white/30 backdrop-blur-md">
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-white/50 border-white/20 shadow-soft focus:ring-primary/20"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {conversationsLoading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full"/></div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-6">
             <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-3" />
             <p className="text-muted-foreground text-xs font-medium italic">No conversation sequence identified.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/50">
            {filteredConversations.map((conv: any) => {
              const unread = unreadCounts[conv.id] || 0;
              const isActive = selectedConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-white/40 transition-all flex items-center gap-4 relative group",
                    isActive && "bg-white/60 shadow-soft"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-600/10 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-sm font-black text-primary">{getConversationName(conv)?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn("text-sm font-black text-slate-700 truncate", unread > 0 && "text-slate-900")}>{getConversationName(conv)}</p>
                      {conv.updated_at && <span className="text-[10px] font-bold text-slate-400 shrink-0">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-slate-400 truncate tracking-tight">{getConversationSub(conv)}</p>
                      {unread > 0 && <Badge className="h-5 min-w-5 rounded-full bg-primary text-white border-none flex items-center justify-center text-[10px] font-black shrink-0 px-1 shadow-lg shadow-primary/20">{unread}</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-md">
      {/* Chat header */}
      <div className="p-5 border-b border-slate-100 bg-white/60 flex items-center gap-4 shrink-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl bg-white shadow-soft" onClick={() => setSelectedConversation(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {selectedConversation ? (
          <>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
               <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-800 tracking-tight">{getConversationName(selectedConversation)}</p>
              <div className="flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                    Active Session • {selectedConversation.students?.name}
                 </p>
              </div>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest hidden sm:flex">Liaison Profile</Badge>
          </>
        ) : (
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-slate-400" />
             </div>
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Secure Terminal Standby</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        {!selectedConversation ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 py-20 animate-in fade-in zoom-in-95 duration-700">
            <div className="p-6 rounded-[2rem] bg-white/50 border border-white shadow-strong">
               <MessageSquare className="h-12 w-12 text-primary/20" />
            </div>
            <div className="text-center space-y-1">
               <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Select a channel</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Initialize communication with institutional control</p>
            </div>
          </div>
        ) : messagesLoading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full"/></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 px-6">
             <Info className="h-8 w-8 text-slate-200 mx-auto mb-4" />
             <p className="text-muted-foreground text-sm font-medium italic">No message history identified. Secure channel established.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg: any) => {
              const isOwn = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex w-full animate-in slide-in-from-bottom-2 duration-500", isOwn ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] md:max-w-[75%] space-y-1.5", isOwn ? "items-end" : "items-start")}>
                    <div className={cn(
                      "rounded-[1.5rem] px-5 py-3 shadow-soft",
                      isOwn ? "bg-primary text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                    </div>
                    <div className={cn("flex items-center gap-2 px-1", isOwn ? "justify-end" : "justify-start")}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {format(new Date(msg.sent_at), "h:mm a")}
                      </p>
                      {isOwn && msg.is_read && <Check className="h-2.5 w-2.5 text-emerald-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      {selectedConversation && (
        <div className="p-6 bg-white/60 backdrop-blur-md border-t border-slate-100 shrink-0">
          <form onSubmit={handleSendMessage} className="relative">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (newMessage.trim()) sendMessageMutation.mutate(); } }}
              placeholder="Synchronize your thoughts..."
              className="w-full min-h-[56px] max-h-[150px] resize-none py-4 px-6 pr-16 rounded-[1.5rem] border-none bg-white shadow-soft focus-visible:ring-primary/20 font-medium text-slate-700 placeholder:text-slate-300"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
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
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Communicate with institutional leadership</p>
      </div>

      <Tabs defaultValue="direct" className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-1 h-10 mb-4">
          <TabsTrigger value="direct" className="text-xs font-semibold gap-1.5">
            <MessageSquare className="h-4 w-4" /> Direct Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="flex-1 min-h-0 mt-0">
          <Card className="h-full border shadow-soft overflow-hidden rounded-xl bg-white/40 backdrop-blur-md border-white/20">
            <div className="flex flex-col h-full">
              {isMobile ? (
                showChatView ? <ChatView /> : <ConversationList />
              ) : (
                <div className="grid grid-cols-12 h-full">
                  <div className="col-span-4 border-r border-slate-100 h-full overflow-hidden">
                    <ConversationList />
                  </div>
                  <div className="col-span-8 h-full overflow-hidden">
                    <ChatView />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
