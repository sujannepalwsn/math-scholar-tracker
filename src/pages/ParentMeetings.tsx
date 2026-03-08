"use client";
import React, { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Eye, FileText, Info, MapPin, Users, Video, XCircle } from "lucide-react";

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Meeting = Tables<'meetings'>;
type MeetingAttendee = Tables<'meeting_attendees'>;
type MeetingConclusion = Tables<'meeting_conclusions'>;

export default function ParentMeetings() {
  const { user } = useAuth();
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);
  const [selectedMeetingConclusion, setSelectedMeetingConclusion] = useState<MeetingConclusion | null>(null);

  if (!user?.student_id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please log in as a parent to view meeting schedules.</p>
      </div>
    );
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
            id, title, agenda, meeting_date, meeting_type, status, location,
            meeting_conclusions(conclusion_notes, recorded_at)
          )
        `)
        .eq("student_id", user.student_id!);

      if (error) throw error;
      return data?.filter((d: any) => d.meetings) || [];
    },
    enabled: !!user.student_id });

  const getStatusStyles = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/5 text-primary/70 border-primary/10';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getAttendanceStyles = (status: MeetingAttendee['attendance_status']) => {
    switch (status) {
      case 'present': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'absent': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'excused': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'invite': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleViewConclusion = (conclusion: MeetingConclusion) => {
    setSelectedMeetingConclusion(conclusion);
    setShowConclusionDialog(true);
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
            <p className="text-muted-foreground text-sm font-medium">Institutional coordination and parent-teacher consultations.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            Personalized Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-muted-foreground font-bold italic">No institutional consultations scheduled for your profile.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/5">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Title/Objective</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Schedule Protocol</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Medium/Location</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Status</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Participation</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Conclusion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((attendee: any) => {
                    const meeting = attendee.meetings;
                    const conclusion = meeting.meeting_conclusions?.[0];
                    return (
                      <TableRow key={attendee.id} className="group transition-all duration-300 hover:bg-card/60">
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-black text-slate-700 text-xs leading-none">{meeting.title}</p>
                            <p className="text-[10px] font-black uppercase tracking-tighter text-primary/60">{meeting.meeting_type}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs">
                              <CalendarDays className="h-3 w-3 text-slate-400" />
                              {format(new Date(meeting.meeting_date), "MMM dd, yyyy")}
                            </div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-400 text-[10px]">
                              <Clock className="h-3 w-3" />
                              {format(new Date(meeting.meeting_date), "p")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             {meeting.location?.toLowerCase().includes('zoom') || meeting.location?.toLowerCase().includes('google') ? (
                               <Video className="h-3.5 w-3.5 text-primary" />
                             ) : (
                               <MapPin className="h-3.5 w-3.5 text-slate-400" />
                             )}
                             <span className="font-black text-[10px] uppercase tracking-tighter text-slate-500 max-w-[120px] truncate">{meeting.location || 'Protocol Specified'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter", getStatusStyles(meeting.status))}>
                            {meeting.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter", getAttendanceStyles(attendee.attendance_status))}>
                            {attendee.attendance_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          {conclusion ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleViewConclusion(conclusion)}>
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          ) : (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting Log</span>
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
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground/90">Meeting Conclusion</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary">Official Institutional Summary</DialogDescription>
          </DialogHeader>
          {selectedMeetingConclusion && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-white shadow-soft flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Recorded At</p>
                   <p className="text-sm font-black text-slate-700">{format(new Date(selectedMeetingConclusion.recorded_at!), "PPP 'at' HH:mm")}</p>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-primary/5/50 border border-primary/10/50">
                 <p className="text-[10px] font-black uppercase tracking-[0.1em] text-primary/80 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Synthesis & Notes
                 </p>
                 <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed italic">
                    "{selectedMeetingConclusion.conclusion_notes}"
                 </p>
              </div>

              <Button className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]" onClick={() => setShowConclusionDialog(false)}>
                 Acknowledged
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
