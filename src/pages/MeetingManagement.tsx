import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { CalendarDays, CheckCircle2, Edit, Eye, FileText, Loader2, Plus, Trash2, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { hasActionPermission } from "@/utils/permissions";
import { logger } from "@/utils/logger";
"use client";

type Meeting = Tables<'meetings'>;
type MeetingConclusion = Tables<'meeting_conclusions'>;

export default function MeetingManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = hasActionPermission(user, 'meetings_management', 'edit');

  const [showMeetingFormDialog, setShowMeetingFormDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<Meeting | null>(null);
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);
  const [selectedMeetingForConclusion, setSelectedMeetingForConclusion] = useState<Meeting & { meeting_conclusions: MeetingConclusion[] } | null>(null);

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  // Fetch meetings for the current center
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", user?.center_id, isRestricted, user?.id],
    queryFn: async () => {
      if (!user?.center_id) return [];

      if (isRestricted) {
        // Teachers in restricted mode see meetings they created OR meetings where they are an attendee
        const { data: attendedMeetings } = await supabase
          .from("meeting_attendees")
          .select("meeting_id")
          .or(`user_id.eq."${user.id}",teacher_id.eq."${user.teacher_id}"`)
          .eq("center_id", user.center_id);

        const meetingIds = attendedMeetings?.map(m => m.meeting_id) || [];
        let query = supabase
          .from("meetings")
          .select("id, title, meeting_date, center_id, meeting_conclusions(conclusion_notes, recorded_at), meeting_attendees(student_id, user_id, teacher_id), related_meeting:meetings!related_meeting_id(id, title, meeting_date)")
          .eq("center_id", user.center_id);

        if (meetingIds.length > 0) {
          query = query.or(`created_by.eq."${user.id}",id.in.("${meetingIds.join('","')}")`);
        } else {
          query = query.eq("created_by", user.id);
        }

        const { data, error } = await query.order("meeting_date", { ascending: false });
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, center_id, meeting_conclusions(conclusion_notes, recorded_at), meeting_attendees(student_id, user_id, teacher_id), related_meeting:meetings!related_meeting_id(id, title, meeting_date)")
        .eq("center_id", user.center_id)
        .order("meeting_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const handleMeetingSave = async (meetingData: Tables<'meetings'>, selectedStudentIds: string[], selectedTeacherIds: string[]) => {
    if (!canEdit) { toast.error("Access Denied: You do not have permission to save meetings."); return; }

    // Cleanup existing attendees
    await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingData.id);

    const attendeesToInsert: TablesInsert<'meeting_attendees'>[] = [];

    if (meetingData.meeting_type !== 'teachers' && selectedStudentIds.length > 0) {
      const { data: parentUsers } = await supabase.from('users').select('id, student_id').in('student_id', selectedStudentIds).eq('role', 'parent');
      parentUsers?.forEach(pu => {
        if (pu.student_id) attendeesToInsert.push({ meeting_id: meetingData.id, student_id: pu.student_id, user_id: pu.id, attendance_status: 'pending', center_id: user?.center_id });
      });
    }

    if (meetingData.meeting_type !== 'parents' && selectedTeacherIds.length > 0) {
      const { data: teacherUsers } = await supabase.from('users').select('id, teacher_id').in('teacher_id', selectedTeacherIds).eq('role', 'teacher');
      teacherUsers?.forEach(tu => {
        if (tu.teacher_id) attendeesToInsert.push({ meeting_id: meetingData.id, teacher_id: tu.teacher_id, user_id: tu.id, attendance_status: 'pending', center_id: user?.center_id });
      });
    }

    if (attendeesToInsert.length > 0) {
      const { error: attendeeInsertError } = await supabase.from('meeting_attendees').insert(attendeesToInsert);
      if (attendeeInsertError) logger.error("Error inserting meeting attendees:", attendeeInsertError);

      const notifications = attendeesToInsert.map(att => ({
        user_id: att.user_id,
        center_id: user?.center_id,
        title: `New Meeting: ${meetingData.title}`,
        message: `Meeting scheduled for ${format(new Date(meetingData.meeting_date), "PPP p")}`,
        type: 'info',
        link: att.teacher_id ? '/teacher-meetings' : '/parent-meetings'
      }));
      await supabase.from('notifications').insert(notifications);
    }

    queryClient.invalidateQueries({ queryKey: ["meetings"] });
    setShowMeetingFormDialog(false);
  };

  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) throw new Error("Access Denied");
      await supabase.from("meeting_attendees").delete().eq("meeting_id", id);
      await supabase.from("meeting_conclusions").delete().eq("meeting_id", id);
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["meetings"] }); toast.success("Meeting deleted"); },
    onError: (error: any) => toast.error(error.message) });

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20"><CalendarDays className="h-8 w-8 text-primary animate-pulse" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">Assembly Hub</h1>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Stakeholder Consultation Nexus</p>
            </div>
          </div>
        </div>
        {canEdit && (
          <Dialog open={showMeetingFormDialog} onOpenChange={(open) => { setShowMeetingFormDialog(open); if (!open) setEditingMeeting(null); }}>
            <DialogTrigger asChild><Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all"><Plus className="h-5 w-5 mr-2" /> CREATE SESSION</Button></DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-2xl font-black">{editingMeeting ? "Update Consultation" : "Schedule New Assembly"}</DialogTitle></DialogHeader>
              <MeetingForm meeting={editingMeeting} onSave={handleMeetingSave} onCancel={() => setShowMeetingFormDialog(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/20">
        <CardHeader className="border-b border-border/10 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10"><CalendarDays className="h-6 w-6 text-primary" /></div> Scheduled Assemblies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : meetings.length === 0 ? <p className="text-muted-foreground text-center py-12 italic">No meetings scheduled yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Conclusion</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {meetings.map((meeting: any) => (
                    <TableRow key={meeting.id} className="group transition-all duration-300">
                      <TableCell className="font-black text-slate-700 group-hover:text-primary transition-colors">{meeting.title}</TableCell>
                      <TableCell className="font-medium text-slate-600">{format(new Date(meeting.meeting_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-bold text-primary">{meeting.meeting_time || format(new Date(meeting.meeting_date), "p")}</TableCell>
                      <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none font-bold uppercase text-[9px] px-2 py-0.5">{meeting.meeting_type}</Badge></TableCell>
                      <TableCell><span className={cn("inline-flex items-center gap-1.5 font-black uppercase text-[10px] tracking-tight", meeting.status === 'completed' ? 'text-green-600' : 'text-blue-600')}>{meeting.status}</span></TableCell>
                      <TableCell>{meeting.meeting_conclusions?.length > 0 ? <Button variant="ghost" size="sm" onClick={() => { setSelectedMeetingForConclusion(meeting); setShowConclusionDialog(true); }} className="rounded-xl text-primary font-bold hover:bg-primary/5"><Eye className="h-4 w-4 mr-1.5" /> SUMMARY</Button> : <span className="text-[9px] font-black text-red-400 opacity-50 uppercase">PENDING</span>}</TableCell>
                      <TableCell className="flex gap-2">
                        {canEdit && (
                          <><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft" onClick={() => { setEditingMeeting(meeting); setShowMeetingFormDialog(true); }}><Edit className="h-4 w-4 text-primary" /></Button>
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-2 font-bold px-3" onClick={() => { setSelectedMeetingForAttendance(meeting); setShowAttendanceDialog(true); }}><Users className="h-4 w-4 mr-1.5" /> ROLL CALL</Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft hover:bg-destructive/10" onClick={() => deleteMeetingMutation.mutate(meeting.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Attendance for {selectedMeetingForAttendance?.title}</DialogTitle></DialogHeader>
          {selectedMeetingForAttendance && <MeetingAttendanceRecorder meetingId={selectedMeetingForAttendance.id} onClose={() => setShowAttendanceDialog(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showConclusionDialog} onOpenChange={setShowConclusionDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Meeting Details for {selectedMeetingForConclusion?.title}</DialogTitle></DialogHeader>
          {selectedMeetingForConclusion && (
            <div className="space-y-6 py-4">
              {selectedMeetingForConclusion.meeting_conclusions?.length > 0 ? <MeetingConclusionViewer conclusion={selectedMeetingForConclusion.meeting_conclusions[0]} /> : <MeetingConclusionForm meetingId={selectedMeetingForConclusion.id} onSave={() => setShowConclusionDialog(false)} onClose={() => setShowConclusionDialog(false)} />}
              <MeetingAttendeesViewer meetingId={selectedMeetingForConclusion.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
