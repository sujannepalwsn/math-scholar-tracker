"use client";
import { Users } from "lucide-react";

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface MeetingAttendeesViewerProps {
  meetingId: string;
}

export default function MeetingAttendeesViewer({ meetingId }: MeetingAttendeesViewerProps) {
  const { user } = useAuth();
  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["meeting-attendees-viewer", meetingId, user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendees")
        .select(`
          attendance_status,
          students(name, grade),
          teachers(name),
          users(username)
        `)
        .eq("meeting_id", meetingId)
        .eq("center_id", user?.center_id!);
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId && !!user?.center_id });

  const getStatusColorClass = (status: string | null) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-800";
      case "absent": return "bg-red-100 text-red-800";
      case "excused": return "bg-yellow-100 text-yellow-800";
      case "invite": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAttendeeName = (attendee: any) => {
    if (attendee.students?.name) return attendee.students.name;
    if (attendee.teachers?.name) return attendee.teachers.name;
    if (attendee.users?.username) return attendee.users.username;
    return 'N/A';
  };

  const getAttendeeType = (attendee: any) => {
    if (attendee.students?.name) return 'Student/Parent';
    if (attendee.teachers?.name) return 'Teacher';
    return 'User';
  };

  if (isLoading) return <p>Loading attendees...</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" /> Attendees ({attendees.length})
      </h3>
      {attendees.length === 0 ? (
        <p className="text-muted-foreground">No attendance records found.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{getAttendeeName(attendee)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getAttendeeType(attendee)}</TableCell>
                  <TableCell>{attendee.students?.grade || '—'}</TableCell>
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
