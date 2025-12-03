"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CalendarDays, Users, FileText, CheckCircle2, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import MeetingForm from "@/components/meetings/MeetingForm";
import MeetingAttendanceRecorder from "@/components/meetings/MeetingAttendanceRecorder";
import MeetingConclusionForm from "@/components/meetings/MeetingConclusionForm";
import MeetingConclusionViewer from "@/components/meetings/MeetingConclusionViewer";
import MeetingAttendeesViewer from "@/components/meetings/MeetingAttendeesViewer";

type Meeting = Tables<'meetings'>;
type MeetingConclusion = Tables<'meeting_conclusions'>;

export default function MeetingManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showMeetingFormDialog, setShowMeetingFormDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<Meeting | null>(null);
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);
  const [selectedMeetingForConclusion, setSelectedMeetingForConclusion] = useState<Meeting & { meeting_conclusions: MeetingConclusion[] } | null>(null);

  // Fetch meetings for the current center
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("meetings")
        .select("*, meeting_conclusions(conclusion_notes, recorded_at), meeting_attendees(student_id, user_id, teacher_id)") // Fetch attendees too
        .eq("center_id", user.center_id)
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, delete associated meeting_attendees records
      const { error: attendeesError } = await supabase
        .from("meeting_attendees")
        .delete()
        .eq("meeting_id", id);
      if (attendeesError) throw attendeesError;

      // Next, delete associated meeting_conclusions records
      const { error: conclusionsError } = await supabase
        .from("meeting_conclusions")
        .delete()
        .eq("meeting_id", id);
      if (conclusionsError) throw conclusionsError;

      // Finally, delete the meeting itself
      const { error: meetingError } = await supabase.from("meetings").delete().eq("id", id);
      if (meetingError) throw meetingError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete meeting");
    },
  });

  const handleMeetingSave = async (meetingData: Tables<'meetings'>, selectedStudentIds: string[], selectedTeacherIds: string[]) => {
    // This function is called by MeetingForm after meeting is created/updated
    // meetingData is the newly created or updated meeting object from the DB.

    // First, clear all existing attendees for this meeting to ensure a clean slate
    // This simplifies logic by not having to figure out which ones to remove vs update
    await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingData.id);

    const attendeesToInsert: Tables<'meeting_attendees'>['Insert'][] = [];

    if (meetingData.meeting_type === 'parents' && selectedStudentIds.length > 0) {
      // Fetch parent user IDs for the selected students
      const { data: parentUsers, error: parentUserError } = await supabase
        .from('users')
        .select('id, student_id')
        .in('student_id', selectedStudentIds)
        .eq('role', 'parent');

      if (parentUserError) {
        console.error("Error fetching parent users:", parentUserError);
        toast.error("Failed to link parents to meeting.");
        return;
      }

      parentUsers.forEach(pu => {
        if (pu.student_id) {
          attendeesToInsert.push({
            meeting_id: meetingData.id,
            student_id: pu.student_id,
            user_id: pu.id, // Link parent user ID
            attendance_status: 'pending',
          });
        }
      });

    } else if (meetingData.meeting_type === 'teachers' && selectedTeacherIds.length > 0) {
      // Fetch teacher user IDs for the selected teachers
      const { data: teacherUsers, error: teacherUserError } = await supabase
        .from('users')
        .select('id, teacher_id')
        .in('teacher_id', selectedTeacherIds)
        .eq('role', 'teacher');

      if (teacherUserError) {
        console.error("Error fetching teacher users:", teacherUserError);
        toast.error("Failed to link teachers to meeting.");
        return;
      }

      teacherUsers.forEach(tu => {
        if (tu.teacher_id) {
          attendeesToInsert.push({
            meeting_id: meetingData.id,
            teacher_id: tu.teacher_id,
            user_id: tu.id, // Link teacher user ID
            attendance_status: 'pending',
          });
        }
      });
    }
    // For 'general' meetings, no specific attendees are added via this form.

    // Insert all new attendees
    if (attendeesToInsert.length > 0) {
      const { error: attendeeInsertError } = await supabase.from('meeting_attendees').insert(attendeesToInsert);
      if (attendeeInsertError) {
        console.error("Error inserting meeting attendees:", attendeeInsertError);
        toast.error("Failed to save meeting attendees.");
      }
    }

    queryClient.invalidateQueries({ queryKey: ["meetings"] });
    setShowMeetingFormDialog(false);
  };

  const handleEditClick = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setShowMeetingFormDialog(true);
  };

  const handleAttendanceClick = (meeting: Meeting) => {
    setSelectedMeetingForAttendance(meeting);
    setShowAttendanceDialog(true);
  };

  const handleConclusionClick = (meeting: Meeting & { meeting_conclusions: MeetingConclusion[] }) => {
    setSelectedMeetingForConclusion(meeting);
    setShowConclusionDialog(true);
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meeting Management</h1>
        <Dialog open={showMeetingFormDialog} onOpenChange={(open) => {
          setShowMeetingFormDialog(open);
          if (!open) setEditingMeeting(null);
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Create Meeting</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" aria-labelledby="meeting-form-title" aria-describedby="meeting-form-description">
            <DialogHeader>
              <DialogTitle id="meeting-form-title">{editingMeeting ? "Edit Meeting" : "Create New Meeting"}</DialogTitle>
              <DialogDescription id="meeting-form-description">
                {editingMeeting ? "Update the details of this meeting." : "Schedule a new meeting for parents, teachers, or both."}
              </DialogDescription>
            </DialogHeader>
            <MeetingForm
              meeting={editingMeeting}
              onSave={handleMeetingSave} // Pass the simplified handler
              onCancel={() => setShowMeetingFormDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No meetings scheduled yet.</p>
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
                    <TableHead>Conclusion</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting: any) => (
                    <TableRow key={meeting.id}>
                      <TableCell className="font-medium">{meeting.title}</TableCell>
                      <TableCell>{format(new Date(meeting.meeting_date), "PPP")}</TableCell>
                      <TableCell>{meeting.meeting_time || format(new Date(meeting.meeting_date), "p")}</TableCell>
                      <TableCell>{meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1)}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getStatusColor(meeting.status)}`}>
                          {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                      {meeting.meeting_conclusions && meeting.meeting_conclusions.length > 0 ? (
                          <Button variant="ghost" size="sm" onClick={() => handleConclusionClick(meeting)}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(meeting)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAttendanceClick(meeting)}>
                          <Users className="h-4 w-4 mr-1" /> Attendance
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleConclusionClick(meeting)}>
                          <FileText className="h-4 w-4 mr-1" /> Conclusion
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteMeetingMutation.mutate(meeting.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Recorder Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-labelledby="attendance-recorder-title" aria-describedby="attendance-recorder-description">
          <DialogHeader>
            <DialogTitle id="attendance-recorder-title">Record Attendance for {selectedMeetingForAttendance?.title}</DialogTitle>
            <DialogDescription id="attendance-recorder-description">
              Mark attendees as present, absent, or excused.
            </DialogDescription>
          </DialogHeader>
          {selectedMeetingForAttendance && (
            <MeetingAttendanceRecorder
              meetingId={selectedMeetingForAttendance.id}
              onClose={() => setShowAttendanceDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Conclusion Form/Viewer Dialog (now includes attendees) */}
      <Dialog open={showConclusionDialog} onOpenChange={setShowConclusionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="conclusion-dialog-title" aria-describedby="conclusion-dialog-description">
          <DialogHeader>
            <DialogTitle id="conclusion-dialog-title">Meeting Details for {selectedMeetingForConclusion?.title}</DialogTitle>
            <DialogDescription id="conclusion-dialog-description">
              {selectedMeetingForConclusion?.meeting_conclusions && selectedMeetingForConclusion.meeting_conclusions.length > 0
                ? "View the summary and notes from this meeting, along with attendee details."
                : "Add the summary and notes for this meeting."}
            </DialogDescription>
          </DialogHeader>
          {selectedMeetingForConclusion && (
            <div className="space-y-6 py-4">
              {selectedMeetingForConclusion.meeting_conclusions && selectedMeetingForConclusion.meeting_conclusions.length > 0 ? (
                <MeetingConclusionViewer conclusion={selectedMeetingForConclusion.meeting_conclusions[0]} />
              ) : (
                <MeetingConclusionForm
                  meetingId={selectedMeetingForConclusion.id}
                  onSave={() => setShowConclusionDialog(false)}
                  onClose={() => setShowConclusionDialog(false)}
                />
              )}
              <MeetingAttendeesViewer meetingId={selectedMeetingForConclusion.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};