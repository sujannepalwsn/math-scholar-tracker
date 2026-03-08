import React, { useState } from "react";
import { CalendarDays, CheckCircle2, Edit, Eye, FileText, Loader2, Plus, Trash2, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Tables, TablesInsert } from "@/integrations/supabase/types"
import MeetingForm from "@/components/meetings/MeetingForm";
import MeetingAttendanceRecorder from "@/components/meetings/MeetingAttendanceRecorder";
import MeetingConclusionForm from "@/components/meetings/MeetingConclusionForm";
import MeetingConclusionViewer from "@/components/meetings/MeetingConclusionViewer";
import MeetingAttendeesViewer from "@/components/meetings/MeetingAttendeesViewer";
"use client";


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
        .select("*, meeting_conclusions(conclusion_notes, recorded_at), meeting_attendees(student_id, user_id, teacher_id), related_meeting:related_meeting_id(id, title, meeting_date)")
        .eq("center_id", user.center_id)
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

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
    } });

  const handleMeetingSave = async (meetingData: Tables<'meetings'>, selectedStudentIds: string[], selectedTeacherIds: string[]) => {
    // This function is called by MeetingForm after meeting is created/updated
    // meetingData is the newly created or updated meeting object from the DB.

    // First, clear all existing attendees for this meeting to ensure a clean slate
    // This simplifies logic by not having to figure out which ones to remove vs update
    await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingData.id);

    const attendeesToInsert: TablesInsert<'meeting_attendees'>[] = [];

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
            attendance_status: 'pending' });
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
            attendance_status: 'pending' });
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
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Meeting Center
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Organize and track consultations with parents and staff.</p>
          </div>
        </div>
        <Dialog open={showMeetingFormDialog} onOpenChange={(open) => {
          setShowMeetingFormDialog(open);
          if (!open) setEditingMeeting(null);
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all duration-300">
              <Plus className="h-5 w-5 mr-2" />
              CREATE SESSION
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="meeting-form-title" aria-describedby="meeting-form-description">
            <DialogHeader>
              <DialogTitle id="meeting-form-title" className="text-2xl font-black tracking-tight">{editingMeeting ? "Update Consultation" : "Schedule New Assembly"}</DialogTitle>
              <DialogDescription id="meeting-form-description" className="font-medium">
                {editingMeeting ? "Modify session parameters and attendees." : "Initialize a new communication protocol with stakeholders."}
              </DialogDescription>
            </DialogHeader>
            <MeetingForm
              meeting={editingMeeting}
              onSave={handleMeetingSave}
              onCancel={() => setShowMeetingFormDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            Scheduled Assemblies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : meetings.length === 0 ? (
            <p className="text-muted-foreground text-center py-12 italic">No meetings scheduled yet.</p>
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
                     <TableHead>Follow-up</TableHead>
                     <TableHead>Conclusion</TableHead>
                     <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((meeting: any) => (
                    <TableRow key={meeting.id} className="group transition-all duration-300">
                      <TableCell className="font-black text-slate-700 group-hover:text-primary transition-colors">{meeting.title}</TableCell>
                      <TableCell className="font-medium text-slate-600">{format(new Date(meeting.meeting_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-bold text-primary">{meeting.meeting_time || format(new Date(meeting.meeting_date), "p")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">
                          {meeting.meeting_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 font-black uppercase text-[10px] tracking-tight", getStatusColor(meeting.status))}>
                          <div className={cn("h-1.5 w-1.5 rounded-full", meeting.status === 'completed' ? 'bg-green-600 animate-pulse' : meeting.status === 'cancelled' ? 'bg-red-600' : 'bg-blue-600')} />
                          {meeting.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {meeting.related_meeting ? (
                          <Badge variant="outline" className="text-[10px] font-medium border-blue-100 text-blue-600 bg-blue-50/50">
                            ↩ {meeting.related_meeting.title}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground opacity-30">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                      {meeting.meeting_conclusions && meeting.meeting_conclusions.length > 0 ? (
                          <Button variant="ghost" size="sm" onClick={() => handleConclusionClick(meeting)} className="rounded-xl text-primary font-bold hover:bg-primary/5">
                            <Eye className="h-4 w-4 mr-1.5" /> SUMMARY
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-red-400 opacity-50">
                            <XCircle className="h-4 w-4" />
                            <span className="text-[9px] font-black uppercase">PENDING</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft group-hover:scale-105 transition-all" onClick={() => handleEditClick(meeting)}>
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-2 font-bold px-3" onClick={() => handleAttendanceClick(meeting)}>
                          <Users className="h-4 w-4 mr-1.5" />
                          ROLL CALL
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-2 font-bold px-3" onClick={() => handleConclusionClick(meeting)}>
                          <FileText className="h-4 w-4 mr-1.5" />
                          MINUTES
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft hover:bg-destructive/10" onClick={() => deleteMeetingMutation.mutate(meeting.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
