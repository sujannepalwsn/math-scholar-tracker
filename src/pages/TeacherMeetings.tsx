"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Eye, FileText, Users, XCircle } from "lucide-react";

import React, { useState } from "react";

type Meeting = Tables<'meetings'>;
type MeetingAttendee = Tables<'meeting_attendees'>;
type MeetingConclusion = Tables<'meeting_conclusions'>;

export default function TeacherMeetings() {
  const { user } = useAuth();
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);
  const [selectedMeetingConclusion, setSelectedMeetingConclusion] = useState<MeetingConclusion | null>(null);

  if (!user?.teacher_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a teacher to view meetings.</div>;
  }

  // Fetch meetings relevant to the logged-in teacher - check both user_id and teacher_id
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["teacher-meetings", user.teacher_id, user.id],
    queryFn: async () => {
      // Try fetching by teacher_id first (more reliable)
      let { data, error } = await supabase
        .from("meeting_attendees")
        .select(`
          *,
          meetings(
            id, title, description, meeting_date, meeting_type, status,
            meeting_conclusions(conclusion_notes, recorded_at)
          )
        `)
        .eq("teacher_id", user.teacher_id!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // If no results by teacher_id, try by user_id as fallback
      if (!data || data.length === 0) {
        const result = await supabase
          .from("meeting_attendees")
          .select(`
            *,
            meetings(
              id, title, description, meeting_date, meeting_type, status,
              meeting_conclusions(conclusion_notes, recorded_at)
            )
          `)
          .eq("user_id", user.id!)
          .order("created_at", { ascending: false });
        
        if (result.error) throw result.error;
        data = result.data;
      }
      
      return data || [];
    },
    enabled: !!user.teacher_id || !!user.id,
  });

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAttendanceStatusColor = (attended: boolean | null) => {
    if (attended === true) return 'text-green-600';
    if (attended === false) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleViewConclusion = (conclusion: MeetingConclusion) => {
    setSelectedMeetingConclusion(conclusion);
    setShowConclusionDialog(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Staff Consultations</h1>
          <p className="text-muted-foreground text-lg">Keep track of faculty meetings and collaborative sessions.</p>
        </div>
      </div>

      <Card className="border-none shadow-medium overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Personalized Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No meetings scheduled for you.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Your Attendance</TableHead>
                    <TableHead>Conclusion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((attendee: any) => {
                    const meeting = attendee.meetings;
                    const conclusion = meeting.meeting_conclusions?.[0];
                    return (
                      <TableRow key={attendee.id}>
                        <TableCell className="font-medium">{meeting.title}</TableCell>
                        <TableCell>{format(new Date(meeting.meeting_date), "PPP")}</TableCell>
                        <TableCell>{format(new Date(meeting.meeting_date), "p")}</TableCell>
                        <TableCell>{meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1)}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getStatusColor(meeting.status)}`}>
                            {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getAttendanceStatusColor(attendee.attendance_status)}`}>
                            {attendee.attendance_status.charAt(0).toUpperCase() + attendee.attendance_status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {conclusion ? (
                            <Button variant="ghost" size="sm" onClick={() => handleViewConclusion(conclusion)}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conclusion View Dialog */}
      <Dialog open={showConclusionDialog} onOpenChange={setShowConclusionDialog}>
        <DialogContent className="max-w-2xl" aria-labelledby="conclusion-view-title" aria-describedby="conclusion-view-description">
          <DialogHeader>
            <DialogTitle id="conclusion-view-title">Meeting Conclusion</DialogTitle>
            <DialogDescription id="conclusion-view-description">
              Summary and notes from the meeting.
            </DialogDescription>
          </DialogHeader>
          {selectedMeetingConclusion && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Recorded on: {format(new Date(selectedMeetingConclusion.recorded_at!), "PPP 'at' HH:mm")}</p>
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="whitespace-pre-wrap">{selectedMeetingConclusion.conclusion_notes}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}