"use client";
import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircleMore, MessageSquare, Radio, Search, Send, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Messaging() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [broadcastTargetAudience, setBroadcastTargetAudience] = useState("all_parents");
  const [broadcastTargetGrade, setBroadcastTargetGrade] = useState("all");
  const [newConversationGradeFilter, setNewConversationGradeFilter] = useState("all");
  const [newConversationStudentSearch, setNewConversationStudentSearch] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["chat-conversations", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`*, students:student_id(id, name, grade), parent_user:parent_user_id(id, username)`)
        .eq("center_id", user.center_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && user?.role === "center",
  });

  const { data: parentConversations = [] } = useQuery({
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
    enabled: !!user?.id && user?.role === "parent",
  });

  const activeConversations = user?.role === "parent" ? parentConversations : conversations;

  // Fetch unread counts per conversation
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["unread-counts", user?.id, activeConversations.map((c: any) => c.id).join(",")],
    queryFn: async () => {
      if (!user?.id || activeConversations.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const conv of activeConversations) {
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
    enabled: !!user?.id && activeConversations.length > 0,
    refetchInterval: 10000,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedConversation?.id],
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
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedConversation?.id) return;
    const channel = supabase
      .channel(`chat-${selectedConversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selectedConversation.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversation.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read
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
      if (!selectedConversation?.id || !user?.id || !newMessage.trim()) throw new Error("Missing data");
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation.id,
        sender_user_id: user.id,
        message_text: newMessage.trim(),
      });
      if (error) throw error;
      await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConversation.id);

      // Notify recipient
      const recipientId = user.role === 'parent' ? null : selectedConversation.parent_user_id;
      const title = user.role === 'parent' ? `New message from parent` : `New message from center`;
      const link = user.role === 'parent' ? '/messages' : '/parent-messages';

      await supabase.from('notifications').insert({
        center_id: user.center_id,
        user_id: recipientId,
        title: title,
        message: newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? '...' : ''),
        type: 'info',
        link: link
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to send message"),
  });

  // Students with parents
  const { data: studentsWithParents = [] } = useQuery({
    queryKey: ["students-with-parents", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data: parentUsers, error: usersError } = await supabase.from("users").select("id, username, student_id").eq("role", "parent").not("student_id", "is", null);
      if (usersError) throw usersError;
      const studentIds = parentUsers?.map((u) => u.student_id).filter(Boolean) || [];
      if (studentIds.length === 0) return [];
      const { data: students, error: studentsError } = await supabase.from("students").select("id, name, grade").eq("center_id", user.center_id).in("id", studentIds);
      if (studentsError) throw studentsError;
      return students?.map((s) => ({ ...s, parentUser: parentUsers?.find((u) => u.student_id === s.id) })) || [];
    },
    enabled: !!user?.center_id && user?.role === "center",
  });

  const createConversationMutation = useMutation({
    mutationFn: async (studentData: any) => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { data: existing } = await supabase.from("chat_conversations").select("id").eq("center_id", user.center_id).eq("student_id", studentData.id).eq("parent_user_id", studentData.parentUser.id).maybeSingle();
      if (existing) return existing;
      const { data, error } = await supabase.from("chat_conversations").insert({ center_id: user.center_id, student_id: studentData.id, parent_user_id: studentData.parentUser.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setSelectedConversation(data);
      setShowNewConversation(false);
      toast.success("Conversation started!");
    },
    onError: (error: any) => toast.error(error.message || "Failed to create conversation"),
  });

  // Broadcast
  const sendBroadcastMessageMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.center_id || !broadcastMessageText.trim()) throw new Error("Required fields missing");
      const { data, error } = await supabase.functions.invoke("send-broadcast-message", {
        body: { senderUserId: user.id, centerId: user.center_id, messageText: broadcastMessageText.trim(), targetAudience: broadcastTargetAudience, targetGrade: broadcastTargetGrade === "all" ? null : broadcastTargetGrade },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Broadcast sent!");
      setBroadcastMessageText("");
      setBroadcastTargetAudience("all_parents");
      setBroadcastTargetGrade("all");
    },
    onError: (error: any) => toast.error(error.message || "Failed to send broadcast"),
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) sendMessageMutation.mutate();
  };

  const uniqueGrades = Array.from(new Set(studentsWithParents.map((s) => s.grade))).sort();
  const filteredConversations = activeConversations.filter((conv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.students?.name?.toLowerCase().includes(q) ||
      conv.parent_user?.username?.toLowerCase().includes(q) ||
      conv.centers?.name?.toLowerCase().includes(q)
    );
  });

  const filteredStudentsForNew = studentsWithParents.filter(
    (s) => (newConversationGradeFilter === "all" || s.grade === newConversationGradeFilter) && s.name.toLowerCase().includes(newConversationStudentSearch.toLowerCase())
  );

  const getConversationName = (conv: any) => (user?.role === "parent" ? conv.centers?.name || "Center" : conv.students?.name || "Student");
  const getConversationSub = (conv: any) => (user?.role === "parent" ? `Student: ${conv.students?.name}` : `Parent: ${conv.parent_user?.username}`);

  // Mobile: show chat list or chat view
  const showChatView = isMobile && selectedConversation;

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        {user?.role === "center" && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowNewConversation(!showNewConversation)}>
            + New Conversation
          </Button>
        )}
      </div>

      {showNewConversation && user?.role === "center" && (
        <div className="p-3 border-b bg-muted/30 space-y-2">
          <Select value={newConversationGradeFilter} onValueChange={setNewConversationGradeFilter}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Search student..." value={newConversationStudentSearch} onChange={(e) => setNewConversationStudentSearch(e.target.value)} className="h-8 text-xs" />
          {filteredStudentsForNew.filter((s) => !activeConversations.some((c: any) => c.student_id === s.id)).slice(0, 5).map((student: any) => (
            <Button key={student.id} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => createConversationMutation.mutate(student)}>
              + {student.name} ({student.grade})
            </Button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        {conversationsLoading ? (
          <p className="text-center text-muted-foreground p-4 text-sm">Loading...</p>
        ) : filteredConversations.length === 0 ? (
          <p className="text-center text-muted-foreground p-8 text-sm">No conversations yet</p>
        ) : (
          filteredConversations.map((conv: any) => {
            const unread = unreadCounts[conv.id] || 0;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "w-full text-left p-3 border-b hover:bg-muted/50 transition-colors flex items-center gap-3",
                  selectedConversation?.id === conv.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{getConversationName(conv)?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-sm font-medium truncate", unread > 0 && "font-bold")}>{getConversationName(conv)}</p>
                    {conv.updated_at && <span className="text-[10px] text-muted-foreground shrink-0">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">{getConversationSub(conv)}</p>
                    {unread > 0 && <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] shrink-0">{unread}</Badge>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="p-4 border-b bg-card flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setSelectedConversation(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {selectedConversation ? (
          <>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{getConversationName(selectedConversation)?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-sm">{getConversationName(selectedConversation)}</p>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-success" />
                <p className="text-xs text-muted-foreground">Grade {selectedConversation.students?.grade}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a conversation</p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {!selectedConversation ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 py-20">
            <MessageSquare className="h-12 w-12 opacity-30" />
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        ) : messagesLoading ? (
          <p className="text-center text-muted-foreground text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No messages yet. Start the conversation!</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg: any) => {
              const isOwn = msg.sender_user_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-2xl p-3 shadow-soft", isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                    <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                    <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "")}>
                      <p className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {format(new Date(msg.sent_at), "h:mm a")}
                      </p>
                      {isOwn && msg.is_read && <span className="text-[10px] text-primary-foreground/60">✓✓</span>}
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
        <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2 items-end bg-card">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (newMessage.trim()) sendMessageMutation.mutate(); } }}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessageMutation.isPending} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Communicate with parents and teachers</p>
      </div>

      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="direct" className="text-xs font-semibold gap-1.5">
            <MessageSquare className="h-4 w-4" /> Direct Messages
          </TabsTrigger>
          {user?.role === "center" && (
            <TabsTrigger value="broadcast" className="text-xs font-semibold gap-1.5">
              <Radio className="h-4 w-4" /> Broadcast
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="direct">
          <Card className="border shadow-soft overflow-hidden rounded-xl h-[calc(100vh-280px)] min-h-[500px]">
            {isMobile ? (
              showChatView ? <ChatView /> : <ConversationList />
            ) : (
              <div className="grid grid-cols-3 h-full">
                <div className="col-span-1 border-r h-full overflow-hidden">
                  <ConversationList />
                </div>
                <div className="col-span-2 h-full overflow-hidden">
                  <ChatView />
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {user?.role === "center" && (
          <TabsContent value="broadcast">
            <Card className="border shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircleMore className="h-5 w-5" /> Send Broadcast Message
                </CardTitle>
                <p className="text-sm text-muted-foreground">Send a message to multiple recipients at once.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); if (broadcastMessageText.trim()) sendBroadcastMessageMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea value={broadcastMessageText} onChange={(e) => setBroadcastMessageText(e.target.value)} rows={5} placeholder="Type your broadcast message..." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience *</Label>
                    <Select value={broadcastTargetAudience} onValueChange={setBroadcastTargetAudience}>
                      <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_parents">All Parents</SelectItem>
                        <SelectItem value="all_teachers">All Teachers</SelectItem>
                        {uniqueGrades.map((g) => (<SelectItem key={`grade_${g}`} value={`grade_${g}`}>Parents of Grade {g}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={!broadcastMessageText.trim() || sendBroadcastMessageMutation.isPending}>
                    {sendBroadcastMessageMutation.isPending ? "Sending..." : "Send Broadcast"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
