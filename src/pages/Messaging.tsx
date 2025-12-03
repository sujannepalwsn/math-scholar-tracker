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
import { Send, MessageSquare, Users, Radio, MessageCircleMore } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Messaging() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [broadcastMessageText, setBroadcastMessageText] = useState("");
  const [broadcastTargetAudience, setBroadcastTargetAudience] = useState("all_parents");
  const [broadcastTargetGrade, setBroadcastTargetGrade] = useState("all");

  // Fetch all conversations for center users
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["chat-conversations", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          students:student_id(id, name, grade),
          parent_user:parent_user_id(id, username)
        `)
        .eq("center_id", user.center_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && user?.role === "center",
  });

  // Fetch conversations for parent users
  const { data: parentConversations = [] } = useQuery({
    queryKey: ["parent-chat-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          students:student_id(id, name, grade),
          centers:center_id(id, name)
        `)
        .eq("parent_user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && user?.role === "parent",
  });

  const activeConversations = user?.role === "parent" ? parentConversations : conversations;

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          sender:sender_user_id(id, username, role)
        `)
        .eq("conversation_id", selectedConversation.id)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation?.id,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation?.id || !user?.id) return;
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
  }, [messages, selectedConversation?.id, user?.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.id || !user?.id || !newMessage.trim()) {
        throw new Error("Missing required data");
      }
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation.id,
        sender_user_id: user.id,
        message_text: newMessage.trim(),
      });
      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  // Create new conversation (for centers)
  const { data: studentsWithParents = [] } = useQuery({
    queryKey: ["students-with-parents", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      // Get students that have parent accounts
      const { data: parentUsers, error: usersError } = await supabase
        .from("users")
        .select("id, username, student_id")
        .eq("role", "parent")
        .not("student_id", "is", null);
      if (usersError) throw usersError;

      const studentIds = parentUsers?.map(u => u.student_id).filter(Boolean) || [];
      if (studentIds.length === 0) return [];

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .in("id", studentIds);
      if (studentsError) throw studentsError;

      return students?.map(s => ({
        ...s,
        parentUser: parentUsers?.find(u => u.student_id === s.id),
      })) || [];
    },
    enabled: !!user?.center_id && user?.role === "center",
  });

  const createConversationMutation = useMutation({
    mutationFn: async (studentData: any) => {
      if (!user?.center_id) throw new Error("Center ID not found");
      
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("center_id", user.center_id)
        .eq("student_id", studentData.id)
        .eq("parent_user_id", studentData.parentUser.id)
        .maybeSingle();

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          center_id: user.center_id,
          student_id: studentData.id,
          parent_user_id: studentData.parentUser.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setSelectedConversation(data);
      toast.success("Conversation started!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create conversation");
    },
  });

  // Send Broadcast Message Mutation
  const sendBroadcastMessageMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.center_id || !broadcastMessageText.trim()) {
        throw new Error("Message and sender information are required.");
      }

      const { data, error } = await supabase.functions.invoke('send-broadcast-message', {
        body: {
          senderUserId: user.id,
          centerId: user.center_id,
          messageText: broadcastMessageText.trim(),
          targetAudience: broadcastTargetAudience,
          targetGrade: broadcastTargetGrade === 'all' ? null : broadcastTargetGrade,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send broadcast message via Edge Function');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Broadcast message sent successfully!");
      setBroadcastMessageText("");
      setBroadcastTargetAudience("all_parents");
      setBroadcastTargetGrade("all");
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }); // Refresh conversations list
    },
    onError: (error: any) => {
      console.error("Broadcast message error:", error);
      toast.error(error.message || "Failed to send broadcast message");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate();
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (broadcastMessageText.trim()) {
      sendBroadcastMessageMutation.mutate();
    }
  };

  const uniqueGrades = Array.from(new Set(studentsWithParents.map(s => s.grade))).sort();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Messages</h1>

      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Direct Messages</TabsTrigger>
          {user?.role === 'center' && (
            <TabsTrigger value="broadcast" className="flex items-center gap-2"><Radio className="h-4 w-4" /> Broadcast Messages</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="direct">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
            {/* Conversations List */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[500px]">
                  {user?.role === "center" && studentsWithParents.length > 0 && (
                    <div className="mb-4 p-2 border-b">
                      <p className="text-sm text-muted-foreground mb-2">Start new conversation:</p>
                      {studentsWithParents
                        .filter(s => !activeConversations.some((c: any) => c.student_id === s.id))
                        .slice(0, 5)
                        .map((student: any) => (
                          <Button
                            key={student.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start mb-1"
                            onClick={() => createConversationMutation.mutate(student)}
                          >
                            + {student.name} ({student.grade})
                          </Button>
                        ))}
                    </div>
                  )}

                  {conversationsLoading ? (
                    <p className="text-center text-muted-foreground p-4">Loading...</p>
                  ) : activeConversations.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4">No conversations yet</p>
                  ) : (
                    activeConversations.map((conv: any) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                          selectedConversation?.id === conv.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <p className="font-medium">
                          {user?.role === "parent" 
                            ? conv.centers?.name || "Center"
                            : conv.students?.name || "Student"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user?.role === "parent"
                            ? `Student: ${conv.students?.name}`
                            : `Parent: ${conv.parent_user?.username}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Grade: {conv.students?.grade}
                        </p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages Area */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {selectedConversation
                    ? user?.role === "parent"
                      ? selectedConversation.centers?.name
                      : selectedConversation.students?.name
                    : "Select a conversation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[520px]">
                {!selectedConversation ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a conversation to start messaging
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <p className="text-center text-muted-foreground">Loading messages...</p>
                      ) : messages.length === 0 ? (
                        <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {user?.role === 'center' && (
          <TabsContent value="broadcast">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleMore className="h-5 w-5" /> Send Broadcast Message
                </CardTitle>
                <p className="text-sm text-muted-foreground">Send a message to multiple recipients at once.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="broadcastMessage">Message *</Label>
                    <Textarea
                      id="broadcastMessage"
                      value={broadcastMessageText}
                      onChange={(e) => setBroadcastMessageText(e.target.value)}
                      rows={5}
                      placeholder="Type your broadcast message here..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience *</Label>
                    <Select value={broadcastTargetAudience} onValueChange={setBroadcastTargetAudience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_parents">All Parents</SelectItem>
                        <SelectItem value="all_teachers">All Teachers</SelectItem>
                        {/* Add grade-specific options if needed */}
                        {uniqueGrades.map(grade => (
                          <SelectItem key={`grade_${grade}`} value={`grade_${grade}`}>Parents of Grade {grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {broadcastTargetAudience.startsWith('grade_') && (
                    <div className="space-y-2">
                      <Label htmlFor="targetGrade">Select Grade *</Label>
                      <Select value={broadcastTargetGrade} onValueChange={setBroadcastTargetGrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueGrades.map(grade => (
                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={!broadcastMessageText.trim() || sendBroadcastMessageMutation.isPending}>
                    {sendBroadcastMessageMutation.isPending ? 'Sending Broadcast...' : 'Send Broadcast'}
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