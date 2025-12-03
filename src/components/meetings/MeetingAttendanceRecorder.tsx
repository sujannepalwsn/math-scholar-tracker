"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Filter } from "lucide-react"; // Added Filter icon
import { Tables } from "@/integrations/supabase/types";

interface MeetingAttendanceRecorderProps {
  meetingId: string;
  onClose: () => void;
}

type AttendanceStatus = "pending" | "present" | "absent" | "excused" | "invite"; // Added "invite"
type Student = Tables<'students'>;
type Teacher = Tables<'teachers'>; // Added Teacher type for clarity
type MeetingAttendee = Tables<'meeting_attendees'>;

export default function MeetingAttendanceRecorder({ meetingId, onClose }: MeetingAttendanceRecorderProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [attendeeStatuses, setAttendeeStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [gradeFilter, setGradeFilter] = useState("all"); // New state for grade filter

  // Fetch meeting details to determine its type
  const { data: meetingDetails, isLoading: meetingDetailsLoading } = useQuery({
    queryKey: ["meeting-details-for-attendance", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("meeting_type")
        .eq("id", meetingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  // Fetch all students to get unique grades for the filter
  const { data: allStudents = [] } = useQuery({
    queryKey: ["all-students-for-grade-filter", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("grade")
        .eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });
  const uniqueGrades = Array.from(new Set(allStudents.map(s => s.grade))).sort();

  // Fetch existing attendees for this meeting
  const { data: existingAttendees = [], isLoading: existingAttendeesLoading } = useQuery({
    queryKey: ["meeting-attendees", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendees")
        .select("*, students(id, name, grade), users(id, username, role), teachers(id, name)") // Fetch teacher details
        .eq("meeting_id", meetingId);
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  // Determine the list of participants to display
  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ["meeting-participants", meetingId, meetingDetails?.meeting_type, user?.center_id, gradeFilter], // Added gradeFilter
    queryFn: async () => {
      if (!user?.center_id || !meetingDetails) return [];

      let fetchedParticipants: (Student | Teacher | Tables<'users'>)[] = [];

      if (meetingDetails.meeting_type === "parents" || meetingDetails.meeting_type === "general") {
        let query = supabase
          .from("students")
          .select("id, name, grade")
          .eq("center_id", user.center_id)
          .order("name");
        
        if (gradeFilter !== "all") {
          query = query.eq("grade", gradeFilter);
        }
        const { data, error } = await query;
        if (error) throw error;
        fetchedParticipants = data || [];
      } else if (meetingDetails.meeting_type === "teachers") {
        const { data, error } = await supabase
          .from("teachers")
          .select("id, name, user_id")
          .eq("center_id", user.center_id)
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        fetchedParticipants = data || [];
      }
      return fetchedParticipants;
    },
    enabled: !!user?.center_id && !!meetingDetails,
  });

  useEffect(() => {
    const initialStatuses: Record<string, AttendanceStatus> = {};
    
    // Initialize with existing attendance
    existingAttendees.forEach((attendee: MeetingAttendee & { students?: Student, users?: Tables<'users'>, teachers?: Teacher }) => {
      let participantId: string | undefined;
      if (attendee.student_id) participantId = attendee.student_id;
      else if (attendee.teacher_id) participantId = attendee.teacher_id;
      else if (attendee.user_id) participantId = attendee.user_id; // Fallback for general user attendees

      if (participantId) {
        initialStatuses[participantId] = (attendee.attendance_status as AttendanceStatus) || "pending";
      }
    });

    // Add any new participants not yet in existingAttendees with "pending" status
    participants.forEach(participant => {
      const participantId = participant.id;
      if (!(participantId in initialStatuses)) {
        initialStatuses[participantId] = "pending";
      }
    });
    setAttendeeStatuses(initialStatuses);
  }, [existingAttendees, participants]);

  const updateAttendanceMutation = useMutation({
    mutationFn: async () => {
      const updates: any[] = [];
      
      for (const participant of participants) {
        const participantId = participant.id;
        const attendance_status = attendeeStatuses[participantId] ?? "pending";
        const attended = attendance_status === "present"; // Only 'present' counts as attended
        
        const existingRecord = existingAttendees.find((ea: any) => 
          (ea.student_id === participantId && (meetingDetails?.meeting_type === 'parents' || meetingDetails?.meeting_type === 'general')) ||
          (ea.teacher_id === participantId && meetingDetails?.meeting_type === 'teachers')
        );

        const baseRecord: Tables<'meeting_attendees'>['Insert'] = {
          meeting_id: meetingId,
          attended,
          attendance_status,
          notes: null, // Add notes if needed in the future
        };

        if (meetingDetails?.meeting_type === 'parents' || meetingDetails?.meeting_type === 'general') {
          Object.assign(baseRecord, { student_id: participantId, user_id: existingRecord?.user_id || null, teacher_id: null });
        } else if (meetingDetails?.meeting_type === 'teachers') {
          // For teachers, participant.id is the teacher_id, we need to find the corresponding user_id
          const teacherUser = allTeachers.find(t => t.id === participantId);
          Object.assign(baseRecord, { teacher_id: participantId, user_id: teacherUser?.user_id || null, student_id: null });
        }

        if (existingRecord) {
          updates.push({ 
            id: existingRecord.id, 
            ...baseRecord 
          });
        } else {
          updates.push(baseRecord);
        }
      }

      const { error } = await supabase.from("meeting_attendees").upsert(updates, { onConflict: 'meeting_id, student_id, teacher_id, user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-attendees", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Attendance updated successfully!");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update attendance");
    },
  });

  const handleStatusChange = (id: string, status: AttendanceStatus) => {
    setAttendeeStatuses(prev => ({ ...prev, [id]: status }));
  };

  const markAll = (status: AttendanceStatus) => {
    const newStatuses: Record<string, AttendanceStatus> = {};
    participants.forEach(p => newStatuses[p.id] = status);
    setAttendeeStatuses(newStatuses);
  };

  if (meetingDetailsLoading || existingAttendeesLoading || participantsLoading) {
    return <p>Loading attendees...</p>;
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => markAll("present")}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Mark All Present
        </Button>
        <Button variant="outline" size="sm" onClick={() => markAll("absent")}>
          <XCircle className="h-4 w-4 mr-1" /> Mark All Absent
        </Button>
      </div>

      {(meetingDetails?.meeting_type === 'parents' || meetingDetails?.meeting_type === 'general') && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="overflow-x-auto max-h-96 border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {(meetingDetails?.meeting_type === 'parents' || meetingDetails?.meeting_type === 'general') ? <TableHead>Grade</TableHead> : null}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(meetingDetails?.meeting_type === 'parents' || meetingDetails?.meeting_type === 'general') ? 3 : 2} className="text-center text-muted-foreground">No participants found</TableCell>
              </TableRow>
            ) : (
              participants.map((participant: any) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">{participant.name}</TableCell>
                  {(meetingDetails?.meeting_type === 'parents' || meetingDetails?.meeting_type === 'general') ? <TableCell>{participant.grade}</TableCell> : null}
                  <TableCell>
                    <Select
                      value={attendeeStatuses[participant.id] || "pending"}
                      onValueChange={(value) => handleStatusChange(participant.id, value as AttendanceStatus)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invite">Invite</SelectItem> {/* New "Invite" option */}
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="excused">Excused</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={updateAttendanceMutation.isPending}>Cancel</Button>
        <Button onClick={() => updateAttendanceMutation.mutate()} disabled={updateAttendanceMutation.isPending}>
          {updateAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
        </Button>
      </div>
    </div>
  );
}