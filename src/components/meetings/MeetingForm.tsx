"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

interface MeetingFormProps {
  meeting?: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function MeetingForm({ meeting, onSave, onCancel }: MeetingFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [title, setTitle] = useState(meeting?.title || "");
  const [description, setDescription] = useState(meeting?.description || "");
  const [meetingDate, setMeetingDate] = useState(meeting?.meeting_date ? format(new Date(meeting.meeting_date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [location, setLocation] = useState(meeting?.location || "");
  const [meetingType, setMeetingType] = useState(meeting?.meeting_type || "general");
  const [status, setStatus] = useState(meeting?.status || "scheduled");

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDescription(meeting.description || "");
      setMeetingDate(meeting.meeting_date ? format(new Date(meeting.meeting_date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setLocation(meeting.location || "");
      setMeetingType(meeting.meeting_type || "general");
      setStatus(meeting.status || "scheduled");
    }
  }, [meeting]);

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || !user?.id) throw new Error("User or Center ID not found");
      const { error } = await supabase.from("meetings").insert({
        center_id: user.center_id,
        created_by: user.id,
        title,
        description: description || null,
        meeting_date: new Date(meetingDate).toISOString(),
        location: location || null,
        meeting_type: meetingType,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting created successfully!");
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create meeting");
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!meeting?.id) throw new Error("Meeting ID not found");
      const { error } = await supabase.from("meetings").update({
        title,
        description: description || null,
        meeting_date: new Date(meetingDate).toISOString(),
        location: location || null,
        meeting_type: meetingType,
        status,
      }).eq("id", meeting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting updated successfully!");
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update meeting");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meeting) {
      updateMeetingMutation.mutate();
    } else {
      createMeetingMutation.mutate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Meeting details" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="meetingDate">Date & Time *</Label>
          <Input id="meetingDate" type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Meeting location" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Meeting Type</Label>
          <Select value={meetingType} onValueChange={setMeetingType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="parents">Parents</SelectItem>
              <SelectItem value="teachers">Teachers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!title || createMeetingMutation.isPending || updateMeetingMutation.isPending}>
          {meeting ? "Update" : "Create"} Meeting
        </Button>
      </div>
    </form>
  );
}