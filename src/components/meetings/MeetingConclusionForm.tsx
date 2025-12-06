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
      // First, check if a conclusion already exists for this meeting
      const { data: existingConclusion, error: fetchError } = await supabase
        .from("meeting_conclusions")
        .select("id")
        .eq("meeting_id", meetingId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 means no rows found, which is expected for new conclusions
        throw fetchError;
      }

      if (existingConclusion) {
        // Update existing conclusion
        const { error } = await supabase
          .from("meeting_conclusions")
          .update({
            conclusion_notes: conclusionNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConclusion.id);
        if (error) throw error;
      } else {
        // Insert new conclusion
        const { error } = await supabase
          .from("meeting_conclusions")
          .insert({
            meeting_id: meetingId,
            conclusion_notes: conclusionNotes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-conclusions"] });
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
