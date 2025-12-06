"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface MeetingFormProps {
  meeting?: Tables<'meetings'> & { meeting_attendees?: Tables<'meeting_attendees'>[] };
  onSave: (meetingData: Tables<'meetings'>, selectedStudentIds: string[], selectedTeacherIds: string[]) => void; // Updated prop signature
  onCancel: () => void;
}

export default function MeetingForm({ meeting, onSave, onCancel }: MeetingFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [location, setLocation] = useState("");
  const [meetingType, setMeetingType] = useState("general");
  const [status, setStatus] = useState("scheduled");
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Fetch all students for the current center
  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["all-students-for-meeting-form", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch all active teachers for the current center
  const { data: allTeachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["all-teachers-for-meeting-form", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name, user_id")
        .eq("center_id", user.center_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Filter students based on search input
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.grade?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Filter teachers based on search input
  const filteredTeachers = allTeachers.filter(teacher =>
    teacher.name.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  // Effect to initialize form fields and selections when 'meeting' prop changes
  useEffect(() => {
    console.log("MeetingForm useEffect triggered. Meeting prop:", meeting);
    if (meeting) {
      // Editing existing meeting
      setTitle(meeting.title);
      setDescription(meeting.description || "");
      setMeetingDate(meeting.meeting_date ? format(new Date(meeting.meeting_date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setLocation(meeting.location || "");
      setMeetingType(meeting.meeting_type || "general");
      setStatus(meeting.status || "scheduled");
      
      if (meeting.meeting_attendees) {
        const initialSelectedStudentIds: string[] = [];
        const initialSelectedTeacherIds: string[] = [];

        meeting.meeting_attendees.forEach(att => {
          if (att.student_id) initialSelectedStudentIds.push(att.student_id);
          if (att.teacher_id) initialSelectedTeacherIds.push(att.teacher_id);
        });
        setSelectedStudentIds(initialSelectedStudentIds);
        setSelectedTeacherIds(initialSelectedTeacherIds);
        console.log("Pre-selected Student IDs:", initialSelectedStudentIds);
        console.log("Pre-selected Teacher IDs:", initialSelectedTeacherIds);
      } else {
        // If no attendees are fetched for an existing meeting, ensure selections are cleared
        setSelectedStudentIds([]);
        setSelectedTeacherIds([]);
        console.log("No attendees found for existing meeting, clearing selections.");
      }
    } else {
      // Creating new meeting - reset all form states
      console.log("Creating new meeting, resetting form states.");
      setTitle("");
      setDescription("");
      setMeetingDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setLocation("");
      setMeetingType("general");
      setStatus("scheduled");
      setSelectedStudentIds([]);
      setSelectedTeacherIds([]);
    }
  }, [meeting]); // Dependency on 'meeting' prop

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(allStudents.map(s => s.id));
  };

  const clearStudentSelection = () => {
    setSelectedStudentIds([]);
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const selectAllTeachers = () => {
    setSelectedTeacherIds(allTeachers.map(t => t.id));
  };

  const clearTeacherSelection = () => {
    setSelectedTeacherIds([]);
  };

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || !user?.id) throw new Error("User or Center ID not found");
      const { data, error } = await supabase.from("meetings").insert({
        center_id: user.center_id,
        created_by: user.id,
        title,
        description: description || null,
        meeting_date: new Date(meetingDate).toISOString(),
        location: location || null,
        meeting_type: meetingType,
        status,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting created successfully!");
      onSave(data, selectedStudentIds, selectedTeacherIds); // Pass all relevant IDs
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create meeting");
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!meeting?.id) throw new Error("Meeting ID not found");
      const { data, error } = await supabase.from("meetings").update({
        title,
        description: description || null,
        meeting_date: new Date(meetingDate).toISOString(),
        location: location || null,
        meeting_type: meetingType,
        status,
      }).eq("id", meeting.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting updated successfully!");
      onSave(data, selectedStudentIds, selectedTeacherIds); // Pass all relevant IDs
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update meeting");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meeting) {
      updateMeetingMutation.mutate();
    } else {
      createMeetingMutation.mutate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Meeting details" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="meetingDate">Date & Time *</Label>
          <Input id="meetingDate" type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Meeting location" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Meeting Type</Label>
          <Select value={meetingType} onValueChange={setMeetingType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="parents">Parents</SelectItem>
              <SelectItem value="teachers">Teachers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {meetingType === "parents" && (
        <div className="space-y-3 border p-4 rounded-lg">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Select Parent Attendees (via Students)
          </h3>
          <p className="text-sm text-muted-foreground">
            Only parents of selected students will be linked to this meeting.
          </p>
          <Input
            placeholder="Search students..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="mb-2"
          />
          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllStudents}>Select All Parents</Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearStudentSelection}>Clear Selection</Button>
          </div>
          <ScrollArea className="h-48 border rounded-md p-2">
            {studentsLoading ? (
              <p className="text-muted-foreground">Loading students...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-muted-foreground">No students found.</p>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map(student => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={() => toggleStudentSelection(student.id)}
                    />
                    <Label htmlFor={`student-${student.id}`} className="font-normal cursor-pointer">
                      {student.name} (Grade {student.grade})
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {meetingType === "teachers" && (
        <div className="space-y-3 border p-4 rounded-lg">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Select Teacher Attendees
          </h3>
          <Input
            placeholder="Search teachers..."
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            className="mb-2"
          />
          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllTeachers}>Select All Teachers</Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearTeacherSelection}>Clear Selection</Button>
          </div>
          <ScrollArea className="h-48 border rounded-md p-2">
            {teachersLoading ? (
              <p className="text-muted-foreground">Loading teachers...</p>
            ) : filteredTeachers.length === 0 ? (
              <p className="text-muted-foreground">No teachers found.</p>
            ) : (
              <div className="space-y-2">
                {filteredTeachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeacherIds.includes(teacher.id)}
                      onCheckedChange={() => toggleTeacherSelection(teacher.id)}
                    />
                    <Label htmlFor={`teacher-${teacher.id}`} className="font-normal cursor-pointer">
                      {teacher.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!title || createMeetingMutation.isPending || updateMeetingMutation.isPending}>
          {meeting ? "Update" : "Create"} Meeting
        </Button>
      </div>
    </form>
  );
}