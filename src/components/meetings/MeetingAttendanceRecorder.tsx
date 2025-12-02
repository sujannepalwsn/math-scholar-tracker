"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

interface MeetingAttendanceRecorderProps {
  meetingId: string;
  onClose: () => void;
}

export default function MeetingAttendanceRecorder({ meetingId, onClose }: MeetingAttendanceRecorderProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [attendeeStatuses, setAttendeeStatuses] = useState<Record<string, boolean>>({});

  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["all-students-for-attendance", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("id, name").eq("center_id", user.center_id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: existingAttendees = [], isLoading: existingAttendeesLoading } = useQuery({
    queryKey: ["meeting-attendees", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendees")
        .select("*")
        .eq("meeting_id", meetingId);
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  useEffect(() => {
    const initialStatuses: Record<string, boolean> = {};
    existingAttendees.forEach((attendee: any) => {
      if (attendee.student_id) {
        initialStatuses[attendee.student_id] = attendee.attended;
      }
    });
    allStudents.forEach(student => {
      if (!(student.id in initialStatuses)) {
        initialStatuses[student.id] = false;
      }
    });
    setAttendeeStatuses(initialStatuses);
  }, [existingAttendees, allStudents]);

  const updateAttendanceMutation = useMutation({
    mutationFn: async () => {
      const updates: any[] = [];
      
      allStudents.forEach(student => {
        const attended = attendeeStatuses[student.id] ?? false;
        const existingRecord = existingAttendees.find((ea: any) => ea.student_id === student.id);

        if (existingRecord) {
          updates.push({ id: existingRecord.id, meeting_id: meetingId, student_id: student.id, attended });
        } else {
          updates.push({ meeting_id: meetingId, student_id: student.id, attended });
        }
      });

      const { error } = await supabase.from("meeting_attendees").upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-attendees", meetingId] });
      toast.success("Attendance updated successfully!");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update attendance");
    },
  });

  const handleStatusChange = (id: string, attended: boolean) => {
    setAttendeeStatuses(prev => ({ ...prev, [id]: attended }));
  };

  const markAll = (attended: boolean) => {
    const newStatuses: Record<string, boolean> = {};
    allStudents.forEach(s => newStatuses[s.id] = attended);
    setAttendeeStatuses(newStatuses);
  };

  if (studentsLoading || existingAttendeesLoading) {
    return <p>Loading attendees...</p>;
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => markAll(true)}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Mark All Present
        </Button>
        <Button variant="outline" size="sm" onClick={() => markAll(false)}>
          <XCircle className="h-4 w-4 mr-1" /> Mark All Absent
        </Button>
      </div>

      <div className="overflow-x-auto max-h-96 border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">No students found</TableCell>
              </TableRow>
            ) : (
              allStudents.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <Select
                      value={attendeeStatuses[student.id] ? 'present' : 'absent'}
                      onValueChange={(value) => handleStatusChange(student.id, value === 'present')}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
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