"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface MeetingAttendeesViewerProps {
  meetingId: string;
}

export default function MeetingAttendeesViewer({ meetingId }: MeetingAttendeesViewerProps) {
  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["meeting-attendees-viewer", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendees")
        .select(`
          attendance_status,
          students(name, grade)
        `)
        .eq("meeting_id", meetingId);
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  // Updated to include 'invite' and 'pending'
  const getStatusColorClass = (status: string | null) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-800";
      case "absent": return "bg-red-100 text-red-800";
      case "excused": return "bg-yellow-100 text-yellow-800";
      case "invite": return "bg-blue-100 text-blue-800"; // New color for invite
      case "pending": return "bg-gray-100 text-gray-800"; // Color for pending
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <p>Loading attendees...</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" /> Attendees
      </h3>
      {attendees.length === 0 ? (
        <p className="text-muted-foreground">No attendance records found for this meeting.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee: any) => (
                <TableRow key={attendee.students?.name}>
                  <TableCell className="font-medium">{attendee.students?.name || 'N/A'}</TableCell>
                  <TableCell>{attendee.students?.grade || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColorClass(attendee.attendance_status)}>
                      {attendee.attendance_status ? attendee.attendance_status.charAt(0).toUpperCase() + attendee.attendance_status.slice(1) : 'Pending'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}