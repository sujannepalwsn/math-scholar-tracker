"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface MeetingConclusionFormProps {
  meetingId: string;
  onSave: () => void;
  onClose: () => void;
}

export default function MeetingConclusionForm({ meetingId, onSave, onClose }: MeetingConclusionFormProps) {
  const queryClient = useQueryClient();
  const [conclusionNotes, setConclusionNotes] = useState("");

  const updateMeetingMutation = useMutation({
    mutationFn: async () => {
      // Update the meeting description with conclusion notes
      const { error } = await supabase
        .from("meetings")
        .update({ 
          description: conclusionNotes,
          status: 'completed'
        })
        .eq("id", meetingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting conclusion saved successfully!");
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save conclusion");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conclusionNotes.trim()) {
      toast.error("Conclusion notes cannot be empty.");
      return;
    }
    updateMeetingMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="conclusionNotes">Meeting Conclusion Notes *</Label>
        <Textarea
          id="conclusionNotes"
          value={conclusionNotes}
          onChange={(e) => setConclusionNotes(e.target.value)}
          rows={8}
          placeholder="Summarize key discussions, decisions, and action items."
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={updateMeetingMutation.isPending}>Cancel</Button>
        <Button type="submit" disabled={!conclusionNotes.trim() || updateMeetingMutation.isPending}>
          {updateMeetingMutation.isPending ? "Saving..." : "Save Conclusion"}
        </Button>
      </div>
    </form>
  );
}