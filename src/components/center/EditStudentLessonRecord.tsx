"use client";
import React, { useEffect, useState } from "react";
import { Star, User } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox" // Added this import
import { toast } from "sonner"
import { Tables } from "@/integrations/supabase/types"
import { format } from "date-fns"

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
    enabled: !!studentChapterId });

  useEffect(() => {
    if (studentChapter) {
      setTeacherNotes(studentChapter.teacher_notes || "");
      setEvaluationRating(studentChapter.evaluation_rating || null);
      setIsCompleted(studentChapter.completed || false);
    }
  }, [studentChapter]);

  const updateStudentChapterMutation = useMutation({
    mutationFn: async () => {
      // Allow both 'center' and 'teacher' roles to update.
      // If a teacher is logged in, use their ID. Otherwise, leave recorded_by_teacher_id as null.
      const recordedById = user?.role === 'teacher' ? user.teacher_id : null;

      const { error } = await supabase
        .from("student_chapters")
        .update({
          teacher_notes: teacherNotes || null,
          evaluation_rating: evaluationRating,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          recorded_by_teacher_id: recordedById, // Record which teacher/center user made the update
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
    } });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentChapterMutation.mutate();
  };

  if (studentChapterLoading) {
    return <p>Loading record details...</p>;
  }

  const recordedByTeacherName = (studentChapter as any)?.recorded_by_teacher?.name;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="teacherNotes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Faculty Observations</Label>
        <Textarea
          id="teacherNotes"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          rows={4}
          placeholder="Add specific observations, strengths, or areas for improvement..."
          className="rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="space-y-2">
          <Label htmlFor="evaluationRating" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Evaluation Rating</Label>
          <Select
            value={evaluationRating?.toString() || ""}
            onValueChange={(value) => setEvaluationRating(parseInt(value))}
          >
            <SelectTrigger className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-none rounded-2xl shadow-strong">
              <SelectItem value="1" className="font-black text-[10px] uppercase tracking-widest">1 Star (Critical)</SelectItem>
              <SelectItem value="2" className="font-black text-[10px] uppercase tracking-widest">2 Stars (Improving)</SelectItem>
              <SelectItem value="3" className="font-black text-[10px] uppercase tracking-widest">3 Stars (Target)</SelectItem>
              <SelectItem value="4" className="font-black text-[10px] uppercase tracking-widest">4 Stars (Superior)</SelectItem>
              <SelectItem value="5" className="font-black text-[10px] uppercase tracking-widest">5 Stars (Mastery)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6">
          <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 shadow-inner">
            <Checkbox
              id="isCompleted"
              checked={isCompleted}
              onCheckedChange={(checked) => setIsCompleted(Boolean(checked))}
              className="h-5 w-5 rounded-lg border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="isCompleted" className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">
              VERIFY COMPLETION
            </Label>
          </div>
        </div>
      </div>

      {recordedByTeacherName && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary w-fit">
          <User className="h-3 w-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">Auditor: {recordedByTeacherName}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
          disabled={updateStudentChapterMutation.isPending}
        >
          DISMISS
        </Button>
        <Button
          type="submit"
          className="rounded-xl font-black px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-xl tracking-widest h-11"
          disabled={updateStudentChapterMutation.isPending}
        >
          {updateStudentChapterMutation.isPending ? "COMMITING..." : "COMMIT EVALUATION"}
        </Button>
      </div>
    </form>
  );
}