import React, { useState } from "react";
import { MessageSquarePlus, Send, ClipboardList } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function SuggestionForm({ role }: { role: "teacher" | "parent" }) {
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const [title, setTitle] = useState("");
 const [message, setMessage] = useState("");

 const submitMutation = useMutation({
  mutationFn: async () => {
   if (!user) throw new Error("Not authenticated");
   const { error } = await supabase.from("suggestions").insert({
    center_id: user.center_id,
    user_id: user.id,
    role_type: role,
    title,
    message,
    status: 'pending'
   } as any);
   if (error) throw error;
  },
  onSuccess: () => {
   setTitle("");
   setMessage("");
   toast.success("Suggestion submitted successfully! Thank you for your feedback.");
   queryClient.invalidateQueries({ queryKey: ["my-suggestions", user?.id] });
  },
  onError: (error: any) => toast.error(error.message),
 });

 return (
  <Card className="border border-border shadow-sm rounded-2xl bg-white border border-border/20 overflow-hidden">
   <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
    <CardTitle className="text-xl font-black flex items-center gap-3">
     <div className="p-2 rounded-xl bg-primary/10">
      <MessageSquarePlus className="h-6 w-6 text-primary" />
     </div>
     Submit Suggestion
    </CardTitle>
    <CardDescription>Share your thoughts and help us improve our school.</CardDescription>
   </CardHeader>
   <CardContent className="p-6 space-y-4">
    <div className="space-y-2">
     <Label htmlFor="sug-title">Title</Label>
     <Input id="sug-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short, descriptive title" />
    </div>
    <div className="space-y-2">
     <Label htmlFor="sug-message">Your Message</Label>
     <Textarea id="sug-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your suggestion in detail..." className="min-h-[120px]" />
    </div>
    <Button onClick={() => submitMutation.mutate()} disabled={!title || !message || submitMutation.isPending} className="w-full rounded-2xl h-12 font-bold gap-2">
     {submitMutation.isPending ? "SUBMITTING..." : <><Send className="h-4 w-4" /> SUBMIT SUGGESTION</>}
    </Button>
   </CardContent>
  </Card>
 );
}
