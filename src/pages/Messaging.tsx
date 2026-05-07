"use client";
import React, { useEffect, useRef, useState } from "react";
import { UserRole } from "@/types/roles";
import { ArrowLeft, Megaphone, MessageCircleMore, MessageSquare, Radio, Search, Send, Users } from "lucide-react";
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
import NoticeBoard from "@/components/center/NoticeBoard";
import { hasActionPermission, hasPermission } from "@/utils/permissions";
import { useNavigate } from "react-router-dom";

export default function Messaging() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Strict permission guard
  useEffect(() => {
    if (user && !hasPermission(user, 'messaging', '/messages')) {
      navigate(user.role === UserRole.TEACHER ? '/teacher-dashboard' : '/dashboard');
    }
  }, [user, navigate]);

  if (user && !hasPermission(user, 'messaging', '/messages')) {
    return null;
  }

  const canEdit = hasActionPermission(user, 'messaging', 'edit');
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [broadcastTitle, setBroadcastTitle] = useState("");
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
        .select(`*, students:students!student_id(id, name, grade), parent_user:users!parent_user_id(id, username)`)
        .eq("center_id", user.center_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && (user?.role === UserRole.CENTER || user?.role === UserRole.TEACHER),
  });

  const { data: parentConversations = [] } = useQuery({
    queryKey: ["parent-chat-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`*, students:students!student_id(id, name, grade), centers:centers!center_id(id, name)`)
        .eq("parent_user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && user?.role === UserRole.PARENT,
  });

  const activeConversations = user?.role === UserRole.PARENT ? parentConversations : conversations;

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
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`*, sender:users!sender_user_id(id, username, role)`)
        .eq("conversation_id", selectedConversation.id)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.center_id) return;

    // Subscribe to all messages for this center to update unread counts and current conversation
    const channel = supabase
      .channel('center-messages-realtime')
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages"
        },
        (payload) => {
          // Invalidate counts for any message change
          queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
          queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["parent-chat-conversations"] });

          // If the message belongs to the selected conversation, invalidate messages
          if (selectedConversation?.id && (payload.new as any).conversation_id === selectedConversation.id) {
            queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversation.id] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id, user?.center_id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation?.id || !user?.id) return;
      const unread = messages.filter((m: any) => !m.is_read && m.sender_user_id !== user.id);
      if (unread.length > 0) {
        const { error } = await supabase
          .from("chat_messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in("id", unread.map((m: any) => m.id));
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
        }
      }
    };
    markAsRead();
  }, [messages, selectedConversation?.id, user?.id]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.id || !user?.id || !newMessage.trim()) throw new Error("Missing data");
      if (!canEdit && user.role !== UserRole.PARENT) throw new Error("Access Denied: You do not have permission to send messages.");
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation.id,
        sender_user_id: user.id,
        message_text: newMessage.trim(),
      });
      if (error) throw error;
      const { error: convUpdateError } = await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConversation.id);
      if (convUpdateError) throw convUpdateError;

      // Notify recipient
      const recipientId = user.role === UserRole.PARENT ? null : selectedConversation.parent_user_id;
      const title = user.role === UserRole.PARENT ? `New message from parent` : `New message from center`;
      const link = user.role === UserRole.PARENT ? '/messages' : '/parent-messages';

      const { error: notifError } = await supabase.from('notifications').insert({
        center_id: user.center_id,
        user_id: recipientId,
        title: title,
        message: newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? '...' : ''),
        type: 'info',
        link: link
      });
      if (notifError) throw notifError;

      // Realtime channel broadcast for immediate UI update in other clients
      const channel = supabase.channel(`notifications-${recipientId || user.center_id}`);
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'new-notification',
            payload: { title, message: newMessage.trim() }
          });
        }
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to send message"),
  });

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  // Fetch potential chat partners (Parents and Teachers)
  const { data: availablePartners = [] } = useQuery({
    queryKey: ["available-chat-partners", user?.center_id, isRestricted, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];

      // 1. Fetch Parents
      const { data: parentUsers, error: usersError } = await supabase
        .from("users")
        .select("id, username, student_id")
        .eq("role", "parent")
        .not("student_id", "is", null);

      if (usersError) throw usersError;

      const allParentStudentIds = parentUsers?.map((u) => u.student_id).filter(Boolean) || [];
      let students: any[] = [];

      if (allParentStudentIds.length > 0) {
        let studentQuery = supabase.from("students").select("id, name, grade").eq("center_id", user.center_id).in("id", allParentStudentIds);

        if (isRestricted) {
          const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user?.teacher_id);
          const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user?.teacher_id);
          const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));
          if (myGrades.length > 0) studentQuery = studentQuery.in('grade', myGrades);
          else studentQuery = studentQuery.eq('id', 'none'); // Block if restricted but no assignments
        }

        const { data, error: studentsError } = await studentQuery;
        if (!studentsError) students = data || [];
      }

      const mappedStudents = students.map((s) => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        type: 'student',
        parentUser: parentUsers?.find((u) => u.student_id === s.id)
      }));

      // 2. Fetch Teachers & Center Admin (Liaison)
      let otherStaff: any[] = [];

      const staffQuery = supabase
        .from("users")
        .select("id, username, role")
        .eq("center_id", user.center_id)
        .in("role", ["teacher", "center"])
        .neq("id", user.id);

      const { data: staffUsers, error: staffError } = await staffQuery;

      if (!staffError && staffUsers) {
        otherStaff = staffUsers
          .filter(u => {
            if (u.role === 'center') return true; // Always allow messaging center admin
            return !isRestricted; // Only allow messaging other teachers if not restricted
          })
          .map(u => ({
            id: null,
            name: u.role === 'center' ? 'Center Admin (Liaison)' : u.username,
            grade: u.role === 'center' ? 'Admin' : 'Staff',
            type: u.role === 'center' ? 'admin' : 'teacher',
            parentUser: u
          }));
      }

      return [...mappedStudents, ...otherStaff];
    },
    enabled: !!user?.center_id && (user?.role === UserRole.CENTER || user?.role === UserRole.TEACHER),
  });

  const createConversationMutation = useMutation({
    mutationFn: async (partnerData: any) => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (!canEdit && user.role !== UserRole.PARENT) throw new Error("Access Denied: You do not have permission to start conversations.");

      let query = supabase
        .from("chat_conversations")
        .select("id")
        .eq("center_id", user.center_id)
        .eq("parent_user_id", partnerData.parentUser.id);

      if (partnerData.id) {
        query = query.eq("student_id", partnerData.id);
      } else {
        query = query.is("student_id", null);
      }

      const { data: existing } = await query.maybeSingle();
      if (existing) return existing;

      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          center_id: user.center_id,
          student_id: partnerData.id || null,
          parent_user_id: partnerData.parentUser.id
        })
        .select()
        .single();

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
      if (!canEdit) throw new Error("Access Denied: You do not have permission to send broadcasts.");

      let finalTargetGrade = broadcastTargetGrade;
      let finalTargetAudience = broadcastTargetAudience;

      if (broadcastTargetAudience.startsWith('grade_')) {
        finalTargetGrade = broadcastTargetAudience.replace('grade_', '');
        finalTargetAudience = 'grade_parents';
      }

      const { data, error } = await supabase.functions.invoke("send-broadcast-message", {
        body: {
          title: broadcastTitle.trim() || 'Broadcast Message',
          messageText: broadcastMessageText.trim(),
          targetAudience: finalTargetAudience,
          targetGrade: finalTargetGrade === "all" ? null : finalTargetGrade
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Broadcast sent!");
      setBroadcastTitle("");
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

  const uniqueGrades = Array.from(new Set(availablePartners.filter(p => p.type === 'student').map((s) => s.grade))).sort();
  const filteredConversations = activeConversations.filter((conv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.students?.name?.toLowerCase().includes(q) ||
      conv.parent_user?.username?.toLowerCase().includes(q) ||
      conv.centers?.name?.toLowerCase().includes(q)
    );
  });

  const filteredPartnersForNew = availablePartners.filter(
    (s) => (newConversationGradeFilter === "all" || s.grade === newConversationGradeFilter) && s.name.toLowerCase().includes(newConversationStudentSearch.toLowerCase())
  );

  const getConversationName = (conv: any) => {
    if (user?.role === UserRole.PARENT) return conv.centers?.name || "Center";
    if (conv.students?.name) return conv.students.name;
    if (conv.parent_user?.username) {
        if (conv.parent_user.id === user?.id) return "Center Admin (Liaison)";
        return conv.parent_user.username;
    }
    return "Unknown";
  };
  const getConversationSub = (conv: any) => {
    if (user?.role === UserRole.PARENT) return `Student: ${conv.students?.name}`;
    if (conv.students?.name) return `Parent: ${conv.parent_user?.username || 'N/A'}`;
    return "Staff/Liaison";
  };

  // Mobile: show chat list or chat view
  const showChatView = isMobile && selectedConversation;

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        {(user?.role === UserRole.CENTER || user?.role === UserRole.TEACHER) && canEdit && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowNewConversation(!showNewConversation)}>
            + New Conversation
          </Button>
        )}
      </div>

      {showNewConversation && (user?.role === UserRole.CENTER || user?.role === UserRole.TEACHER) && (
        <div className="p-3 border-b bg-muted/30 space-y-2">
          <Select value={newConversationGradeFilter} onValueChange={setNewConversationGradeFilter}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grade / Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Staff">Staff Only</SelectItem>
              {uniqueGrades.map((g) => (<SelectItem key={g} value={g}>Grade {g}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Search partner..." value={newConversationStudentSearch} onChange={(e) => setNewConversationStudentSearch(e.target.value)} className="h-8 text-xs" />
          {filteredPartnersForNew.filter((s) => !activeConversations.some((c: any) => c.student_id === s.id && c.parent_user_id === s.parentUser.id)).slice(0, 5).map((partner: any) => (
            <Button key={partner.parentUser.id} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => createConversationMutation.mutate(partner)}>
              + {partner.name} ({partner.grade})
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
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <MessageSquare className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Communications Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Direct & Broadcast Messaging Nexus</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="direct" className="w-full space-y-8">
        <TabsList className="flex flex-nowrap w-full overflow-x-auto h-14 bg-white/50 border border-slate-100 p-1 rounded-2xl shadow-soft backdrop-blur-md custom-scrollbar">
          <TabsTrigger value="direct" className="rounded-xl flex-1 min-w-[120px] data-[state=active]:shadow-soft font-black uppercase text-[10px] tracking-widest gap-2">
            <MessageSquare className="h-4 w-4" /> Direct Messages
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="rounded-xl data-[state=active]:shadow-soft font-black uppercase text-[10px] tracking-widest gap-2">
            <Radio className="h-4 w-4" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="notices" className="rounded-xl data-[state=active]:shadow-soft font-black uppercase text-[10px] tracking-widest gap-2">
            <Megaphone className="h-4 w-4" /> Digital Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct">
          <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] h-[calc(100vh-280px)] min-h-[500px] bg-card/40 backdrop-blur-md border border-white/20">
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

          <TabsContent value="broadcast">
            <Card className="border-none shadow-strong rounded-[2.5rem] overflow-hidden bg-card/40 backdrop-blur-md border border-white/20">
              <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
                <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                  <Radio className="h-6 w-6 text-primary" /> Unified Broadcast Portal
                </CardTitle>
                <p className="text-sm text-muted-foreground">Send a message to multiple recipients at once.</p>
              </CardHeader>
              <CardContent className="p-8">
                {canEdit ? (
                  <form onSubmit={(e) => { e.preventDefault(); if (broadcastMessageText.trim()) sendBroadcastMessageMutation.mutate(); }} className="space-y-6 max-w-2xl mx-auto">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Broadcast Title</label>
                      <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Emergency Notice / Holiday Announcement" className="rounded-2xl border-none shadow-soft bg-white/50 backdrop-blur-sm focus:ring-primary/20 h-12 px-6 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Message Payload</label>
                      <Textarea value={broadcastMessageText} onChange={(e) => setBroadcastMessageText(e.target.value)} rows={5} placeholder="Type your broadcast message..." required className="rounded-2xl border-none shadow-soft bg-white/50 backdrop-blur-sm focus:ring-primary/20 p-6 text-sm font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Target Audience</label>
                      <Select value={broadcastTargetAudience} onValueChange={setBroadcastTargetAudience}>
                        <SelectTrigger className="h-12 bg-white/50 border-none shadow-soft rounded-2xl focus:ring-primary/20 font-bold"><SelectValue placeholder="Select audience" /></SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl font-bold">
                          {(user?.role === UserRole.CENTER || (user?.role === UserRole.TEACHER && user?.teacher_scope_mode === 'full')) && (
                            <SelectItem value="all_parents">All Parents</SelectItem>
                          )}
                          <SelectItem value="all_teachers">All Teachers</SelectItem>
                          <SelectItem value="center">Center (Internal Notice)</SelectItem>
                          {(user?.role === UserRole.CENTER || (user?.role === UserRole.TEACHER && user?.teacher_scope_mode === 'full')) && (
                            uniqueGrades.map((g) => (<SelectItem key={`grade_${g}`} value={`grade_${g}`}>Parents of Grade {g}</SelectItem>))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full h-14 text-lg font-black shadow-strong rounded-2xl bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.01] transition-all duration-300" disabled={!broadcastMessageText.trim() || sendBroadcastMessageMutation.isPending}>
                      {sendBroadcastMessageMutation.isPending ? "TRANSMITTING..." : "INITIATE BROADCAST"}
                    </Button>
                  </form>
                ) : (
                  <div className="p-12 text-center text-muted-foreground italic font-medium">
                    You do not have permission to send broadcast messages.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notices">
             <NoticeBoard centerId={user?.center_id || ""} />
          </TabsContent>
      </Tabs>
    </div>
  );
}
