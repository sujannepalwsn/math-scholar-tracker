"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Star, User } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

interface EditStudentLessonRecordProps {
  studentChapterId: string;
  onSave: () => void;
  onCancel: () => void;
}

type StudentChapter = Tables<'student_chapters'>;
type Teacher = Tables<'teachers'>;

export default function EditStudentLessonRecord({ studentChapterId, onSave, onCancel }: EditStudentLessonRecordProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [teacherNotes, setTeacherNotes] = useState("");
  const [evaluationRating, setEvaluationRating] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch the specific student_chapter record
  const { data: studentChapter, isLoading: studentChapterLoading } = useQuery({
    queryKey: ["student-chapter-detail", studentChapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_chapters")
        .select(`
          *,
          recorded_by_teacher:recorded_by_teacher_id(name)
        `)
        .eq("id", studentChapterId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!studentChapterId,
  });

  useEffect(() => {
    if (studentChapter) {
      setTeacherNotes(studentChapter.teacher_notes || "");
      setEvaluationRating(studentChapter.evaluation_rating || null);
      setIsCompleted(studentChapter.completed || false);
    }
  }, [studentChapter]);

  const updateStudentChapterMutation = useMutation({
    mutationFn: async () => {
      if (!user?.teacher_id) throw new Error("Teacher ID not found. Only teachers can update lesson records.");

      const { error } = await supabase
        .from("student_chapters")
        .update({
          teacher_notes: teacherNotes || null,
          evaluation_rating: evaluationRating,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          recorded_by_teacher_id: user.teacher_id, // Record which teacher made the update
        })
        .eq("id", studentChapterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lesson-records"] }); // Invalidate main list
      queryClient.invalidateQueries({ queryKey: ["student-chapter-detail", studentChapterId] }); // Invalidate detail
      toast.success("Student lesson record updated successfully!");
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lesson record");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentChapterMutation.mutate();
  };

  if (studentChapterLoading) {
    return <p>Loading record details...</p>;
  }

  const recordedByTeacherName = (studentChapter as any)?.recorded_by_teacher?.name;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="teacherNotes">Teacher Notes</Label>
        <Textarea
          id="teacherNotes"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          rows={5}
          placeholder="Add specific observations, strengths, or areas for improvement for this student regarding this lesson."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="evaluationRating">Evaluation Rating (1-5)</Label>
        <Select
          value={evaluationRating?.toString() || ""}
          onValueChange={(value) => setEvaluationRating(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Star (Needs significant improvement)</SelectItem>
            <SelectItem value="2">2 Stars (Needs improvement)</SelectItem>
            <SelectItem value="3">3 Stars (Satisfactory)</SelectItem>
            <SelectItem value="4">4 Stars (Good)</SelectItem>
            <SelectItem value="5">5 Stars (Excellent)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isCompleted"
          checked={isCompleted}
          onCheckedChange={(checked) => setIsCompleted(Boolean(checked))}
        />
        <Label htmlFor="isCompleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Mark as Completed
        </Label>
      </div>

      {recordedByTeacherName && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <User className="h-4 w-4" /> Last updated by: {recordedByTeacherName}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={updateStudentChapterMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateStudentChapterMutation.isPending}>
          {updateStudentChapterMutation.isPending ? "Saving..." : "Save Evaluation"}
        </Button>
      </div>
    </form>
  );
}