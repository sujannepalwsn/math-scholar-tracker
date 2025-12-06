"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarDays, Users, FileText, CheckCircle2, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";

type Meeting = Tables<'meetings'>;
type MeetingAttendee = Tables<'meeting_attendees'>;
type MeetingConclusion = Tables<'meeting_conclusions'>;

export default function ParentMeetings() {
  const { user } = useAuth();
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);
  const [selectedMeetingConclusion, setSelectedMeetingConclusion] = useState<MeetingConclusion | null>(null);

  if (!user?.student_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a parent to view meetings.</div>;
  }

  // Fetch meetings relevant to the parent's student
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["parent-meetings", user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendees")
        .select(`
          *,
          meetings(
            id, title, agenda, meeting_date, meeting_type, status,
            meeting_conclusions(conclusion_notes, recorded_at)
          )
        `)
        .eq("student_id", user.student_id!);

      if (error) throw error;
      return data?.filter((d: any) => d.meetings) || [];
    },
    enabled: !!user.student_id,
  });

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Updated to use attendance_status directly
  const getAttendanceStatusColor = (status: MeetingAttendee['attendance_status']) => {
    switch (status) {
      case 'present': return 'text-green-600';
      case 'absent': return 'text-red-600';
      case 'excused': return 'text-yellow-600';
      case 'invite': return 'text-blue-600'; // New color for invite
      case 'pending': return 'text-gray-660'; // Color for pending
      default: return 'text-gray-600';
    }
  };

  const handleViewConclusion = (conclusion: MeetingConclusion) => {
    setSelectedMeetingConclusion(conclusion);
    setShowConclusionDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Meetings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Scheduled Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No meetings scheduled for your child.</p>
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
                            {attendee.attendance_status ? attendee.attendance_status.charAt(0).toUpperCase() + attendee.attendance_status.slice(1) : 'Pending'}
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